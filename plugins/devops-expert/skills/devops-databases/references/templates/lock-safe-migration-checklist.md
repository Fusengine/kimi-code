# Lock-Safe Migration Checklist (PostgreSQL)

Copy into the change ticket. Every box must be ticked or marked N/A with a reason. Background: `references/schema-changes-safe.md`.

## Before

- [ ] Target identified: host/cluster, database, schema, tables, row counts and sizes (`pg_total_relation_size`)
- [ ] Server major and minor recorded (`SELECT version();`); the DDL was checked against that major's manual
- [ ] Newest backup listed (`pgbackrest --stanza=main info`) AND the last restore test date recorded: ____
- [ ] For data-destroying steps (drop column/table, delete, truncate): ACTION/EFFECT/PROOF/WAIT-FOR-GO written and the user's go received
- [ ] Migration ran on a restored copy of production size; duration: ____; locks observed (`pg_locks`): ____
- [ ] No long transaction now: queries 4 and 5 of `monitoring-queries.sql` are clean (oldest `xact_age` < ____)
- [ ] No replica or slot already lagging (query 14, 15); WAL volume has headroom
- [ ] Application versions compatible with both the old and new schema (expand/contract)

## Session settings (first statements of the migration session)

- [ ] `SET lock_timeout = '3s';`
- [ ] `SET statement_timeout = '15min';` (or 0 for a concurrent index build, with a watcher)
- [ ] Not going through a transaction-mode pooler if the tool takes session advisory locks

## The statements

- [ ] Index: `CREATE INDEX CONCURRENTLY ...` (not in a transaction block); invalid-index check after (`pg_index.indisvalid`)
- [ ] Constraint: `ADD CONSTRAINT ... NOT VALID`, then `VALIDATE CONSTRAINT` in a separate step
- [ ] NOT NULL: valid CHECK proof first, then `SET NOT NULL`
- [ ] New column: no volatile default, no stored generated or identity column on a big table (they rewrite)
- [ ] Type change: expand/contract, not `ALTER COLUMN TYPE` on a big table
- [ ] Backfill in batches with commit per batch and a pause; replica lag watched
- [ ] Retry-on-lock_timeout logic with backoff and a maximum attempt count

## During

- [ ] Someone watches `pg_stat_activity` (waiting sessions), replica lag, and error rates
- [ ] Abort criteria written: ____ (e.g. blocked sessions above N for over 10 s: cancel with `pg_cancel_backend(<migration pid>)`)

## After

- [ ] Schema matches intent (`\d+ table`); no invalid index (`SELECT ... FROM pg_index WHERE NOT indisvalid`)
- [ ] `ANALYZE` run on touched tables (new indexes and columns need statistics)
- [ ] Autovacuum healthy; replication lag back to baseline
- [ ] A new base backup taken if the change was large (a rewrite, a mass delete, a major upgrade)
- [ ] Contract step (drop of old columns/tables) scheduled for a later release, not today
- [ ] Result recorded in the ticket: duration, locks, surprises
