# Restore Test and PITR Runbook (PostgreSQL)

A backup is proven only by a completed restore. Run this monthly per cluster, after every major change to the backup setup, and before any risky operation on data (upgrade, mass delete, migration with a rewrite). The same steps, with a real target time, recover from an incident. Tools: pgBackRest ([pgbackrest-commands.md](pgbackrest-commands.md)) or the CloudNativePG recovery Cluster (section C). Storage and DR drill cadence: `devops-storage-backup`, `devops-sre-ops`.

**Rules**: restore to a NEW host, path or namespace, never over the live instance; the restored copy must not ship WAL into the production archive and must not connect to production replication; no real credentials in the log; every step has its result captured.

## 0. Record (fill in)

| Field | Value |
|-------|-------|
| Date, operator | |
| Source cluster / stanza | |
| Backup label restored (`info`) | |
| Recovery target (time / name / immediate) | |
| Target host / namespace | |
| RTO budget / measured | |
| RPO budget / measured (last row visible vs expected) | |

## A. pgBackRest, bare metal or VM

1. **Pick the target** (read-only on production): `pgbackrest --stanza=main info` - note the backup label, the WAL range (`wal start/stop`) and that the target time lies inside it. For a recovery of an incident, take a target just BEFORE the damage (check application logs and `log_min_duration_statement` output for the time).
2. **Prepare an isolated restore host** with the same major PostgreSQL binaries and extensions, a repository read-only credential (or read access to a copy), and a `pgbackrest.conf` with the same stanza; the restore below uses `--archive-mode=off` so the restored instance never pushes WAL.
3. **Restore** (PostgreSQL stopped, data directory empty):
   ```bash
   date -u +%FT%TZ > restore.start
   pgbackrest --stanza=main --type=time --target="2026-11-10 09:41:00+00" --target-action=pause --archive-mode=off restore
   ```
   For a plain backup test use `--type=immediate` instead. Exit code and log excerpt saved. If the restore reports an invalid page checksum it fails by design (2.60.0): record the file, restore another set with `--set`, and open an incident on the corrupted source.
4. **Start PostgreSQL** with `archive_mode = off` and `listen_addresses = 'localhost'` (or a test address), no pooler, no application. Watch the log until it reports it reached the recovery target and paused.
5. **Verify read-only**:
   ```sql
   SELECT pg_is_in_recovery(), now();
   SELECT count(*) FROM <table with known count at the target time>;     -- compare with the expected value
   SELECT max(<timestamp column>) FROM <busiest table>;                    -- last row before the target
   ```
   Run the application smoke tests against it if they exist (read-only user). Run `amcheck`/`pg_checksums` style checks only if you have them scripted; a successful `pg_dump -s` of every database is a minimum.
6. **Accept the point**: `SELECT pg_promote();` (becomes a primary on a new timeline). Or discard it and restore again with another target.
7. **Measure**: `date -u` end minus `restore.start` = measured RTO. Last visible row vs expected = measured RPO. Compare with the budget; if over, fix before the next incident (parallelism `process-max`, restore from the nearer repository, smaller base backup interval).
8. **Clean up the test copy** (its own change: it is a destructive step on the test host only; name the directory and host): stop the instance, remove the test data directory, record the removal. Never `--delta` into a directory you have not named.

## B. Recovering a few rows or one table from an incident

1. Restore to the isolated host to a time before the damage (steps A.1-A.6 with `--target-action=pause`).
2. Extract: `pg_dump -t schema.table --data-only` or `COPY (SELECT ...) TO ...` on the restored copy.
3. Load into production **inside a transaction with a reviewed query** (staging table first, then `INSERT ... SELECT` / `UPDATE ... FROM` after a diff), after the user's go with the row counts.
4. Overwriting production with the restored cluster is the last resort: it needs ACTION/EFFECT/PROOF/WAIT-FOR-GO from `references/destructive-actions.md`, a fresh backup of the damaged state first, and a plan for the second-writer risk.

## C. CloudNativePG recovery Cluster (Kubernetes)

1. Read-only: `kubectl --context $CTX -n databases get cluster,backup,scheduledbackup,objectstore` and note the newest completed `Backup` and the object store.
2. Create a NEW Cluster in a throwaway namespace (or with a different name) that bootstraps from the object store; set `serverName` to the source cluster's name and a `recoveryTarget`:
   ```yaml
   spec:
     bootstrap:
       recovery:
         source: source
         recoveryTarget:
           targetTime: "2026-11-10 09:41:00+00"
     externalClusters:
       - name: source
         plugin:
           name: barman-cloud.cloudnative-pg.io
           parameters:
             barmanObjectName: pg-main-store
             serverName: pg-main
   ```
   Do NOT add `spec.plugins` with `isWALArchiver: true` pointing at the production store: the restored cluster would write WAL into the production archive. If it needs archiving later, give it its own `ObjectStore` path.
3. Wait for the cluster to be ready (`kubectl cnpg status`), then verify as in A.5 through a `kubectl exec` psql session or a temporary client pod.
4. Record RTO/RPO; delete the throwaway namespace (a destructive step, named in the record) and its PVCs only after the evidence is saved.

## D. Pass / fail

Pass: restore completed, target reached, row counts and last-row timestamp match, smoke tests pass, measured RTO and RPO within budget, evidence stored in the ticket. Fail: any other result - the backup system is NOT considered working; fix, then re-run. Alert if the last passing test is older than 35 days.
