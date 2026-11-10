---
name: devops-storage-backup
description: Use when choosing, running or repairing storage and backups - block vs file vs object, ZFS (pools, vdev layouts, datasets, snapshots, send/receive, scrub, ARC), Ceph (cephadm, MON/MGR/OSD/MDS, pools, CRUSH, RBD/CephFS/RGW, health, OSD replacement, capacity), NFS and iSCSI basics, S3-compatible object storage (MinIO status, Garage, SeaweedFS, Ceph RGW), Kubernetes storage pointers (CSI, Rook-Ceph, Longhorn), backup strategy (3-2-1-1-0, RPO/RTO, retention, immutability, encryption, off-site), restic, BorgBackup/borgmatic, Velero, rclone, Proxmox Backup Server pointer, restore testing, disaster-recovery runbooks, capacity monitoring and SMART. Not for LVM and single-host filesystems (devops-linux), database dumps and PITR (devops-databases), Proxmox PBS jobs and vzdump (devops-proxmox), PV/PVC basics (devops-kubernetes) or public-cloud storage services.
versions:
  openzfs: "2.4.4 (GitHub release zfs-2.4.4, 2026-08-21)"
  ceph: "21.2.0 Umbrella (2026-10-28), 20.2.5 Tentacle, 19.2.7 Squid (EOL 2026-12-02)"
  restic: "0.19.1 (2026-07-05)"
  borgbackup: "1.4.5 stable (Borg 2 is in beta)"
  borgmatic: "2.2.0"
  velero: "1.18.4 (repository velero-io/velero)"
  rclone: "1.76.0"
  rook: "1.21.2"
  longhorn: "1.13.0"
  seaweedfs: "4.53 (Apache-2.0)"
  minio: "community repository no longer maintained"
references:
  - references/storage-selection.md
  - references/nfs-iscsi.md
  - references/object-storage-s3.md
  - references/kubernetes-storage-pointers.md
  - references/zfs-pools-datasets.md
  - references/zfs-snapshots-replication.md
  - references/zfs-destructive-ops.md
  - references/ceph-architecture-deploy.md
  - references/ceph-operations-health.md
  - references/ceph-destructive-ops.md
  - references/backup-strategy.md
  - references/restic.md
  - references/borg-borgmatic.md
  - references/velero-kubernetes-backup.md
  - references/rclone-pbs-pointers.md
  - references/backup-destructive-ops.md
  - references/restore-testing-dr.md
  - references/capacity-smart-monitoring.md
  - references/templates/restic-backup.sh
  - references/templates/restic-backup.service
  - references/templates/restic-backup.timer
  - references/templates/restic-maintenance.sh
  - references/templates/borgmatic-config.yaml
  - references/templates/zfs-snapshot-replicate.sh
  - references/templates/zfs-snapshot-policy.md
  - references/templates/velero-schedule.yaml
  - references/templates/restore-test-checklist.md
  - references/templates/dr-runbook.md
  - references/templates/backup-policy-table.md
related-skills:
  - devops-linux
  - devops-databases
  - devops-proxmox
  - devops-kubernetes
  - devops-k8s-cluster
  - devops-openstack
  - devops-observability
  - devops-secrets
  - devops-sre-ops
---

<objective>
Covers where data lives and how it is protected: choosing a storage type, ZFS,
Ceph, NFS/iSCSI, S3-compatible object storage, backup strategy and the tools
that implement it (restic, Borg/borgmatic, Velero, rclone), restore testing,
disaster-recovery runbooks and capacity/SMART monitoring. Does not cover LVM
and single-host filesystems (devops-linux), database dumps and point-in-time
recovery (devops-databases), Proxmox vzdump and PBS jobs (devops-proxmox),
PV/PVC mechanics (devops-kubernetes) or public-cloud storage services.
</objective>

# DevOps Storage and Backup

## Agent Workflow (MANDATORY)

Before ANY storage or backup change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find existing backup scripts, timers, pool/dataset layout files, Velero manifests, inventories
2. **research-expert** - verify the flag or option for the installed version at openzfs.github.io, docs.ceph.com, restic.readthedocs.io, borgbackup.readthedocs.io, velero.io
3. **mcp__context7__query-docs** - `/websites/openzfs_github_io_openzfs-docs`, `/ceph/ceph`, `/restic/restic`, `/websites/borgbackup_readthedocs_io_en_stable`, `/velero-io/velero`

