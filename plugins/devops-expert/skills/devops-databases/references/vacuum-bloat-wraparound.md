---
name: vacuum-bloat-wraparound
description: Autovacuum behaviour and tuning, measuring bloat, what blocks vacuum, why VACUUM FULL is dangerous, and transaction ID wraparound prevention and emergency handling
when-to-use: Tables growing without data growth, autovacuum never finishing, "database must be vacuumed within N transactions" warnings, planning a bloat cleanup, or setting wraparound alerts
keywords: autovacuum, VACUUM, VACUUM FULL, bloat, dead tuples, wraparound, datfrozenxid, relfrozenxid, autovacuum_freeze_max_age, vacuum_failsafe_age, pg_repack, xmin horizon
priority: high
related: monitoring-queries.md, replication-streaming-logical.md, schema-changes-safe.md, destructive-actions.md, templates/monitoring-queries.sql
---

# Vacuum, Bloat and Transaction ID Wraparound

**Load when:** table or index size, autovacuum activity or XID age is the question. Query pack: [templates/monitoring-queries.sql](templates/monitoring-queries.sql).

## What vacuum does

`UPDATE` and `DELETE` leave old row versions (MVCC); `VACUUM` reclaims them for reuse, updates planner statistics (via `ANALYZE`), maintains the visibility map and **freezes old rows to prevent XID wraparound**. Standard `VACUUM` runs alongside normal traffic (it blocks `ALTER TABLE`-type changes on that table) and does not return space to the OS except at the table's tail; `VACUUM FULL` rewrites the table and needs `ACCESS EXCLUSIVE`. The autovacuum daemon never issues `VACUUM FULL`. Disabling autovacuum is unwise except for an extremely predictable workload, and the system launches anti-wraparound autovacuums even when autovacuum is off.

## Autovacuum triggers and tuning

A table is vacuumed when dead tuples exceed `min(autovacuum_vacuum_max_threshold, autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor * reltuples)`; also when inserts since the last vacuum exceed the insert threshold. Defaults (18): threshold 50 tuples, scale factor 0.2 (20% of the table), `autovacuum_vacuum_max_threshold` 100,000,000 tuples, `autovacuum_vacuum_cost_delay` 2ms, `autovacuum_max_workers` 3, `autovacuum_naptime` 1min, `log_autovacuum_min_duration` 10min.

Practical tuning, in order:
1. **Per-table settings for hot or huge tables** instead of global changes: `ALTER TABLE big SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_vacuum_threshold = 1000);` (a short metadata lock; use `lock_timeout`, see [schema-changes-safe.md](schema-changes-safe.md)).
2. Raise throughput when vacuum cannot keep up: more `autovacuum_max_workers` (needs a restart; memory = workers x `maintenance_work_mem` unless `autovacuum_work_mem` is set), lower `autovacuum_vacuum_cost_delay`, or higher cost limit. Watch I/O.
3. Log it: `log_autovacuum_min_duration = 1min` (or 0 while investigating).
4. Fix the cause before the knobs. Vacuum cannot remove rows still visible to the oldest snapshot ("xmin horizon"). Typical holders (the manual lists the same): long-running or `idle in transaction` sessions, **prepared transactions** (`pg_prepared_xacts`), **replication slots** with old `xmin`/`catalog_xmin` (`pg_replication_slots`), and `hot_standby_feedback` from a lagging standby. Set `idle_in_transaction_session_timeout` per role.

## Measuring bloat

- Quick: `n_dead_tup`, `last_autovacuum`, `autovacuum_count` in `pg_stat_user_tables`; table and index sizes with `pg_total_relation_size`.
- Accurate: the `pgstattuple` extension (reads the relation; run off-peak) - exact dead-tuple and free-space figures; estimation-only queries are cheaper but approximate.
- Rule: bloat that returns after cleanup is a vacuum-throughput or xmin-horizon problem, not a one-off.

## Reclaiming space (all rewrite or exclusive-lock operations are proposals)

| Tool | Lock | Note |
|------|------|------|
| `VACUUM` | none blocking reads/writes | Makes space reusable; first step |
| `VACUUM FULL`, `CLUSTER`, rewriting `ALTER TABLE` | `ACCESS EXCLUSIVE` for the whole run; needs free disk roughly equal to the table plus indexes | Outage for that table: ACTION/EFFECT/PROOF/WAIT-FOR-GO ([destructive-actions.md](destructive-actions.md)) |
| `REINDEX INDEX CONCURRENTLY` / `REINDEX TABLE CONCURRENTLY` | brief locks, runs alongside traffic | Failure can leave an invalid index to drop |
| `pg_repack` (extension) | short locks at start and end | Extra disk, needs a primary key or unique index; third-party, verify the current version and your PostgreSQL major |

`TRUNCATE` empties a table instantly with an `ACCESS EXCLUSIVE` lock and no vacuum needed, but violates strict MVCC and is irreversible ([destructive-actions.md](destructive-actions.md)).

## Transaction ID wraparound

XIDs are 32-bit and compared modulo 2^32: every table in every database must be vacuumed (frozen) at least once every two billion transactions, or old rows appear to be "in the future" and become invisible (the manual calls it catastrophic data loss). Safeguards, with defaults:
- `autovacuum_freeze_max_age` 200 million (restart to change; per-table override): forces an anti-wraparound autovacuum even if autovacuum is off.
- `vacuum_freeze_min_age` 50 million; `vacuum_failsafe_age` 1.6 billion: at that age `VACUUM` skips cost delay, index vacuuming and buffer rings - last resort.
- When too close, the server logs `WARNING: database "x" must be vacuumed within N transactions` (the example shows about 40 million remaining) and eventually refuses new transaction IDs.

**Monitor** (page the on-call well before the warnings):
```sql
SELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC;                 -- alert > 500M, page > 1B
SELECT c.oid::regclass, greatest(age(c.relfrozenxid), age(t.relfrozenxid)) AS age   -- worst tables
FROM pg_class c LEFT JOIN pg_class t ON c.reltoastrelid = t.oid
WHERE c.relkind IN ('r','m') ORDER BY 2 DESC LIMIT 20;
```
(the same queries appear in the manual's routine-vacuuming page; thresholds are operator practice.)

**If the age is high**: first find and remove what holds the horizon - old transactions (`age(backend_xid)`/`age(backend_xmin)` in `pg_stat_activity`), prepared transactions, stale replication slots. Dropping a slot for a consumer that still exists breaks that consumer ([destructive-actions.md](destructive-actions.md)). Then run `VACUUM (VERBOSE, FREEZE)` on the worst tables as a superuser, largest benefit first. The manual says single-user-mode vacuuming is typically no longer necessary, should be avoided and disables the wraparound safeguards.

## Sources

- https://www.postgresql.org/docs/18/routine-vacuuming.html (vacuum variants, thresholds, wraparound text, warning example, xmin holders; read 2026-11-10)
- https://www.postgresql.org/docs/18/runtime-config-vacuum.html (defaults; read 2026-11-10) and Context7 `/websites/postgresql` (freeze parameters, XID age queries)

## Not verified

- Alert thresholds for XID age (500M/1B) and the cost-limit tuning advice are operator practice, not manual values.
- `pgstattuple` and `pg_repack` behaviour and compatibility with 18 were not fetched.
- The exact point at which the server refuses new transaction IDs (the manual's page was not read to that sentence).
