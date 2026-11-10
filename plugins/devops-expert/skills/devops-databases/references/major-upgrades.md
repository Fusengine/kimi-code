---
name: major-upgrades
description: PostgreSQL major version upgrade paths - pg_upgrade (copy, --link, --clone, --swap), the logical-replication near-zero-downtime route, dump/restore, extensions, replicas, rollback limits and post-upgrade steps
when-to-use: Moving off an end-of-life major (14 today), moving to 18, choosing the upgrade method, or validating an upgrade plan before the maintenance window
keywords: pg_upgrade, --check, --link, --clone, --swap, upgrade, logical replication, extensions, update_extensions.sql, vacuumdb, analyze-in-stages, rollback, pg_dump
priority: critical
related: replication-streaming-logical.md, backup-pitr-pgbackrest.md, ha-patroni.md, postgres-on-kubernetes-cnpg.md, destructive-actions.md
---

# Major Version Upgrades

**Load when:** the PostgreSQL major version changes. Minor releases need only a binary swap and restart. Version context: 14 gets its last release 2026-11-12; 18.6 is the target for new work ([postgres-versions-config.md](postgres-versions-config.md)).

## Choose the method

| Method | Downtime | Rollback | Use when |
|--------|----------|----------|----------|
| `pg_upgrade` (copy, default) | minutes to hours (copies data files) | old cluster untouched: restart it | Enough disk for a second copy; simplest safe path |
| `pg_upgrade --link` | minutes | **none** once the new cluster has started | Large data, tested plan, verified backup |
| `pg_upgrade --clone` | minutes | old cluster stays usable | Btrfs/XFS(reflink) on Linux 4.5+, APFS |
| `pg_upgrade --swap` | fastest on many relations | old cluster **destroyed** once file transfer begins | Only with a tested restore path |
| Logical replication to a new-major cluster | seconds to minutes (cutover) | old primary kept intact until cutover | Near-zero downtime, DDL freeze acceptable ([replication-streaming-logical.md](replication-streaming-logical.md)) |
| `pg_dump`/`pg_restore` | long (size-bound) | old cluster untouched | Small data, cross-platform, cleanup of bloat |

`pg_upgrade` supports upgrades from 9.2.X to the current major without passing through intermediate majors; read the release notes of every major in between. It lets the destination execute code chosen by the source superusers: only upgrade clusters whose superusers you trust.

## pg_upgrade procedure (summary of the manual, each step a change after the go)

1. **Proof first**: a fresh backup with a completed restore test ([templates/restore-test-pitr-runbook.md](templates/restore-test-pitr-runbook.md)). Link mode and swap mode make the backup the only way back.
2. Install the new binaries beside the old ones (version-specific directories) and the **extension shared objects** for the new major; do not run `CREATE EXTENSION` in the new cluster. Copy custom full-text search files.
3. `initdb` the new cluster with options compatible with the old one (checksums: 18 enables them by default; `pg_upgrade` checks `pg_controldata` compatibility). No need to start it.
4. Set `pg_hba.conf` to `peer` or use `.pgpass` for the install user; stop writers and **stop both servers** (standbys must be running during the old primary's shutdown so they receive everything).
5. **`pg_upgrade --check`** with the same options (`-b -B -d -D`, plus `--link` if chosen): it changes nothing, can run while the old server is running, and lists manual adjustments. Repeat until clean.
6. Run `pg_upgrade` for real (`-j N` for parallelism; `--link`/`--clone`/`--swap` per the table). It writes logs in the current directory (keep them; `--retain` keeps SQL and log files).
7. Start the new cluster; restore the original `pg_hba.conf` and carry over `postgresql.conf` differences by hand.
8. Run the `update_extensions.sql` script `pg_upgrade` produced if extension updates were reported.
9. **Statistics**: 18 transfers optimizer statistics (opt out with `--no-statistics`); still run `vacuumdb --all --analyze-in-stages --missing-stats-only`, then `vacuumdb --all --analyze-only` so autovacuum has current statistics.
10. **New base backup immediately**: WAL and backups from before the upgrade cannot be used for PITR across the major boundary. Point pgBackRest at the new `pg-path` and run `pgbackrest --stanza=main stanza-upgrade` (documented as required immediately after a major upgrade), then take the new full backup.
11. Only when satisfied (days, not hours) run the generated `delete_old_cluster.sh` ([destructive-actions.md](destructive-actions.md)).

**Rollback limits**: with `--check`, copy mode or `--clone` the old cluster is unmodified and can be restarted. With `--link`: if aborted before linking, unmodified; if linking started but the new cluster never started, remove the `.old` suffix from `$PGDATA/global/pg_control` to reuse the old cluster; **if the new cluster was started, the old one is unsafe and must be restored from backup**. With `--swap` the old cluster may be destroyed once transfer begins.

**Replicas**: after `pg_upgrade --link` the manual describes an `rsync --archive --delete --hard-links --size-only --no-inc-recursive` procedure run from the primary to bring standbys across quickly; the simpler alternative is to re-create the standbys from the new primary after the upgrade. Under Patroni, follow its own procedure (pause, upgrade the leader, re-initialise replicas) and rehearse it; CloudNativePG does an offline in-place upgrade when the image's major changes (below).

## Logical route (online)

Build a new-major cluster, copy the schema (`pg_dump --schema-only`), create publications on the old and subscriptions on the new, let it catch up, freeze DDL, copy sequence values, stop writes briefly, verify row counts and lag zero, repoint clients, keep the old cluster until the new one has run through a full business cycle. Sequences and DDL are not replicated; every table needs a replica identity. The manual's logical replication upgrade chapter covers upgrading logical replication clusters themselves.

## CloudNativePG

Three supported methods: logical dump/restore (blue/green, offline), native logical replication (blue/green, online) and `pg_upgrade --link` in place, which CloudNativePG runs when a new image with a higher major is declared: it shuts down all pods (the whole cluster, replicas included, is unavailable), records the previous image in `.status.pgDataImageInfo`, runs the upgrade job, then **destroys the replicas' PVCs and re-clones them**. Images must be the same OS distribution. A bug in 17.0-17.5 breaks the upgrade when `max_slot_wal_keep_size` is not `-1`; use 17.6+ or set `-1` temporarily. Take a new base backup right after ([postgres-on-kubernetes-cnpg.md](postgres-on-kubernetes-cnpg.md)).

## Sources

- https://www.postgresql.org/docs/18/pgupgrade.html (options, usage steps, reverting, standby rsync, post-upgrade; read 2026-11-10)
- https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/main/docs/src/postgres_upgrades.md (read 2026-11-10)
- https://www.postgresql.org/support/versioning/ (upgrade statement)

## Not verified

- pgBackRest `stanza-upgrade` was confirmed on the command page (set `pg-path` to the new location, then run it, `--no-online` if the database is offline); its effect on existing backups' PITR range was not read.
- Behaviour of specific extensions (PostGIS, TimescaleDB, pgvector...) across majors: check each extension's upgrade notes; none were fetched.
- Patroni major-upgrade procedure was not fetched; treat the summary as a hint to read the Patroni documentation.
- The 18 manual's statement that statistics are transferred was read as the `--no-statistics` option description only.
