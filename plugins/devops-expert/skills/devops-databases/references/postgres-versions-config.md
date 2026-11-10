---
name: postgres-versions-config
description: Supported PostgreSQL majors and the 5-year EOL policy, install choices, initdb defaults, and the postgresql.conf parameters an operator sets first (memory, WAL, checkpoints, connections, logging)
when-to-use: Choosing a major version, building a new instance, tuning or reviewing postgresql.conf, answering "is version X still supported"
keywords: postgresql.conf, shared_buffers, work_mem, max_wal_size, checkpoint_timeout, wal_level, initdb, data checksums, EOL, minor release
priority: high
related: postgres-roles-auth.md, replication-streaming-logical.md, major-upgrades.md, templates/postgresql-tuned.conf
---

# PostgreSQL Versions and Configuration

**Load when:** creating, sizing or reviewing a PostgreSQL instance. Read `SELECT version();` first: every default below is from the 18 manual.

## Versions and end of life (checked 2026-11-10)

The project supports a major for 5 years after its first release, then ships a final minor and the major is unsupported. Always run the latest minor of your major: minors are bug, security and corruption fixes only and need a restart, not a dump/restore.

| Major | Current minor | Final release (EOL) | Status |
|-------|---------------|---------------------|--------|
| 19 | RC1 (2026-10-15) | - | Not for production |
| 18 | 18.6 | 2030-11-14 | Default choice for new builds |
| 17 | 17.11 | 2029-11-08 | Supported |
| 16 | 16.15 | 2028-11-09 | Supported |
| 15 | 15.19 | 2027-11-11 | Supported, plan the move |
| 14 | 14.24 | **2026-11-12** | Last minor ships in two days: migrate now |
| 13 and older | - | passed | Unsupported: no fixes |

## Install

Use the distribution's PostgreSQL project repository (PGDG) or the OS package of a supported major; keep the binaries version-specific (`/usr/lib/postgresql/18`, `/usr/pgsql-18`) so two majors can coexist during an upgrade ([major-upgrades.md](major-upgrades.md)). `initdb` enables data checksums by default in 18 (`--no-data-checksums` turns them off); a cluster to be upgraded with `pg_upgrade` must be initialised with settings compatible with the old one. The data directory, WAL and backups belong on separate volumes when the platform allows it (filesystem and kernel tuning: `devops-linux`).

## postgresql.conf: what to set first

Defaults are conservative. Values below are starting points, not final: measure with [monitoring-queries.md](monitoring-queries.md). A ready fragment with reasoning per line is in [templates/postgresql-tuned.conf](templates/postgresql-tuned.conf).

| Parameter | Default (18) | Starting rule | Restart? |
|-----------|--------------|---------------|----------|
| `shared_buffers` | 128MB | ~25% of RAM on a dedicated server; more than 40% rarely helps | yes |
| `effective_cache_size` | 4GB | Planner hint only (buffers + OS cache): ~50-75% of RAM; reserves nothing | no |
| `work_mem` | 4MB | Per sort/hash node per query: multiply by concurrent nodes before raising; raise per role or per session first | no |
| `maintenance_work_mem` | 64MB | 512MB-2GB; autovacuum may use `autovacuum_max_workers` times this unless `autovacuum_work_mem` is set | no |
| `max_connections` | 100 | Keep low and pool with PgBouncer ([connection-pooling-pgbouncer.md](connection-pooling-pgbouncer.md)) | yes |
| `wal_level` | replica | `replica` for streaming and archiving; `logical` only when logical replication or decoding is needed | yes |
| `max_wal_size` | 1GB (soft limit) | 4-16GB: fewer forced checkpoints; larger values lengthen crash recovery | no |
| `checkpoint_timeout` | 5min | 15min on write-heavy systems, with `max_wal_size` sized so time, not size, triggers checkpoints | no |
| `checkpoint_completion_target` | 0.9 | Leave at 0.9 | no |
| `wal_compression` | off | `on` (or `lz4`/`zstd` if built in) when CPU is spare and WAL volume is high | no |
| `log_checkpoints` | on | Keep on; check "requested" vs "timed" counts | no |
| `log_min_duration_statement` | -1 (off) | e.g. 500ms to find slow queries; `log_lock_waits = on` (default off) | no |
| `log_autovacuum_min_duration` | 10min | Lower to 0-1min while tuning vacuum ([vacuum-bloat-wraparound.md](vacuum-bloat-wraparound.md)) | no |
| `max_slot_wal_keep_size` | -1 (unlimited) | Set a cap: an abandoned slot otherwise fills the WAL disk ([replication-streaming-logical.md](replication-streaming-logical.md)) | no |
| `archive_mode` / `archive_command` | off | On in production, pointing at pgBackRest ([backup-pitr-pgbackrest.md](backup-pitr-pgbackrest.md)) | `archive_mode` yes |

Rules:
- Change one thing, reload (`SELECT pg_reload_conf();`) or restart as the table says, and compare. `SELECT name, setting, pending_restart FROM pg_settings WHERE pending_restart;` lists values waiting for a restart.
- `ALTER SYSTEM` writes `postgresql.auto.conf`, which overrides `postgresql.conf`: grep both before concluding where a value comes from. On Patroni and CloudNativePG the manager owns these files; change the manager's config instead ([ha-patroni.md](ha-patroni.md), [postgres-on-kubernetes-cnpg.md](postgres-on-kubernetes-cnpg.md)).
- A restart drops every connection and replays WAL since the last checkpoint: schedule it, and on an HA cluster restart replicas first.

## Sources

- https://www.postgresql.org/support/versioning/ (read 2026-11-10: table of versions, current minors, final release dates, 19 RC1)
- https://www.postgresql.org/docs/18/runtime-config-resource.html , runtime-config-wal.html , runtime-config-connection.html , runtime-config-logging.html , runtime-config-vacuum.html , runtime-config-replication.html (defaults, read 2026-11-10)
- https://www.postgresql.org/docs/18/app-initdb.html (checksums enabled by default)
- Context7 `/websites/postgresql`: `shared_buffers` 25% / 40% guidance, `effective_cache_size`, `max_wal_size`, `checkpoint_completion_target`

## Not verified

- The numeric starting values in the "Starting rule" column other than the 25%/40% `shared_buffers` guidance are operator practice, not manual statements.
- PGDG repository setup steps and package names per distribution were not fetched; follow postgresql.org/download for the OS.
- `wal_compression` accepted algorithms depend on the build (not checked).
