---
name: postgres-on-kubernetes-cnpg
description: Running PostgreSQL on Kubernetes with CloudNativePG - versions and support window, Cluster, Pooler, backups and PITR through the Barman Cloud plugin, rolling and major upgrades, fencing, and pointers to other operators
when-to-use: Deploying or operating PostgreSQL on Kubernetes, choosing an operator, setting up scheduled backups and a recovery Cluster, upgrading a CNPG-managed database
keywords: CloudNativePG, CNPG, Cluster, ScheduledBackup, ObjectStore, barman-cloud plugin, Pooler, bootstrap recovery, targetTime, imageName, instances, volume snapshot, switchover
priority: high
related: ha-patroni.md, backup-pitr-pgbackrest.md, major-upgrades.md, connection-pooling-pgbouncer.md, destructive-actions.md, templates/cnpg-cluster.yaml, templates/cnpg-scheduledbackup.yaml
---

# PostgreSQL on Kubernetes: CloudNativePG

**Load when:** the database runs as pods. Cluster lifecycle, CSI, StorageClasses and etcd: `devops-k8s-cluster` and `devops-kubernetes` (storage-csi); packaging and GitOps of these manifests: `devops-gitops-packaging`; secrets: `devops-secrets`. Do not mix this with Patroni on the same data ([ha-patroni.md](ha-patroni.md)).

## Why CloudNativePG, and the version status

CloudNativePG (CNPG) is an operator that manages PostgreSQL primary/standby clusters directly through the Kubernetes API, without Patroni, repmgr or Stolon: it elects the new primary on failure, scales replicas, updates services and does rolling updates (replicas first, then a switchover). It is listed on the CNCF Landscape; PostgreSQL only, Kubernetes only, vanilla PostgreSQL only (no forks).

Checked 2026-11-10: latest release **v1.30.1**. Support table: **1.30.x** (released 2026-06-29, end of life ~March 2027) supports Kubernetes 1.34, 1.35, 1.36 (1.37 tested, not supported) and PostgreSQL 14-18; 1.29.x supported until 2026-09-29 (passed: upgrade). A minor is supported until 3 months after the next minor ships; plan a new minor roughly quarterly. Default operand image in 1.30.1 is PostgreSQL 18.6 (`18.6-system-trixie`). The operator's own image moved to Debian 13.

## Core resources

| Resource | Purpose |
|----------|---------|
| `Cluster` (`postgresql.cnpg.io/v1`) | The PostgreSQL cluster: `instances`, `imageName` (or an image catalog), `storage`, `postgresql.parameters`, `bootstrap`, `plugins` |
| `Pooler` | PgBouncer deployment in front of a Cluster (`type: rw` or `ro`, `pgbouncer.poolMode`, `parameters`); the name must differ from any Cluster name; `spec.cluster` is immutable ([connection-pooling-pgbouncer.md](connection-pooling-pgbouncer.md)) |
| `Backup` / `ScheduledBackup` | On-demand and cron backups (`schedule` uses six fields with seconds: `"0 0 0 * * *"`; `method: plugin`; `backupOwnerReference`) |
| `ObjectStore` (`barmancloud.cnpg.io/v1`, plugin) | Object store config (destinationPath, credentials, `retentionPolicy`) |
| `ImageCatalog`, `ClusterImageCatalog`, `Database`, `Publication`, `Subscription` | Declarative images, databases and logical replication |

Operations: `kubectl cnpg status <cluster>` and `kubectl cnpg backup` come from the `cnpg` kubectl plugin; `kubectl cnpg backup ... --dry-run` prints the Backup that would be created (1.30.1). Instance manager handles `postgresql.conf`/`pg_hba.conf` from the Cluster spec: do not edit them in the pod.

## Backups: use the Barman Cloud plugin

From 1.26 the native Barman object store support is **deprecated**; 1.31 is the last minor with it and it is **removed from 1.32.0**. The official path is the Barman Cloud Plugin (CNPG-I): install it in the operator's namespace, define an `ObjectStore`, reference it from `Cluster.spec.plugins` with `isWALArchiver: true`, back up with `method: plugin`. Do not set both `spec.backup.barmanObjectStore` and a WAL-archiver plugin (rejected). The `serverName` in the `ObjectStore` stays empty; use the `serverName` plugin parameter. Volume snapshots (CSI) are the other method: they support hot and cold backups and incremental/differential copies depending on storage, do not need WAL archiving (still recommended) and have no retention policy.

