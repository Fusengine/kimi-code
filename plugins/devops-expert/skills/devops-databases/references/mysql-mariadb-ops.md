---
name: mysql-mariadb-ops
description: MySQL and MariaDB operations essentials - release lines and support in 2026 (MySQL 8.4/9.7 LTS and year-based versions, MariaDB 12.3 LTS), backup tools, GTID replication and why MySQL and MariaDB GTIDs are incompatible, upgrade rules, destructive actions
when-to-use: Operating, backing up, replicating or upgrading a MySQL or MariaDB server, choosing between the two, or reading a MySQL version number like 26.7
keywords: MySQL, MariaDB, mysqldump, MySQL Shell dumpInstance, mariadb-backup, clone plugin, GTID, CHANGE REPLICATION SOURCE, master_use_gtid, LTS, innovation, Galera, binlog
priority: medium
related: destructive-actions.md, backup-logical-physical.md, redis-valkey-ops.md
---

# MySQL and MariaDB Operations Essentials

**Load when:** the server is MySQL or MariaDB. Generic backup storage and drills: `devops-storage-backup`. Application schema: framework experts. PostgreSQL is the deep part of this skill; this file is the short, verified-core version.

## Release lines (checked 2026-11-10)

**MySQL**: two tracks, LTS and Innovation. LTS series follow Oracle Lifetime Support (5 years premier + 3 years extended), contain only necessary fixes and allow in-place upgrades and downgrades inside the series; Innovation releases are supported until the next Innovation release. Current manual lines: **8.4 LTS**, **9.7 LTS** (9.7 is the last release line using sequential numbers), **26.7** and **26.10** (Innovation, calendar versions `YY.M`: 26.7 is the July 2026 release; an LTS keeps its `YY.M` fixed for its life). **MySQL 8.0 moved to Oracle Sustaining Support on 2026-04-21**: upgrade to 8.4 or 9.7. LTS to the next LTS is supported (8.4 to 9.7), skipping an LTS series is not. Do not read "26.7" as a patch of 9.x. Pick the track once; the official repositories select it (`mysql-9.7-lts-community` vs `mysql-innovation-community` for yum). Solaris and EL7 binaries are discontinued.

**MariaDB**: Community Server series listed: 13.2 (development), 13.1, 13.0 (current rolling), **12.3 (latest long-term stable, maintained three years)**, 11.8, 11.4, 10.11, 10.6. Per-series end-of-life dates are on the MariaDB Foundation maintenance policy and the platform deprecation page; they were not extracted today.

## MySQL vs MariaDB: they have diverged

