---
name: devops-databases
description: Use when operating (not designing) databases - PostgreSQL installation and tuning (postgresql.conf, pg_hba.conf, roles), PgBouncer pooling, backups and point-in-time recovery (pg_dump, pg_basebackup, pgBackRest, restore tests), streaming and logical replication, Patroni high availability and failover/switchover, major version upgrades (pg_upgrade, logical route), vacuum/bloat/transaction ID wraparound, monitoring queries, lock-safe schema changes in production, PostgreSQL on Kubernetes with CloudNativePG; plus MySQL/MariaDB (GTID replication, backup tools), Redis/Valkey (RDB/AOF, Sentinel vs Cluster) and MongoDB pointers. Not for application schema or ORM modelling (framework experts), generic backup/storage strategy (devops-storage-backup), exporters and dashboards (devops-observability), secret stores (devops-secrets) or managed cloud databases.
versions:
  postgresql: "18.6 / 17.11 / 16.15 / 15.19 supported; 14.24 final release 2026-11-12; 19 RC1"
  pgbackrest: "2.60.0"
  patroni: "4.1.5"
  pgbouncer: "1.26.1"
  cloudnativepg: "1.30.1"
  mysql: "8.4 LTS, 9.7 LTS, 26.7 / 26.10 innovation"
  mariadb: "12.3 LTS, 13.0 rolling"
  redis: "8.10 (8.12 RC2)"
  valkey: "9.1.3 / 9.0.7 / 8.1.11 / 8.0.12 / 7.2.15"
references:
  - references/postgres-versions-config.md
  - references/postgres-roles-auth.md
  - references/connection-pooling-pgbouncer.md
  - references/backup-pitr-pgbackrest.md
  - references/backup-logical-physical.md
  - references/replication-streaming-logical.md
  - references/ha-patroni.md
  - references/major-upgrades.md
  - references/vacuum-bloat-wraparound.md
  - references/monitoring-queries.md
  - references/schema-changes-safe.md
  - references/postgres-on-kubernetes-cnpg.md
  - references/destructive-actions.md
  - references/mysql-mariadb-ops.md
  - references/redis-valkey-ops.md
  - references/mongodb-pointers.md
  - references/templates/postgresql-tuned.conf
  - references/templates/pg_hba.conf.example
  - references/templates/pgbouncer.ini
  - references/templates/pgbackrest.conf
  - references/templates/pgbackrest-commands.md
  - references/templates/patroni.yml
  - references/templates/cnpg-cluster.yaml
  - references/templates/cnpg-scheduledbackup.yaml
  - references/templates/monitoring-queries.sql
  - references/templates/lock-safe-migration-checklist.md
  - references/templates/restore-test-pitr-runbook.md
related-skills:
  - devops-storage-backup
  - devops-observability
  - devops-kubernetes
  - devops-k8s-cluster
  - devops-secrets
  - devops-linux
  - devops-networking
  - devops-sre-ops
---

<objective>
Covers running databases in production as an operator: PostgreSQL in depth
(config, auth, pooling, backup and PITR, replication, Patroni HA, upgrades,
vacuum, monitoring, safe migrations, CloudNativePG), then MySQL/MariaDB and
Redis/Valkey essentials and MongoDB pointers. Does not cover application schema
or ORMs (framework experts), generic backup and storage design
(devops-storage-backup), exporters and dashboards (devops-observability) or
managed cloud databases.
</objective>

# DevOps Databases

## Agent Workflow (MANDATORY)

Before ANY change on a database host or cluster, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find existing configs, migrations, operator manifests, backup jobs
2. **research-expert** - verify the parameter or command for the server's major version at postgresql.org/docs, pgbackrest.org, patroni.readthedocs.io, cloudnative-pg.io
3. **mcp__context7__query-docs** - `/websites/postgresql`, `/pgbackrest/pgbackrest`, `/patroni/patroni`, `/pgbouncer/pgbouncer`, `/cloudnative-pg/cloudnative-pg`