Facts to design with:
- Object store backups always require WAL archiving, are hot backups only, no incremental/differential, and support retention (`ObjectStore.spec.retentionPolicy: "30d"` = recovery window; obsolete backups are deleted after the next backup completes).
- With a WAL archive CNPG states an RPO of at most 5 minutes (`archive_timeout` bound); "a WAL archive alone is useless: without a base backup you cannot restore".
- Backups can run from a standby.
- `pg_dump` is not a CNPG backup and is "not suitable for business continuity".

Manifests: [templates/cnpg-cluster.yaml](templates/cnpg-cluster.yaml), [templates/cnpg-scheduledbackup.yaml](templates/cnpg-scheduledbackup.yaml).

## Recovery and PITR

Recovery creates a **new** Cluster (never in place): `bootstrap.recovery.source` points to an `externalClusters` entry with the plugin and `barmanObjectName` + `serverName` (the source cluster's name); add `recoveryTarget.targetTime` (the base backup is auto-selected as the closest complete one before the target). A snapshot recovery needs the snapshot's end time before the target (and the PGWAL snapshot if `walStorage` is used). The restored Cluster does **not** archive WAL unless `spec.plugins` is also set; give it a different bucket path or serverName than the source to avoid mixing timelines. If tablespaces were added or removed since the last base backup, WAL replay fails: take a base backup after the change. Prove restores on a schedule with a throwaway namespace ([templates/restore-test-pitr-runbook.md](templates/restore-test-pitr-runbook.md)).

## Upgrades

- **Minor/image change**: edit `imageName` (or the catalog): rolling update, replicas first, then switchover or restart of the primary. Use `primaryUpdateStrategy` deliberately (`unsupervised` automates the primary step; `supervised` waits for a manual switchover).
- **Operator**: read the release notes of each minor; stay inside the support table's Kubernetes range.
- **Major**: offline in-place `pg_upgrade --link` when the image's major rises (whole cluster down, replica PVCs destroyed and re-cloned), or blue/green with logical dump/restore or logical replication ([major-upgrades.md](major-upgrades.md)). A bug in PostgreSQL 17.0-17.5 breaks the in-place path unless `max_slot_wal_keep_size` is `-1`.
- Node maintenance: drain with PodDisruptionBudgets respected (`devops-kubernetes`); for fast node moves CNPG offers `nodeMaintenanceWindow` with `reusePVC`.

## Failover behaviour to know (1.30.1 fixes)

Demotion of an unreachable old primary during failover no longer waits on checkpoints; failover and pod recreation no longer stall while an instance is fenced; the primary now holds a `Lease` before PostgreSQL starts, closing a window where a restarting primary could write. Fencing an instance (annotation-based) is a deliberate availability reduction: record who fenced and unfence it.

## Other operators (pointers, not evaluated)

Zalando Postgres Operator (Patroni and Spilo based, PgBouncer, backups, web UI; seen in the Context7 library index), Crunchy PGO, StackGres, Percona Operator for PostgreSQL. Their current versions and support status were **not** checked; verify on each project's site before recommending. CNPG's README states it does not support other databases (for MariaDB, MySQL or Redis operators see those chapters).

## Sources

- https://github.com/cloudnative-pg/cloudnative-pg/releases (v1.30.1 notes, read 2026-11-10)
- https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/main/docs/src/supported_releases.md , backup.md , postgres_upgrades.md , connection_pooling.md , README.md (read 2026-11-10)
- https://raw.githubusercontent.com/cloudnative-pg/plugin-barman-cloud/main/web/docs/usage.md , retention.md (read 2026-11-10)
- Context7 `/cloudnative-pg/cloudnative-pg`: ScheduledBackup, PITR recovery snippets, `isWALArchiver` field comment

## Not verified

- Whether deleting a `Cluster` deletes its PVCs (the project FAQ entry is a TODO) - see [destructive-actions.md](destructive-actions.md).
- CNCF maturity level, exact `kubectl cnpg` subcommand set and flags beyond `backup --dry-run`, `nodeMaintenanceWindow` semantics in 1.30.
- The Barman Cloud plugin's own version and its Kubernetes/CNPG compatibility matrix.
- Other operators' current status.
