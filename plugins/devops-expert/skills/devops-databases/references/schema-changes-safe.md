---
name: schema-changes-safe
description: Lock-aware schema changes on a live PostgreSQL - lock queue behaviour, lock_timeout and retries, CREATE INDEX CONCURRENTLY, NOT VALID constraints, table rewrites to avoid, backfills, and a pre-flight checklist
when-to-use: Before running any ALTER, CREATE INDEX, DROP, constraint or type change on a production table, reviewing a migration for lock risk, or after a migration caused a stall
keywords: lock_timeout, statement_timeout, ACCESS EXCLUSIVE, CREATE INDEX CONCURRENTLY, DROP INDEX CONCURRENTLY, NOT VALID, VALIDATE CONSTRAINT, table rewrite, backfill, REINDEX CONCURRENTLY, migration, lock queue
priority: critical
related: monitoring-queries.md, vacuum-bloat-wraparound.md, destructive-actions.md, templates/lock-safe-migration-checklist.md
---

# Safe Schema Changes in Production

**Load when:** a migration will touch a table that serves traffic. The application's migration tool and schema design belong to the framework experts; this is the operator's lock and downtime view. Checklist to attach to every change: [templates/lock-safe-migration-checklist.md](templates/lock-safe-migration-checklist.md).

## The lock-queue trap

A DDL statement that needs a strong lock (`ACCESS EXCLUSIVE`) waits behind every open transaction touching the table - and while it waits, **every new query on that table queues behind it**. A harmless `ALTER TABLE` stuck behind one forgotten `idle in transaction` session becomes an outage. Defence on every migration session:

```sql
SET lock_timeout = '3s';          -- abort if the lock is not acquired quickly (applies to each lock wait)
SET statement_timeout = '15min';  -- cap runaway work; 0 for a known long concurrent build
-- run the DDL; on lock_timeout failure: find the blocker (monitoring-queries.md), then retry in a quiet moment
```

`lock_timeout` (default 0 = wait forever) aborts any statement that waits longer than the value for a table, index or row lock. Build a retry loop in the deploy tooling (backoff, max attempts, alert) rather than raising the timeout. Check for long transactions before starting: query 4 and 5 of [templates/monitoring-queries.sql](templates/monitoring-queries.sql).

## Locks that matter

| Operation | Lock / effect | Safe pattern |
|-----------|---------------|--------------|
| `CREATE INDEX` | blocks writes (reads continue) for the whole build | `CREATE INDEX CONCURRENTLY` |
| `CREATE INDEX CONCURRENTLY` | takes two table scans and waits for older transactions; cannot run inside a transaction block; not supported on partitioned tables (build per partition, then attach) | A failure leaves an **invalid** index that still costs write overhead: check `pg_index.indisvalid`, `DROP INDEX CONCURRENTLY` it, retry |
| `DROP INDEX` | `ACCESS EXCLUSIVE` | `DROP INDEX CONCURRENTLY` (one index; no `CASCADE`; not for constraint-backed indexes) |
| `REINDEX` | locks | `REINDEX INDEX CONCURRENTLY` |
| `ADD CONSTRAINT ... CHECK/FOREIGN KEY` | full-table validation scan under a strong lock | `ADD CONSTRAINT ... NOT VALID` first (no scan of existing rows, new rows checked), then `VALIDATE CONSTRAINT` (takes only `SHARE UPDATE EXCLUSIVE`, runs alongside traffic) |
| `ADD FOREIGN KEY` | `SHARE ROW EXCLUSIVE` on both tables | `NOT VALID` then `VALIDATE` |
| `SET NOT NULL` | scans the table, unless a valid `CHECK (col IS NOT NULL)` proves it | 18+: `ADD CONSTRAINT nn NOT NULL col NOT VALID`, then `VALIDATE CONSTRAINT nn`; older: add a CHECK `NOT VALID`, `VALIDATE`, then `SET NOT NULL`, then drop the check |
| `ADD COLUMN` | fast with no default or a non-volatile default | A volatile default, stored generated column, identity column or domain with constraints **rewrites the whole table and its indexes** |
| `ALTER COLUMN TYPE` | normally rewrites the table and indexes (a few binary-coercible changes do not) | add a new column, backfill in batches, switch, drop later (expand/contract) |
| `DETACH PARTITION` | strong lock | `DETACH PARTITION ... CONCURRENTLY` |
| `ALTER TABLE ... SET (autovacuum_...)` | brief metadata lock | still use `lock_timeout` |
| Rename column/table, drop column | instant, but breaks running application versions | expand/contract across two deploys |

## Expand / contract

1. **Expand**: add the new nullable column, table or index in a backward-compatible way. Old and new application versions both work.
2. **Backfill** in batches of a few thousand rows with a pause between batches, `COMMIT` per batch, ordered by primary key, so vacuum and replication keep up and locks stay short. Monitor replica lag and dead tuples while it runs.
3. **Switch** the application (feature flag), then add constraints with `NOT VALID` / `VALIDATE`.
4. **Contract** in a later release: drop the old column or table. Drops are irreversible: backup proof and ACTION/EFFECT/PROOF/WAIT-FOR-GO ([destructive-actions.md](destructive-actions.md)).

## Rules of thumb

- One DDL per transaction/migration step when each takes a strong lock; combining them extends the time the lock is held.
- Never run a data backfill and a schema change in the same transaction.
- Test the migration on a restored copy of production size, time it, and record the locks it takes (`pg_locks` while it runs).
- Prefer off-peak windows for any step that is not concurrent-safe, and tell the on-call.
- Migrations that need a session advisory lock must not go through a transaction-mode PgBouncer ([connection-pooling-pgbouncer.md](connection-pooling-pgbouncer.md)).
- `DROP TABLE` / `TRUNCATE` / `DELETE` without `WHERE` in a migration is a destructive action, whatever the tool.

## Sources

- https://www.postgresql.org/docs/18/sql-createindex.html (concurrent build steps, invalid index on failure, not in a transaction block, partitioned tables; read 2026-11-10)
- https://www.postgresql.org/docs/18/sql-dropindex.html (`CONCURRENTLY` caveats), https://www.postgresql.org/docs/18/sql-altertable.html (`NOT VALID`, `VALIDATE CONSTRAINT` lock, `SET NOT NULL` scan rule, rewrite cases, `ADD FOREIGN KEY` lock, `DETACH PARTITION CONCURRENTLY`), https://www.postgresql.org/docs/18/sql-reindex.html (`CONCURRENTLY`), https://www.postgresql.org/docs/18/runtime-config-client.html (`lock_timeout` semantics, default 0), https://www.postgresql.org/docs/18/explicit-locking.html (read 2026-11-10)

## Not verified

- The statement that every new query queues behind a waiting `ACCESS EXCLUSIVE` request is the documented lock-queue behaviour from general knowledge; the explicit-locking page was only checked for the lock names.
- That a non-volatile default does not rewrite is inferred from the manual's list of rewrite cases (volatile default etc. rewrite); the PostgreSQL 11 origin of the fast path was not fetched.
- Which `ALTER COLUMN TYPE` changes avoid a rewrite (the manual says "as an exception"; the list was truncated in the extract).
- Batch sizes and pause values are practice, not manual values.
