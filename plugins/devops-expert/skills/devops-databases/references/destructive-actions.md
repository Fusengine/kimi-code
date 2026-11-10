---
name: destructive-actions
description: Catalogue of PostgreSQL, Patroni, pgBackRest, CloudNativePG and Redis/Valkey commands that destroy data or availability, each in ACTION / EFFECT / PROOF / WAIT-FOR-GO form with what is unrecoverable
when-to-use: Before proposing or running ANY command that deletes, overwrites, promotes, resets, rebuilds or takes a database offline; whenever the user asks to "clean up", "reset", "fix by restoring" or "force" something
keywords: DROP DATABASE, DROP TABLE, TRUNCATE, DELETE without WHERE, pg_resetwal, pg_ctl promote, patronictl failover, reinit, remove, drop replication slot, VACUUM FULL, pg_upgrade --link, pgbackrest expire, stanza-delete, restore --delta, CloudNativePG delete, FLUSHALL
priority: critical
related: backup-pitr-pgbackrest.md, ha-patroni.md, major-upgrades.md, replication-streaming-logical.md, vacuum-bloat-wraparound.md, templates/restore-test-pitr-runbook.md
---

# Destructive Database Actions

**Load when:** a command can lose data for good or take a database down. Same discipline as the Operations Safety Protocol of the agent and the sibling `devops-proxmox` safe-change protocol: the agent **proposes**, shows the PROOF, and executes only after the user's explicit go **naming the object** (host, cluster, database, table, slot, stanza). One go covers one proposal.

## Proposal format (one block per action)

```
ACTION        <exact command with host, cluster, database/object named>
EFFECT        <what is removed, locked, restarted; who loses what; how long>
PROOF         <read-only check run NOW (output attached) + backup proof: newest backup listed AND restore-tested date>
UNRECOVERABLE <what cannot be brought back even with the backup (writes since the backup, WAL, slots, history)>
WAIT-FOR-GO   waiting for your go on: <object name>
```

## The standing PROOF (every action below needs it first)

1. Target confirmed read-only: `SELECT current_database(), inet_server_addr(), pg_is_in_recovery();` / `patronictl list` / `kubectl --context C -n NS get cluster.postgresql.cnpg.io` - right environment, right node, right role.
2. Backup that covers it: `pgbackrest --stanza=S info` (newest full/diff/incr, WAL range includes now), plus the date of the last **restore test** ([templates/restore-test-pitr-runbook.md](templates/restore-test-pitr-runbook.md)). A backup never restored is "not proven".
3. Dependants listed: sessions (`pg_stat_activity`), replicas and slots (`pg_stat_replication`, `pg_replication_slots`), applications, cron/backup jobs.
4. Rollback or recovery path written (restore to a new host and copy data back; not "undo").

## SQL data loss

| Action | Effect | Unrecoverable without a backup |
|--------|--------|-------------------------------|
| `DROP DATABASE name;` (`WITH (FORCE)` terminates other sessions) | Removes the catalog entries and deletes the data directory of the database; cannot run while connected to it; fails if others are connected unless `FORCE` | Everything in it, immediately. "DROP DATABASE cannot be undone" (manual) |
| `DROP TABLE t [CASCADE]` | Removes table, indexes and (with `CASCADE`) dependent views/constraints | Rows and dependants. Inside an open transaction it can still be rolled back: do not commit before the user confirms |
| `TRUNCATE t [CASCADE] [RESTART IDENTITY]` | Empties tables with `ACCESS EXCLUSIVE`; same effect as unqualified `DELETE` but faster; `CASCADE` empties referencing tables; not MVCC-safe for concurrent snapshots | All rows. Rollback only inside its own open transaction |
| `DELETE`/`UPDATE` without `WHERE` | Touches every row; WAL-heavy; replicas replay it | Old values after commit. Run first as `BEGIN; ... ; SELECT count(*) ...; ROLLBACK;` with the `WHERE` shown; require a `WHERE` or the user's explicit "all rows" |
| `DROP SUBSCRIPTION` | Removes the subscription; if tied to a remote slot it also drops the slot (cannot run in a transaction block then); unset the slot first with `ALTER SUBSCRIPTION ... SET (slot_name = NONE)` to keep it | Replication position; subscriber must be re-seeded |
| `pg_restore --clean` / `psql -f` of a dump with `DROP` statements | Drops then recreates objects in the target | The target's current contents. Restore into a NEW database first |

