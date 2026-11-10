---
name: monitoring-queries
description: Read-only PostgreSQL health queries an operator runs - sessions and wait events, blocking locks, slow statements with pg_stat_statements, cache and checkpoint health, archiver, replication lag, XID age - and what to alert on
when-to-use: Diagnosing slowness, locks, connection pileups or lag; deciding alert rules; before and after any change as the comparison baseline
keywords: pg_stat_activity, pg_stat_statements, pg_locks, pg_blocking_pids, pg_stat_replication, pg_stat_archiver, pg_stat_database, pg_stat_checkpointer, wait_event, idle in transaction, pg_cancel_backend
priority: high
related: vacuum-bloat-wraparound.md, replication-streaming-logical.md, schema-changes-safe.md, templates/monitoring-queries.sql
---

# PostgreSQL Monitoring Queries

**Load when:** a PostgreSQL instance behaves badly or an alert is being designed. All queries in [templates/monitoring-queries.sql](templates/monitoring-queries.sql) are **read-only**. Metrics collection and dashboards (postgres_exporter, Prometheus, Grafana, alert rules): `devops-observability`; this file defines what to look at, that skill wires it.

## Setup

- Monitoring role: `GRANT pg_monitor TO monitor_user;` (read access to the statistics views and settings without superuser; [postgres-roles-auth.md](postgres-roles-auth.md)).
- `pg_stat_statements`: add it to `shared_preload_libraries` (**restart required**), ensure query ID calculation is on (`compute_query_id` is `auto` by default when the module is loaded), then `CREATE EXTENSION pg_stat_statements;` in the database you query. It tracks all databases of the server. `pg_stat_statements_reset()` is a write on statistics: ask before using it.
- `log_min_duration_statement`, `log_lock_waits`, `log_checkpoints`, `log_autovacuum_min_duration` complement the views ([postgres-versions-config.md](postgres-versions-config.md)).

## Triage order

1. **Is it up and what role?** `SELECT version(), pg_is_in_recovery(), now() - pg_postmaster_start_time();`
2. **Sessions**: group `pg_stat_activity` by `state` and `wait_event_type`. Many `idle in transaction` = application bug holding locks and the xmin horizon. Many `active` with `Lock` waits = a blocker exists.
3. **Blockers**: `pg_blocking_pids(pid)` gives, for a waiting session, the PIDs blocking it. Find the root of the chain (a pid that blocks others and is not blocked), see what it is doing and for how long.
4. **Slow statements**: `pg_stat_statements` ordered by `total_exec_time` (what costs the most overall) and `mean_exec_time` with `calls` (what is slow per call); compare `shared_blks_read` to `shared_blks_hit` and `temp_blks_written` (spills: `work_mem`).
5. **Database counters**: `pg_stat_database` - `xact_rollback`/`xact_commit`, `deadlocks`, `temp_bytes`, `conflicts` (standby), cache hit ratio from `blks_hit`/`blks_read`.
6. **Checkpoints and WAL**: checkpoints requested vs timed (`pg_stat_checkpointer` in 17+; `pg_stat_bgwriter` earlier), `log_checkpoints` lines.
7. **Archiving**: `pg_stat_archiver` - `failed_count`, `last_failed_time`, `last_archived_time`. A failing `archive_command` makes WAL pile up in `pg_wal` until the disk fills.
8. **Replication**: `pg_stat_replication` (primary), `pg_replication_slots.wal_status` and retained WAL, `pg_stat_wal_receiver` on a standby ([replication-streaming-logical.md](replication-streaming-logical.md)).
9. **Vacuum and XID**: `pg_stat_user_tables` (`n_dead_tup`, `last_autovacuum`), `pg_stat_progress_vacuum`, `age(datfrozenxid)` ([vacuum-bloat-wraparound.md](vacuum-bloat-wraparound.md)).

## Reading a slow query

Run `EXPLAIN (ANALYZE, BUFFERS)` only on a copy, a replica or a statement that is safe to execute: `ANALYZE` **executes** the statement (an `UPDATE`/`DELETE` really changes data; wrap in `BEGIN; ... ROLLBACK;`). Look for estimated vs actual rows far apart (stale statistics: `ANALYZE`), sequential scans on big tables with selective filters (missing index: build it with `CREATE INDEX CONCURRENTLY`, [schema-changes-safe.md](schema-changes-safe.md)), sort/hash spills, nested loops over large inputs. Deeper query tuning is outside this skill.

## Intervening on sessions (writes: proposal, then go)

`pg_cancel_backend(pid)` cancels the current query (SIGINT); `pg_terminate_backend(pid)` ends the session (SIGTERM) and rolls back its transaction. Roles other than superuser need the right role membership (`pg_signal_backend`). Terminating a migration or a backup session can leave work half done: check what it is first. Prefer cancelling the blocked DDL's `lock_timeout` approach over killing production sessions.

## Alerts worth having

| Signal | Condition (starting point) |
|--------|---------------------------|
| Archiver failing | `failed_count` increases, or `last_archived_time` older than a few `archive_timeout` periods |
| Replication lag | replay lag over the RPO budget; replica `streaming` state lost |
| Slot retention | `wal_status` `extended`/`unreserved`/`lost`, or retained WAL over X GB; inactive slot |
| Disk | data and WAL volumes under 20% free |
| XID age | `age(datfrozenxid)` above 500 million |
| Connections | sessions above 80% of `max_connections` (or PgBouncer `cl_waiting` > 0) |
| Long transactions | `idle in transaction` over a few minutes; oldest `xact_start` over an hour |
| Backups | newest successful backup older than policy; restore test overdue |
| Deadlocks | `deadlocks` rate above baseline |

Thresholds are starting points to tune to the workload.

## Sources

- https://www.postgresql.org/docs/18/monitoring-stats.html (`pg_stat_activity`, `pg_stat_database`, `pg_stat_archiver`, `pg_stat_checkpointer`, `pg_stat_progress_vacuum`, `pg_stat_wal_receiver`; names confirmed present, read 2026-11-10)
- https://www.postgresql.org/docs/18/pgstatstatements.html (columns, `shared_preload_libraries`, `compute_query_id`), https://www.postgresql.org/docs/18/functions-info.html (`pg_blocking_pids`), https://www.postgresql.org/docs/18/functions-admin.html (`pg_cancel_backend`, `pg_terminate_backend`)

## Not verified

- Column-level details of each view were only checked by name presence on the pages; run `\d+ pg_stat_activity` on the target major before scripting against columns.
- Cache-hit-ratio targets and the alert thresholds above are practice, not manual values.
- `pg_stat_checkpointer` appears in 18's page; the claim that it exists since 17 is from general knowledge.
