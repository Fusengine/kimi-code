---
name: velero-kubernetes-backup
description: Velero for Kubernetes - BackupStorageLocation, Schedule, TTL, volume handling (CSI snapshots, data movement, file-system backup), restore and DR flow
when-to-use: Backing up Kubernetes objects and persistent volumes, scheduling backups, or restoring a namespace or cluster
keywords: velero, backup, schedule, ttl, backupstoragelocation, snapshotMoveData, defaultVolumesToFsBackup, restore, readonly, volumePolicies
priority: high
related: kubernetes-storage-pointers.md, backup-destructive-ops.md, restore-testing-dr.md, templates/velero-schedule.yaml
---

# Velero (1.18.4)

**Load when:** Kubernetes workloads need backup beyond what etcd snapshots give. etcd snapshot/restore: `devops-k8s-cluster`. PV/PVC/StorageClass and VolumeSnapshot API: `devops-kubernetes`. The project lives at `velero-io/velero` (v1.18.4 release). Template: [velero-schedule.yaml](templates/velero-schedule.yaml).

## Model

| Object | Purpose |
|--------|---------|
| `BackupStorageLocation` (BSL) | Where backup tarballs and logs go (object storage bucket + prefix); has `accessMode` `ReadWrite` or `ReadOnly` |
| `Backup` | One backup request; `spec.ttl` sets expiry (default 30 days, server flag `--default-backup-ttl`) |
| `Schedule` | Cron-driven `Backup` template; backups are named `<schedule>-<YYYYMMDDhhmmss>` |
| `Restore` | Recreates resources from a Backup |

On expiry the garbage collector (reconcile loop every hour by default) removes the backup resource, the object-storage files, all PV snapshots and associated restores. Failed deletions carry the label `velero.io/gc-failure=<Reason>` (`BSLNotFound`, `BSLCannotGet`, `BSLReadOnly`).

## Volumes: pick one mechanism per volume

| Field in `spec` (Backup / Schedule template) | Meaning |
|-----------------------------------------------|---------|
| `snapshotVolumes` | Take provider/CSI snapshots (unset: snapshot when a volume provider is configured) |
| `snapshotMoveData: true` | After the CSI snapshot, move the data to the backup location (survives loss of the storage system); `datamover: velero` is the built-in mover |
| `defaultVolumesToFsBackup: true` | File-system backup of pod volumes by default |
| `csiSnapshotTimeout` | Wait for the VolumeSnapshot to become ReadyToUse (default 10m) |
| `resourcePolicy` | ConfigMap with `volumePolicies` (match by capacity, CSI driver, storage class, NFS source) and action `skip`, `fs-backup` or `snapshot` |

A snapshot that stays inside the storage system (same Ceph cluster) is not an off-site copy: use data movement or a second backup path for the "off-site" leg of [backup-strategy.md](backup-strategy.md).

## Operations

```bash
velero schedule create daily --schedule "0 3 * * *" --ttl 720h0m0s   # or apply the Schedule manifest
velero backup create --from-schedule daily                            # run now, schedule unaffected
velero backup get; velero backup describe NAME --details
velero restore create --from-backup NAME --namespace-mappings app:app-restore   # restore beside the original
```

A Schedule created now first fires at the next cron time (`skipImmediately` controls the "due immediately" case). The `Schedule` spec also has `paused` and `useOwnerReferencesInBackup` (if true, deleting the schedule deletes its backups: leave false).

## Disaster-recovery flow (from the Velero DR page)

1. Back up on a schedule.
2. In the recovery cluster set the BSL to `ReadOnly` (stops backups being created or deleted during restore): `kubectl patch backupstoragelocation NAME -n velero --type merge --patch '{"spec":{"accessMode":"ReadOnly"}}'`.
3. `velero restore create --from-backup NAME`.
4. Set the BSL back to `ReadWrite`.

Restore is only proven by doing it: restore into a scratch namespace or cluster on a schedule ([restore-testing-dr.md](restore-testing-dr.md)). Deleting backups: [backup-destructive-ops.md](backup-destructive-ops.md).

## Sources

- Context7 `/velero-io/velero` v1.18 docs (2026-11-10): https://github.com/velero-io/velero/blob/main/site/content/docs/v1.18/api-types/schedule.md , .../backup-reference.md , .../how-velero-works.md , .../disaster-case.md , .../resource-filtering.md
- https://raw.githubusercontent.com/velero-io/velero/main/site/content/docs/v1.18/api-types/backup.md (read 2026-11-10; fields `ttl`, `snapshotMoveData`, `datamover`, `defaultVolumesToFsBackup`, `storageLocation`)
- https://github.com/velero-io/velero/releases/tag/v1.18.4 (release page title read)

## Not verified

- `velero install` flags, plugin versions and the node-agent/kopia configuration: not read.
- `--namespace-mappings` flag spelling for `restore create`: not read on 1.18 today.
- Compatibility of Velero 1.18 with the Kubernetes minor in use and with CSI snapshot CRD versions.
- `skipImmediately` effect beyond the schema comment.