Block example:
```
ACTION        psql -h db1 -d postgres -c "DROP DATABASE appdb_old;"     (host db1, role primary)
EFFECT        deletes the appdb_old data directory; 3 sessions from app-batch would have to be terminated
PROOF         pg_stat_activity shows 0 sessions in 24h; pgbackrest info: full 2026-11-09, WAL to 09:58; restore test 2026-11-02 OK; \dt shows 0 rows touched since 2026-08
UNRECOVERABLE writes after the last archived WAL segment
WAIT-FOR-GO   waiting for your go on: db1 / appdb_old
```

## Cluster and server state

| Action | Effect | Unrecoverable / risk |
|--------|--------|----------------------|
| `pg_resetwal` (`-f` on an unclean/corrupt state) | Clears WAL and resets `pg_control`; the manual: last resort when the server will not start because of corruption; on anything but a cleanly shut down sound cluster it is "potentially dangerous" and can leave the database inconsistent (corrupt or lost transactions) | Consistency itself. Take a file-level copy of the data directory first, prefer restore from backup, then `pg_dump` everything out and rebuild; never leave a reset cluster in service |
| `pg_ctl promote` / `SELECT pg_promote();` | Ends recovery; the standby becomes a primary on a new timeline | Split brain if the old primary is still writable; the old primary needs `pg_rewind` or a rebuild. Under Patroni/CNPG never do it by hand |
| `patronictl failover <cluster> --candidate X` | Forced promotion of X; documented as able to lose data depending on candidate lag | Transactions the candidate had not received. Check `patronictl list` lag first; prefer `switchover` when a leader is healthy |
| `patronictl reinit <cluster> <member>` | Rebuilds that replica from the leader | The replica's local data directory (fine for a healthy leader; never target the leader) |
| `patronictl remove <cluster>` | Deletes the cluster's state from the DCS | Patroni's view of the cluster (members, leader lock, dynamic config); databases keep running unmanaged until Patroni is restarted |
| `patronictl pause` left on | No automatic failover | Availability: record and `resume` |
| `SELECT pg_drop_replication_slot('s');` | Removes the slot; the primary may then recycle WAL the consumer needs | The consumer (standby, subscriber, Debezium...) cannot resume and must be rebuilt/re-snapshotted. Check `active`, `wal_status`, owner first. Never drop slots managed by Patroni or CNPG |
| `VACUUM FULL`, `CLUSTER`, rewriting `ALTER TABLE`, `REINDEX` (non-concurrent), `LOCK TABLE` | `ACCESS EXCLUSIVE` for the whole run; needs about the table size of free disk | Availability of that table for the duration; no data loss. Prefer plain `VACUUM`, `REINDEX ... CONCURRENTLY`, pg_repack |
| `pg_terminate_backend(pid)` | Ends the session and rolls back its transaction | Work in flight; never a backup or migration session without checking what it is |
| `pg_upgrade --link` / `--swap` | Reuses or moves the old files | After the new cluster starts (`--link`) or once transfer begins (`--swap`) the old cluster is unusable: backup is the only way back ([major-upgrades.md](major-upgrades.md)) |
| `delete_old_cluster.sh`, `rm -rf` on a data/WAL directory, deleting files from `pg_wal` | Permanent file deletion; removing WAL by hand can make the server unrecoverable | Never delete `pg_wal` files; fix the archiver or slot instead |
| `systemctl stop`/restart of a primary | Drops all connections; crash recovery if not clean | Availability; use `pg_ctl stop -m fast` via the unit, not `kill -9` |

## Backup system