Then read the system read-only (`zpool status`, `zfs list`, `ceph -s`, `restic snapshots`, `velero backup get`). After file changes run **sniper**.

## Versions (checked 2026-11-10)

OpenZFS zfs-2.4.4, Ceph 21.2.0 / 20.2.5 / 19.2.7, restic 0.19.1, Borg 1.4.5, borgmatic 2.2.0, Velero 1.18.4, rclone 1.76.0, Rook 1.21.2, Longhorn 1.13.0 (GitHub release pages and docs.ceph.com/releases, read today). Proxmox VE 9.2 ships Ceph Squid and Tentacle, not Umbrella: do not recommend Umbrella for PVE (devops-proxmox). Always compare with the installed version before using a flag.

## Overview

| Area | Decision in one line |
|------|----------------------|
| **Type** | Block for one VM/DB, file for shared POSIX, object for blobs and backups ([storage-selection.md](references/storage-selection.md)) |
| **ZFS** | Mirrors or raidz2 vdevs, `ashift` fixed at vdev creation, scrub monthly, snapshots are not backups |
| **Ceph** | 3 MON, replicated size 3 / min_size 2, failure domain host, never run above 85 percent |
| **Backup** | 3-2-1-1-0 policy, one immutable or offline copy, encryption on, restore test on a schedule |
| **Tools** | restic or Borg for hosts, Velero for Kubernetes objects, ZFS send for datasets, PBS for Proxmox guests |
| **Proof** | A backup that was never restored is a hope, not a backup ([restore-testing-dr.md](references/restore-testing-dr.md)) |

## Critical Rules

1. **Read-only first** - `zpool status`, `zfs list -t all`, `ceph -s`, `restic snapshots`, `velero backup get` before any change
2. **Dry-run before every destroy** - `zfs destroy -nv`, `restic forget --dry-run`, `borg prune --dry-run`, `ceph orch apply ... --dry-run`
3. **Destructive commands are proposed, not run** - ACTION / EFFECT / PROOF / WAIT-FOR-GO ([zfs-destructive-ops.md](references/zfs-destructive-ops.md), [ceph-destructive-ops.md](references/ceph-destructive-ops.md), [backup-destructive-ops.md](references/backup-destructive-ops.md))
4. **A snapshot on the same pool is not a backup** - it dies with the pool; the second copy sits on separate hardware
5. **Never print repository passwords, keys or S3 secrets** - files with mode 0600, `--password-file`, systemd credentials; names only in output
6. **Restore test before trust** - log the evidence (date, source, target, checksum, duration) per run
7. **Never invent a flag** - cite the page; unknown means "not verified"

## Architecture