Different GTID implementations that are **not compatible**: MariaDB can be a replica of a MySQL primary, MySQL cannot replicate from a MariaDB primary (MariaDB documentation). Different version numbering, tooling names (`mariadb-backup` vs MySQL Enterprise Backup / clone plugin) and feature sets (Galera Cluster is MariaDB's multi-primary option; MySQL has InnoDB Cluster / Group Replication). Treat a move between them as a migration, not an upgrade: dump/restore or logical replication with testing, never in-place file copy. Compatibility pages: the MariaDB documentation "Compatibility and Differences".

## Backup

| Need | MySQL | MariaDB |
|------|-------|---------|
| Logical, small/medium | `mysqldump`; or **MySQL Shell** `util.dumpInstance()` / `dumpSchemas()` / `dumpTables()` with `util.loadDump()` (parallel threads, compression, progress, dry run, DDL + tab-separated data files) | `mariadb-dump` (the `mysqldump`-compatible tool; name not re-checked) |
| Physical, hot | MySQL Enterprise Backup (commercial); the **clone plugin** for replica provisioning; Percona XtraBackup is a third-party alternative (not verified today) | **`mariadb-backup`** (renamed from `mariabackup`): physical hot backup of InnoDB, Aria, MyISAM; forked from Percona XtraBackup 2.3.8; uses `BACKUP STAGE` from 10.11.8 |
| PITR | physical or logical base backup + binary logs replayed to a point | same |

Notes: `mysqlpump` is deprecated since MySQL 8.0.34 (manual points to `mysqldump` and MySQL Shell); the 9.7 manual has no `mysqlpump` page (the request for it returned the 8.0 page), so do not build on it. MySQL Shell dumps are the recommended modern logical path. Restore tests apply exactly as for PostgreSQL ([templates/restore-test-pitr-runbook.md](templates/restore-test-pitr-runbook.md) is the model: restore to a new host, compare counts, replay binlogs to a target). Enable the binary log (`log_bin`) on any server that needs PITR or replication, with a retention that exceeds the backup interval.

## GTID replication

**MySQL (8.4 manual)**: both servers need unique `server_id`, binary logging, `gtid_mode=ON` and `enforce-gtid-consistency=ON`. Cold-start sequence: make servers read-only if already replicating, wait for the replica to catch up, restart with GTID options, then on the replica `CHANGE REPLICATION SOURCE TO SOURCE_HOST=..., SOURCE_AUTO_POSITION=1, ...` (replication user and password from the secret store, never typed into history) and `START REPLICA;`, then take a **new backup** - binary logs without GTIDs cannot be used on servers where GTIDs are enabled, so old backups plus old binlogs are no longer a PITR chain. Online mode change is a separate documented procedure.

**MariaDB**: GTID is on by default for new setups; the replica tracks `gtid_slave_pos` (crash-safe in an InnoDB table). `CHANGE MASTER TO master_use_gtid = slave_pos | current_pos | no`: use **`slave_pos`**; `current_pos` is documented as not recommended because extra transactions on the replica can corrupt the position. Moving a replica to another primary is simple with GTID.

Both: use semi-sync or Group Replication / Galera only with a documented failure model; automatic failover tools (Orchestrator, MaxScale, ProxySQL, InnoDB Cluster/Router) were not evaluated. Never run two writable primaries without a conflict-resolution design.

## Upgrades

MySQL: in-place within an LTS; LTS to next LTS supported; use the clone plugin or logical routes for others; read the upgrade checker output (MySQL Shell `util.checkForServerUpgrade()` - from general knowledge). MariaDB: read the release notes of every series jumped; `mariadb-upgrade` after binaries change (general knowledge). Always: backup proof, replicas first, one major at a time.

## Destructive actions

`DROP DATABASE`/`DROP TABLE`/`TRUNCATE`, `DELETE`/`UPDATE` without `WHERE`, `RESET MASTER`/`RESET REPLICA` (deletes binary log files / replication state), `PURGE BINARY LOGS`, `mysqldump --add-drop-database` restores, and restoring over a live server: use the ACTION / EFFECT / PROOF / WAIT-FOR-GO format of [destructive-actions.md](destructive-actions.md), PROOF including the last restore test and the binlog range. MySQL sessions set `sql_safe_updates=1` for interactive operator sessions.

## Sources

- https://dev.mysql.com/doc/refman/9.7/en/mysql-releases.html (LTS/Innovation model, numbering, support terms, upgrade rules; read 2026-11-10)
- https://dev.mysql.com/doc/refman/26.10/en/ and 9.7 index (version selector), https://www.mysql.com/support/eol-notice.html (8.0 Sustaining Support 2026-04-21; read 2026-11-10)
- https://dev.mysql.com/doc/mysql-shell/26.10/en/mysql-shell-utilities-dump-instance-schema.html (dump utilities); https://dev.mysql.com/doc/refman/8.0/en/mysqlpump.html (deprecation); https://dev.mysql.com/doc/refman/8.4/en/replication-gtids-howto.html (GTID setup)
- https://mariadb.com/docs/release-notes/community-server (series list, 12.3 LTS), .../about/maintenance-policy.md , .../server/ha-and-performance/standard-replication/gtid.md (incompatibility, `master_use_gtid`), .../mariadb-backup/mariadb-backup-overview.md (read 2026-11-10)

## Not verified

- MariaDB per-series end-of-life dates, and the MariaDB dump tool name (`mariadb-dump`).
- Percona XtraBackup, Orchestrator, MaxScale, ProxySQL, InnoDB Cluster status and versions.
- `util.checkForServerUpgrade()`, `mariadb-upgrade`, `sql_safe_updates`, `RESET MASTER`/`PURGE BINARY LOGS` semantics: general knowledge, not fetched.
- Galera Cluster operations (listed as a topic in `docs/research-devops-plugin.md`) are not covered here.
