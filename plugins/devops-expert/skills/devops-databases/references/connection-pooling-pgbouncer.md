---
name: connection-pooling-pgbouncer
description: PgBouncer pool modes, sizing, prepared statements in transaction mode, authentication (auth_file, auth_query), features that break under transaction pooling, and the 2026 CVE fixes
when-to-use: Too many PostgreSQL connections, connection storms from many app instances, deciding session vs transaction pooling, debugging "prepared statement does not exist" or lost SET/LISTEN behaviour
keywords: pgbouncer, pool_mode, transaction pooling, default_pool_size, max_client_conn, max_prepared_statements, auth_query, auth_type, server_reset_query, SHOW POOLS
priority: high
related: postgres-roles-auth.md, postgres-versions-config.md, postgres-on-kubernetes-cnpg.md, templates/pgbouncer.ini
---

# Connection Pooling with PgBouncer

**Load when:** connection counts, latency from connection setup, or an application misbehaves behind a pooler. Each PostgreSQL backend is a process with memory; a pooler multiplexes many client connections onto few server connections.

## Version and security

Run **PgBouncer 1.26.1 or later** (2026-10-14). 1.26.1 fixes CVE-2026-107350 (a second StartupMessage during SCRAM auth lets a client who knows one user's password log in as another SCRAM user, 1.17.0-1.26.0), CVE-2026-107349 (CPU spin on an empty startup option name when `ignore_startup_parameters` is non-empty, 1.20.0-1.26.0) and CVE-2026-107348 (infinite loop with an oversized `max_packet_size`, non-default only). 1.26.0 fixed CVE-2026-19888, CVE-2026-6668, CVE-2026-6669. 1.26.0 also tracks `search_path` (PostgreSQL 18+) and `default_transaction_read_only` by default; `ignore_startup_parameters = search_path` restores the 1.25 behaviour, and later releases are expected to fix `search_path` tracking bugs. Check the changelog before upgrading.

## Pool modes (`pool_mode`)

| Mode | Server connection released | Use |
|------|---------------------------|-----|
| `session` (default) | when the client disconnects | Apps that rely on session state; least multiplexing |
| `transaction` | when the transaction ends | Default choice for web apps; the application must not use session state |
| `statement` | after each statement; multi-statement transactions refused | Rare, autocommit-only workloads |

Features by mode (PgBouncer "SQL feature map"): under **transaction** pooling these never work - `SET`/`RESET` (session-level), `LISTEN`, `WITH HOLD` cursors, SQL-level `PREPARE`/`DEALLOCATE`, `PRESERVE`/`DELETE ROWS` temp tables, `LOAD`, session-level advisory locks. Use `SET LOCAL` inside a transaction instead of `SET`. Startup parameters (`client_encoding`, `DateStyle`, `IntervalStyle`, `TimeZone`, `standard_conforming_strings`, `application_name`) are tracked and work in both modes. Migration tools that take session advisory locks (many do) must connect directly to PostgreSQL or through a session-mode pool.

## Prepared statements

Protocol-level named prepared statements work in transaction and statement mode only when `max_prepared_statements` is non-zero (PgBouncer 1.21.0+); the value is the LRU cache size per server connection, larger than the application's commonly used statements (the release note suggests 100 as reasonable). SQL-level `PREPARE`/`EXECUTE` are not tracked. If a prepared statement's result type changes you may see `cached plan must not change result type`. Many drivers need a setting to use protocol-level prepares; check the driver docs.

## Sizing

- `default_pool_size` (default 20) is per user/database pair. Server connections ~= pairs x pool size; keep their sum below `max_connections` minus `superuser_reserved_connections` (default 3) minus replication and admin sessions.
- `max_client_conn` (default 100): raise to the real client count; raise the file descriptor limit of the service (`LimitNOFILE` in the unit - `devops-linux`).
- `reserve_pool_size` (default 0) with `reserve_pool_timeout` (default 5s) absorbs bursts; `max_db_connections` / `max_user_connections` cap per database or user.
- `query_wait_timeout` (default 120s) disconnects clients that wait for a server connection; `server_idle_timeout` default 600s; `server_lifetime` default 3600s.
- PgBouncer is single-threaded: for more CPU, several instances can listen on the same port with `so_reuseport`, or run one per application node.
- Pool in front of every replica role separately (read/write vs read-only endpoints); a pool in front of Patroni follows the leader through HAProxy or a VIP, not by editing PgBouncer ([ha-patroni.md](ha-patroni.md)). With CloudNativePG use the `Pooler` resource ([postgres-on-kubernetes-cnpg.md](postgres-on-kubernetes-cnpg.md)).

## Authentication

- `auth_type`: default is `md5` (a user with a SCRAM secret is authenticated with SCRAM automatically). Set `scram-sha-256` explicitly; `plain` is deprecated; `trust` skips the check.
- `auth_file` lists users (`"user" "SCRAM-SHA-256$..."`). For many users use `auth_user` + `auth_query`: PgBouncer reads credentials from the database. Direct access to `pg_authid` needs superuser; use a non-superuser role that calls a `SECURITY DEFINER` function, installed in every database (the query runs inside the target database).
- TLS toward clients (`client_tls_sslmode`) and servers (`server_tls_sslmode`); certificates via `devops-networking`.
- Admin console: connect to the virtual `pgbouncer` database as an `admin_users` member; `stats_users` read-only. Read-only commands: `SHOW POOLS;`, `SHOW STATS;`, `SHOW CLIENTS;`, `SHOW SERVERS;`. `RELOAD;` re-reads the config; `PAUSE`/`RESUME` quiesce a pool (planned switchover helper, still a change: ask first).

## Troubleshooting

| Symptom | Likely cause | Check |
|---------|--------------|-------|
| `no more connections allowed (max_client_conn)` | client count above the limit | `SHOW CLIENTS;` count, raise limit and fd limit |
| Clients stall, `cl_waiting` > 0 in `SHOW POOLS` | pool exhausted by slow or idle-in-transaction sessions | `pg_stat_activity` `state`, [monitoring-queries.md](monitoring-queries.md) |
| `prepared statement "..." does not exist` | transaction mode with `max_prepared_statements = 0` | set it > 0 and use protocol-level prepares |
| Setting lost between queries | session `SET` under transaction pooling | `SET LOCAL` or session mode |
| `LISTEN` never fires | transaction mode | direct connection for listeners |

Template: [templates/pgbouncer.ini](templates/pgbouncer.ini).

## Sources

- https://www.pgbouncer.org/changelog.html (1.26.1 and 1.26.0 entries, read 2026-11-10)
- https://github.com/pgbouncer/pgbouncer/blob/master/doc/config.md (defaults for `pool_mode`, `default_pool_size`, `max_client_conn`, `auth_type`, `auth_query`, `auth_user`, timeouts, `max_prepared_statements`, read via raw file 2026-11-10 and Context7 `/pgbouncer/pgbouncer`)
- https://www.pgbouncer.org/features.html ("SQL feature map for pooling modes", read 2026-11-10)

## Not verified

- Admin-console command list (`SHOW ...`, `RELOAD`, `PAUSE`, `RESUME`) is from general knowledge of the console; check https://www.pgbouncer.org/usage.html before relying on exact column names.
- `so_reuseport` is cited from the `max_prepared_statements` doc text; its platform support was not checked.
- Exact fix status of the `search_path` tracking bugs after 1.26.1 was not checked.