Then read the target read-only (`SELECT version()`, `SHOW ALL`, backup `info`, replication state) BEFORE proposing anything. After writing files, run **sniper**.

## Versions (checked 2026-11-10)

PostgreSQL supports a major version for 5 years; 18.6, 17.11, 16.15, 15.19 are supported and **14.24 gets its final release on 2026-11-12** - treat 14 as end of life this week; 13 and older are unsupported; 19 is at RC1 (https://www.postgresql.org/support/versioning/). pgBackRest 2.60.0 (2026-10-18), Patroni 4.1.5 (2026-08-12), PgBouncer 1.26.1 (2026-10-14, fixes three CVEs: run 1.26.1 or later), CloudNativePG 1.30.1 (1.30.x supports Kubernetes 1.34-1.36 and PostgreSQL 14-18). Details and sources inside each reference.

## Overview

| Area | Decision in one line |
|------|----------------------|
| **Version** | New builds on the newest supported major with the current minor; plan a move off any major within 12 months of its final release |
| **Pooling** | PgBouncer in `transaction` mode with `max_prepared_statements` > 0; session features break in that mode |
| **Backup** | Physical (pgBackRest or CNPG Barman Cloud plugin) + WAL archive for PITR; `pg_dump` is a complement, never the only copy; a backup counts only after a restore test |
| **HA** | Patroni + a 3-node DCS (etcd) on VMs; CloudNativePG on Kubernetes; failover automatic, switchover planned |
| **Upgrade** | `pg_upgrade --check` first; logical replication route for near-zero downtime; take a new base backup after |
| **Maintenance** | Keep autovacuum on; watch `age(datfrozenxid)`; never `VACUUM FULL` on a live table without a window |
| **Migrations** | `lock_timeout` on every DDL, `CREATE INDEX CONCURRENTLY`, `NOT VALID` then `VALIDATE` |
| **Other engines** | MySQL/MariaDB: GTID replication, official dump/backup tools; Redis/Valkey: persistence is a choice, Sentinel for HA |

## Critical Rules

1. **Version first** - `SELECT version();` before any parameter or command; parameters appear and disappear between majors
2. **Backup proof before any risky step** - a listed backup is not a proof; the proof is a completed restore test ([restore-test-pitr-runbook.md](references/templates/restore-test-pitr-runbook.md))
3. **Destructive actions are proposed, not run** - ACTION / EFFECT / PROOF / WAIT-FOR-GO, naming what is unrecoverable ([destructive-actions.md](references/destructive-actions.md))
4. **Read-only first** - discovery queries and `info`/`status` commands; the agent never runs a statement against a real database that it has not shown
5. **No credential on a command line or in a file** - `CHANGE_ME` placeholders in templates; real secrets from `devops-secrets`, `PGPASSFILE` or `.pgpass`
6. **One writer** - never promote or restore while another node may still accept writes (split brain)
7. **Never invent a parameter, flag or CRD field** - cite the doc page; unknown = "not verified"

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Versions and config** | [postgres-versions-config.md](references/postgres-versions-config.md) | Install, `postgresql.conf` memory/WAL/checkpoints |
| **Roles and auth** | [postgres-roles-auth.md](references/postgres-roles-auth.md) | `pg_hba.conf`, SCRAM, least-privilege roles |
| **Pooling** | [connection-pooling-pgbouncer.md](references/connection-pooling-pgbouncer.md) | Too many connections, transaction mode pitfalls |
| **Backup and PITR** | [backup-pitr-pgbackrest.md](references/backup-pitr-pgbackrest.md) | pgBackRest stanza, WAL archive, restore to a point in time |
| **Dump and base backup** | [backup-logical-physical.md](references/backup-logical-physical.md) | `pg_dump`, `pg_basebackup`, incremental, Barman pointer |
| **Replication** | [replication-streaming-logical.md](references/replication-streaming-logical.md) | Replicas, slots, lag, logical replication |
| **High availability** | [ha-patroni.md](references/ha-patroni.md) | Patroni, etcd, failover vs switchover, split brain |
| **Major upgrades** | [major-upgrades.md](references/major-upgrades.md) | `pg_upgrade`, logical route, extensions |
| **Vacuum** | [vacuum-bloat-wraparound.md](references/vacuum-bloat-wraparound.md) | Bloat, autovacuum tuning, XID wraparound |
| **Monitoring** | [monitoring-queries.md](references/monitoring-queries.md) | Activity, locks, slow queries, lag |
| **Safe migrations** | [schema-changes-safe.md](references/schema-changes-safe.md) | DDL on a busy table |
| **Kubernetes** | [postgres-on-kubernetes-cnpg.md](references/postgres-on-kubernetes-cnpg.md) | CloudNativePG cluster, backup, upgrade, alternatives |
| **Destructive catalogue** | [destructive-actions.md](references/destructive-actions.md) | Any irreversible command |
| **MySQL / MariaDB** | [mysql-mariadb-ops.md](references/mysql-mariadb-ops.md) | Backup, GTID replication, divergence |
| **Redis / Valkey** | [redis-valkey-ops.md](references/redis-valkey-ops.md) | Persistence, Sentinel vs Cluster, eviction |
| **MongoDB** | [mongodb-pointers.md](references/mongodb-pointers.md) | One-line pointers only |

### Templates

| Template | When to Use |
|----------|-------------|
| [postgresql-tuned.conf](references/templates/postgresql-tuned.conf) | Starting parameters with the reasoning per line |
| [pg_hba.conf.example](references/templates/pg_hba.conf.example) | SCRAM, TLS, narrow CIDRs, replication entries |
| [pgbouncer.ini](references/templates/pgbouncer.ini) | Transaction pooling with prepared statements |
| [pgbackrest.conf](references/templates/pgbackrest.conf) | Repository, retention, archive settings |
| [pgbackrest-commands.md](references/templates/pgbackrest-commands.md) | Backup, info, verify, restore command sheet |
| [patroni.yml](references/templates/patroni.yml) | One Patroni node with etcd3 |
| [cnpg-cluster.yaml](references/templates/cnpg-cluster.yaml) | CloudNativePG Cluster, ObjectStore, Pooler |
| [cnpg-scheduledbackup.yaml](references/templates/cnpg-scheduledbackup.yaml) | Scheduled base backups via the plugin |
| [monitoring-queries.sql](references/templates/monitoring-queries.sql) | Read-only health queries |
| [lock-safe-migration-checklist.md](references/templates/lock-safe-migration-checklist.md) | Before any production DDL |
| [restore-test-pitr-runbook.md](references/templates/restore-test-pitr-runbook.md) | Proving a backup and a PITR |

## Quick Reference

```bash
psql "host=db1 dbname=postgres user=ops" -Atc "select version(), pg_is_in_recovery()"   # password from PGPASSFILE
pgbackrest --stanza=main info                                  # backups and WAL range, read-only
patronictl -c /etc/patroni/patroni.yml list                    # topology and lag, read-only
kubectl --context "$CTX" -n "$NS" get cluster.postgresql.cnpg.io   # CNPG status, read-only
```

## Best Practices

### DO
- Keep WAL archiving on in production and alert on `pg_stat_archiver.failed_count`
- Test restores on a schedule and record the date, the target time and the row count compared
- Run PgBouncer, backups and monitoring with their own least-privilege roles
- Put retention, `max_slot_wal_keep_size` and disk alerts in place before a replica or slot is added

### DON'T
- Use `pg_dump` alone as disaster recovery, or run a restore over a live instance
- Delete a replication slot, a Cluster or a PVC to "clean up" without the proof in [destructive-actions.md](references/destructive-actions.md)
- Edit `postgresql.conf` on a Patroni or CloudNativePG member by hand: the manager owns it