```
/etc/backup/
├── restic.env            # RESTIC_REPOSITORY, RESTIC_PASSWORD_FILE (mode 0600, root)
├── restic.pass           # repository password file, never in Git
└── excludes.txt
/usr/local/sbin/restic-backup.sh      # nightly backup + check subset
/usr/local/sbin/restic-maintenance.sh # weekly forget --dry-run, prune after go
/etc/systemd/system/restic-backup.{service,timer}
```

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Storage type** | [storage-selection.md](references/storage-selection.md) | Block/file/object, local/shared/distributed |
| **NFS and iSCSI** | [nfs-iscsi.md](references/nfs-iscsi.md) | Exports, mount options, LUN basics |
| **Object storage** | [object-storage-s3.md](references/object-storage-s3.md) | MinIO status, Garage, SeaweedFS, Ceph RGW |
| **Kubernetes storage** | [kubernetes-storage-pointers.md](references/kubernetes-storage-pointers.md) | CSI, Rook-Ceph, Longhorn |
| **ZFS pools** | [zfs-pools-datasets.md](references/zfs-pools-datasets.md) | vdev layouts, ashift, ARC, datasets |
| **ZFS snapshots** | [zfs-snapshots-replication.md](references/zfs-snapshots-replication.md) | Snapshots, holds, send/receive, scrub |
| **ZFS destructive** | [zfs-destructive-ops.md](references/zfs-destructive-ops.md) | destroy, rollback, receive -F, redundancy changes |
| **Ceph architecture** | [ceph-architecture-deploy.md](references/ceph-architecture-deploy.md) | Daemons, pools, CRUSH, cephadm |
| **Ceph operations** | [ceph-operations-health.md](references/ceph-operations-health.md) | Health states, capacity, OSD replacement |
| **Ceph destructive** | [ceph-destructive-ops.md](references/ceph-destructive-ops.md) | osd purge/destroy, pool delete |
| **Strategy** | [backup-strategy.md](references/backup-strategy.md) | 3-2-1-1-0, RPO/RTO, retention |
| **restic** | [restic.md](references/restic.md) | Host and S3/SFTP backups |
| **Borg** | [borg-borgmatic.md](references/borg-borgmatic.md) | Borg repos, borgmatic config |
| **Velero** | [velero-kubernetes-backup.md](references/velero-kubernetes-backup.md) | Cluster object and volume backup |
| **rclone / PBS** | [rclone-pbs-pointers.md](references/rclone-pbs-pointers.md) | Transport, Proxmox Backup Server |
| **Backup destructive** | [backup-destructive-ops.md](references/backup-destructive-ops.md) | forget --prune, borg prune/compact/delete, velero delete |
| **Restore and DR** | [restore-testing-dr.md](references/restore-testing-dr.md) | Restore tests, DR drill |
| **Capacity and SMART** | [capacity-smart-monitoring.md](references/capacity-smart-monitoring.md) | Fullness, SMART, alerts |

### Templates

| Template | When to Use |
|----------|-------------|
| [restic-backup.sh](references/templates/restic-backup.sh) | Nightly restic backup with check subset |
| [restic-backup.service](references/templates/restic-backup.service) / [.timer](references/templates/restic-backup.timer) | systemd units for the script |
| [restic-maintenance.sh](references/templates/restic-maintenance.sh) | Retention preview, prune only with `--apply` |
| [borgmatic-config.yaml](references/templates/borgmatic-config.yaml) | Borg via borgmatic with retention and checks |
| [zfs-snapshot-replicate.sh](references/templates/zfs-snapshot-replicate.sh) | Snapshot + incremental send with dry-run |
| [zfs-snapshot-policy.md](references/templates/zfs-snapshot-policy.md) | Snapshot/retention policy per dataset class |
| [velero-schedule.yaml](references/templates/velero-schedule.yaml) | Scheduled Kubernetes backup |
| [restore-test-checklist.md](references/templates/restore-test-checklist.md) | Evidence sheet for every restore test |
| [dr-runbook.md](references/templates/dr-runbook.md) | Disaster-recovery runbook skeleton |
| [backup-policy-table.md](references/templates/backup-policy-table.md) | Per-system RPO/RTO/retention table |

## Quick Reference

```bash
zpool status -v; zfs list -t all -o name,used,avail,refer   # ZFS state, read-only
zfs destroy -nv pool/ds@snap                                # dry run, deletes nothing
ceph -s; ceph health detail; ceph osd df                    # Ceph state, read-only
restic -r "$REPO" snapshots; restic -r "$REPO" check        # repository state
restic -r "$REPO" forget --keep-daily 7 --dry-run           # preview, removes nothing
borg prune -v --list --dry-run --keep-daily=7 "$REPO"       # preview, removes nothing
velero backup get; velero restore create --from-backup NAME # Kubernetes
```

## Best Practices

### DO
- Keep at least one copy off-site and one copy the production credentials cannot delete (append-only, object lock or offline)
- Alert on "no successful backup in N hours", not only on job failure
- Pin tool versions in the backup host image and test restores after every upgrade
- Record every restore test in the checklist template

### DON'T
- Treat RAID, ZFS mirrors, Ceph replicas or snapshots as backups
- Run `restic forget --prune`, `borg prune` or `zfs destroy` from cron without a retention review
- Fill a pool or Ceph cluster above 80-85 percent
- Put repository passwords on a command line or in Git
