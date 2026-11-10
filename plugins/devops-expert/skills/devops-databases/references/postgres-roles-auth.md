---
name: postgres-roles-auth
description: pg_hba.conf rules and ordering, SCRAM-SHA-256 and the MD5 deprecation, TLS-only entries, least-privilege roles, predefined monitoring roles, public schema hardening
when-to-use: Opening access to a PostgreSQL server, adding an application, backup, replication or monitoring role, reviewing who can connect from where
keywords: pg_hba.conf, scram-sha-256, md5, hostssl, password_encryption, pg_monitor, pg_read_all_stats, REVOKE, roles, replication role
priority: high
related: postgres-versions-config.md, connection-pooling-pgbouncer.md, replication-streaming-logical.md, templates/pg_hba.conf.example
---

# PostgreSQL Roles and Authentication

**Load when:** a new client, replica, backup agent or exporter needs to connect, or access is being reviewed. Network placement (firewall, VPN) is `devops-networking`; secrets handling is `devops-secrets`.

## pg_hba.conf

One line per rule: `TYPE DATABASE USER ADDRESS METHOD [OPTIONS]`. Types include `local`, `host`, `hostssl`, `hostnossl`, `hostgssenc`, `hostnogssenc`. Rules are matched top to bottom and the first match decides, so order narrow rules before broad ones and put a final explicit `reject` for anything else. Reload with `SELECT pg_reload_conf();` (no restart); check what the server parsed with `SELECT * FROM pg_hba_file_rules;` (shows line numbers and parse errors, read-only).

- **Method**: `scram-sha-256`. `password_encryption` defaults to `scram-sha-256`; MD5 password storage is deprecated and will be removed in a future release; `password` sends clear text. To migrate: ensure every client library supports SCRAM, set `password_encryption = 'scram-sha-256'`, have users set new passwords, then change the `pg_hba.conf` methods.
- **TLS**: use `hostssl` for any non-local address and a `hostnossl ... reject` line after it. Certificates and cipher policy: `devops-networking`.
- **Narrow CIDRs**: application subnets only. Never `0.0.0.0/0` with a password method on a routable network.
- **Replication**: a separate line with database `replication`, a dedicated role with `REPLICATION` and no other rights, restricted to the replica addresses.
- **Behind PgBouncer**: allow PgBouncer's address, not every client ([connection-pooling-pgbouncer.md](connection-pooling-pgbouncer.md)).
- **Under Patroni** the `pg_hba` list in the Patroni configuration generates the file (ignored if `hba_file` is non-default); per-role lists `pg_hba_primary` / `pg_hba_replica` replace, not merge ([ha-patroni.md](ha-patroni.md)).

Template with comments: [templates/pg_hba.conf.example](templates/pg_hba.conf.example).

## Roles: least privilege

```sql
-- Placeholders only; real passwords come from the secret store, set with \password (never typed into a shared history)
CREATE ROLE app_owner NOLOGIN;                       -- owns objects, nobody logs in as it
CREATE ROLE app_rw LOGIN;                            -- application runtime role
GRANT CONNECT ON DATABASE appdb TO app_rw;
GRANT USAGE ON SCHEMA app TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
```

- `CREATE ROLE` has no `LOGIN` by default; `CREATE USER` is `CREATE ROLE ... LOGIN`.
- Separate roles: migration/owner (DDL), application (DML), read-only analytics, `replicator` (`REPLICATION`), backup agent, monitoring, PgBouncer's auth role. No application connects as a superuser.
- **Monitoring**: grant `pg_monitor` (member of `pg_read_all_settings`, `pg_read_all_stats`, `pg_stat_scan_tables`) instead of superuser.
- **Other predefined roles to grant knowingly**: `pg_signal_backend` (cancel or terminate other sessions, not superuser sessions), `pg_read_all_data` / `pg_write_all_data`.
- **Public schema**: from PostgreSQL 15 new databases no longer give everyone `CREATE` on `public`; on older majors and on upgraded databases run `REVOKE CREATE ON SCHEMA public FROM PUBLIC;`.
- Per-role limits: `ALTER ROLE app_rw SET statement_timeout = '30s';`, `CONNECTION LIMIT`, `idle_in_transaction_session_timeout`.

Auditing who can do what (read-only): `\du+`, `\dn+`, `\dp schema.*`, and `SELECT rolname, rolsuper, rolreplication, rolcanlogin FROM pg_roles;`.

## Sources

- https://www.postgresql.org/docs/18/auth-password.html (SCRAM, MD5 deprecation, migration steps, read 2026-11-10)
- https://www.postgresql.org/docs/18/auth-pg-hba-conf.html (record formats, read 2026-11-10)
- https://www.postgresql.org/docs/18/predefined-roles.html (read 2026-11-10)
- Context7 `/websites/postgresql`: `password_encryption` default, `REVOKE CREATE ON SCHEMA public`, `CREATE ROLE`/`CREATE USER`
- https://patroni.readthedocs.io (dynamic configuration: `pg_hba`, role-specific lists)

## Not verified

- The "first match decides" ordering wording was not re-read on the 18 page today (the fetched text did not return that sentence); it is long-standing documented behaviour.
- `pg_hba_file_rules` view and the PostgreSQL 15 default for the public schema were not fetched today.
- The SQL block is an illustrative pattern, not run against any server.
