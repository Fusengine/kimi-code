-- monitoring-queries.sql
-- READ-ONLY health queries for PostgreSQL 17/18 (checked against the 18 manual, 2026-11-10).
-- Run as a role that is a member of pg_monitor. Nothing here changes data or settings.
-- Lines that DO change something are commented out and marked WRITE: they need the user's go.
-- Usage: psql "host=db1 dbname=postgres user=monitor_user" -f monitoring-queries.sql   (password from PGPASSFILE)

\echo '== 1. Identity, role, uptime'
SELECT version(), pg_is_in_recovery() AS is_standby,
       now() - pg_postmaster_start_time() AS uptime;

\echo '== 2. Sessions by state and wait event'
SELECT state, wait_event_type, wait_event, count(*)
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY 1, 2, 3 ORDER BY 4 DESC;

\echo '== 3. Connections vs limit'
SELECT count(*) AS sessions,
       current_setting('max_connections')::int AS max_connections,
       round(100.0 * count(*) / current_setting('max_connections')::int, 1) AS pct_used
FROM pg_stat_activity;

\echo '== 4. Oldest transactions (xmin horizon holders)'
SELECT pid, usename, application_name, state,
       now() - xact_start AS xact_age, now() - state_change AS in_state_for,
       age(backend_xmin) AS xmin_age, left(query, 100) AS query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start LIMIT 15;

\echo '== 5. Idle in transaction longer than 1 minute'
SELECT pid, usename, application_name, now() - state_change AS idle_for, left(query, 100) AS last_query
FROM pg_stat_activity
WHERE state = 'idle in transaction' AND now() - state_change > interval '1 minute'
ORDER BY idle_for DESC;

\echo '== 6. Blocked sessions and who blocks them'
SELECT a.pid AS blocked_pid, a.usename, a.wait_event_type, a.wait_event,
       now() - a.query_start AS waiting_for,
       pg_blocking_pids(a.pid) AS blocked_by, left(a.query, 100) AS blocked_query
FROM pg_stat_activity a
WHERE cardinality(pg_blocking_pids(a.pid)) > 0
ORDER BY waiting_for DESC;

\echo '== 7. Ungranted locks'
SELECT locktype, relation::regclass AS relation, mode, pid, granted
FROM pg_locks WHERE NOT granted;

\echo '== 8. Prepared transactions (hold the xmin horizon until resolved)'
SELECT gid, prepared, owner, database, age(transaction) AS xid_age FROM pg_prepared_xacts;

\echo '== 9. Top statements by total time (needs pg_stat_statements in shared_preload_libraries + CREATE EXTENSION)'
SELECT queryid, calls, round(total_exec_time::numeric, 1) AS total_ms,
       round(mean_exec_time::numeric, 2) AS mean_ms, rows,
       shared_blks_hit, shared_blks_read, temp_blks_written, left(query, 100) AS query
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 15;
-- WRITE (ask first): SELECT pg_stat_statements_reset();

\echo '== 10. Database counters and cache hit ratio'
SELECT datname, xact_commit, xact_rollback, deadlocks, temp_bytes, conflicts,
       round(100.0 * blks_hit / NULLIF(blks_hit + blks_read, 0), 2) AS cache_hit_pct
FROM pg_stat_database WHERE datname IS NOT NULL ORDER BY xact_commit DESC;

\echo '== 11. Checkpoints (PostgreSQL 17+; on 16 and older use pg_stat_bgwriter)'
SELECT num_timed, num_requested, buffers_written FROM pg_stat_checkpointer;

\echo '== 12. WAL archiver'
SELECT archived_count, last_archived_time, failed_count, last_failed_time FROM pg_stat_archiver;

\echo '== 13. WAL directory size'
SELECT count(*) AS files, pg_size_pretty(sum(size)) AS size FROM pg_ls_waldir();

\echo '== 14. Replication (run on the primary)'
SELECT application_name, client_addr, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_bytes_behind,
       write_lag, flush_lag, replay_lag
FROM pg_stat_replication;

\echo '== 15. Replication slots and retained WAL (primary)'
SELECT slot_name, slot_type, active, wal_status, safe_wal_size,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC NULLS LAST;

\echo '== 16. Standby delay (run on a standby; returns NULL on a primary)'
SELECT now() - pg_last_xact_replay_timestamp() AS replay_delay;

\echo '== 17. Transaction ID age per database (alert > 500M)'
SELECT datname, age(datfrozenxid) AS xid_age FROM pg_database ORDER BY 2 DESC;

\echo '== 18. Worst tables by XID age'
SELECT c.oid::regclass AS table_name,
       greatest(age(c.relfrozenxid), age(t.relfrozenxid)) AS xid_age
FROM pg_class c LEFT JOIN pg_class t ON c.reltoastrelid = t.oid
WHERE c.relkind IN ('r', 'm') ORDER BY 2 DESC LIMIT 20;

\echo '== 19. Dead tuples and last autovacuum (current database)'
SELECT relname, n_live_tup, n_dead_tup,
       round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
       last_autovacuum, last_autoanalyze, autovacuum_count
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 20;

\echo '== 20. Vacuums running now'
SELECT pid, datname, relid::regclass AS table_name, phase, heap_blks_total, heap_blks_scanned
FROM pg_stat_progress_vacuum;

\echo '== 21. Biggest relations (current database)'
SELECT c.oid::regclass AS relation, pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 15;

\echo '== 22. Invalid indexes left by a failed CONCURRENTLY build'
SELECT indexrelid::regclass AS index_name, indrelid::regclass AS table_name
FROM pg_index WHERE NOT indisvalid;

\echo '== 23. Settings waiting for a restart'
SELECT name, setting, pending_restart FROM pg_settings WHERE pending_restart;

-- WRITE examples, never run without the user's go and the PROOF in destructive-actions.md:
--   SELECT pg_cancel_backend(<pid>);       -- cancels the current query of that session
--   SELECT pg_terminate_backend(<pid>);    -- ends the session, rolls back its transaction