| Action | Effect | Unrecoverable / risk |
|--------|--------|----------------------|
| `pgbackrest --stanza=S expire` (also runs automatically after a backup) | Deletes backups beyond retention and their WAL; archive retention is checked on every run; `--set`, `--repo`, `--oldest` narrow it; in 2.60.0 refuses if the oldest retained backup has checksum errors | The expired restore points. Change `repo1-retention-*` only after reading `info`, with the new policy shown; never lower retention to "free space" without the user's go |
| `pgbackrest --stanza=S stanza-delete [--force]` | Permanently removes all backups and archives of the stanza from the repository; requires the cluster to be shut down or `--force`, and a prior `stop` | Every backup of that database. Needs the user's go naming the stanza AND repository path |
| `pgbackrest --delta restore` (or restore into a non-empty directory) | Replaces the target data directory contents to match the backup, deleting files that do not belong | The current state of that directory. Only on the intended replacement host or on a copy; never on a live instance; PostgreSQL stopped; `postmaster.pid` absent |
| Restoring over a live primary | Overwrites production with older data; in HA, risks a second writer | All writes since the restore point. Restore elsewhere first, extract, then decide |
| Deleting repository files, buckets or lifecycle rules by hand | Corrupts the repository metadata | Backups. Use `expire` only |

## Kubernetes (CloudNativePG) and key-value stores

| Action | Effect | Unrecoverable / risk |
|--------|--------|----------------------|
| `kubectl delete cluster.postgresql.cnpg.io NAME` | Removes the Cluster and its instances; whether the PVCs and PVs survive depends on owner references and the StorageClass `reclaimPolicy` (`Delete` removes the volume and its data) | Treat as deleting the data. Read-only first: `kubectl get pvc,pv`, the PV `persistentVolumeReclaimPolicy`, last backup in the object store, `ScheduledBackup` status. See `devops-kubernetes` storage-csi |
| `kubectl delete pvc ...` of an instance | Destroys that instance's data; the operator may re-clone a replica | Data of a primary PVC if no replica is in sync; never the primary's PVC |
| `kubectl delete namespace` | Deletes every Cluster, Pooler, Backup and Secret inside | Everything not backed up off-cluster |
| Major-version image change on a Cluster | Offline `pg_upgrade --link`; all pods shut down, replica PVCs destroyed and re-cloned | Availability for the duration; pre-upgrade PITR range |
| Deleting the `ObjectStore` or its bucket/credentials | Backups and WAL archive become unreachable | The whole recovery chain |
| `FLUSHALL` / `FLUSHDB` (Redis, Valkey) | Removes all keys of all (or the current) databases; replicas replay it | All data unless a persistence file from before still exists: with AOF, if no rewrite happened, stop the server, remove the last command from the AOF and restart (Valkey persistence docs); with RDB only the last snapshot. Never on an instance whose role is unconfirmed |

## What the agent never does without being asked and cleared

Run any statement it has not shown first; loop a destructive command over many databases or hosts; add `--force`, `--cascade`, `-f`, `WITH (FORCE)` or `--delta` on its own initiative; edit retention to a smaller value; print credentials; or "clean up" an object it did not create.

## Sources

- https://www.postgresql.org/docs/18/sql-dropdatabase.html , sql-truncate.html , sql-dropsubscription.html , app-pgresetwal.html (effects and warnings, read 2026-11-10); https://www.postgresql.org/docs/18/pgupgrade.html (reverting); https://www.postgresql.org/docs/18/functions-admin.html (`pg_promote`)
- Patroni docs `patronictl.rst`, `faq.rst` via raw GitHub (failover warning, remove, reinit, pause; read 2026-11-10)
- https://pgbackrest.org/command.html (`expire`, `stanza-delete` warning and prerequisites; read 2026-11-10)
- https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/main/docs/src/postgres_upgrades.md (in-place upgrade destroys replica PVCs); https://valkey.io/topics/persistence/ (FLUSHALL recovery via AOF)

## Not verified

- CloudNativePG behaviour on `Cluster` deletion (PVC ownership/retention): the project FAQ entry "Does CloudNativePG wipe the data directory when a cluster is deleted?" is a TODO in the docs read today; the table states the safe assumption.
- `pg_drop_replication_slot` was cited from the replication docs context; its page was not fetched.
- `pg_ctl stop -m fast` guidance and `DROP SUBSCRIPTION ... slot_name = NONE` follow the manual text read only in part.
