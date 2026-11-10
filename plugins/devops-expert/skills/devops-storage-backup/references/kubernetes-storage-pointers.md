---
name: kubernetes-storage-pointers
description: Where Kubernetes storage backends fit - CSI, Rook-Ceph, Longhorn - and which skill owns which part
when-to-use: Choosing a storage backend for a cluster or deciding how cluster data is backed up
keywords: csi, rook, rook-ceph, longhorn, cephblockpool, storageclass, volumesnapshot, velero, backup
priority: medium
related: velero-kubernetes-backup.md, ceph-architecture-deploy.md, storage-selection.md
---

# Kubernetes Storage: Pointers

**Load when:** a Kubernetes cluster needs a storage backend or its volumes need protection. PV/PVC/StorageClass mechanics, reclaim policy, expansion and snapshots-as-API belong to `devops-kubernetes` (`references/storage-csi.md`); cluster lifecycle and etcd to `devops-k8s-cluster`.

## Backends

| Backend | What it is | Choose when | Watch |
|---------|-----------|-------------|-------|
| **Rook-Ceph** (1.21.2) | Operator that deploys and manages Ceph inside the cluster; RBD block, CephFS, RGW object | 3+ nodes with spare raw disks, need block + file + object | Needs its own failure-domain thinking; removing OSDs follows Ceph rules ([ceph-destructive-ops.md](ceph-destructive-ops.md)) |
| **Longhorn** (1.13.0) | Distributed block storage built for Kubernetes | Simple replicated RWO volumes, built-in backup to S3/NFS | v1.13.0 requires Kubernetes v1.34 or later (release notes) |
| **External Ceph / NFS / SAN CSI** | Cluster consumes storage run elsewhere | Storage team already exists | The cluster backup must still cover the data |
| **Local PV** | Disk on the node | Latency-critical, app replicates itself | Node loss means data loss |

## Rook-Ceph shape (from the Rook block-storage docs)

A `CephBlockPool` (`ceph.rook.io/v1`, `failureDomain: host`, `replicated.size: 3`) plus a `StorageClass` whose provisioner is `rook-ceph.rbd.csi.ceph.com`, `reclaimPolicy: Delete` and `allowVolumeExpansion: true` in the sample. For data that must survive PVC deletion use `Retain` (see `devops-kubernetes`). Rook requires at least 1 OSD on each of 3 different nodes for that pool. Operations run from the Rook toolbox pod with the same `ceph` commands as [ceph-operations-health.md](ceph-operations-health.md).

## What protects cluster data

| Layer | Tool | Reference |
|-------|------|-----------|
| Kubernetes objects + PV data | Velero | [velero-kubernetes-backup.md](velero-kubernetes-backup.md) |
| etcd | etcd snapshot | `devops-k8s-cluster` |
| Application databases | Logical dump / PITR | `devops-databases` |
| Backend replication (Ceph, Longhorn replicas) | Availability, not backup | [backup-strategy.md](backup-strategy.md) |

## Sources

- https://github.com/rook/rook/releases/tag/v1.21.2 and https://github.com/longhorn/longhorn/releases/tag/v1.13.0 (read 2026-11-10)
- Rook block-storage and OSD-management docs via Context7 `/rook/rook` (https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Block-Storage-RBD/block-storage.md and .../Advanced/ceph-osd-mgmt.md, read 2026-11-10)

## Not verified

- Kubernetes version support matrix of Rook 1.21 and Rook's minimum Ceph version: not read.
- Longhorn backup targets and recurring-job syntax: only the v1.13.0 release-note headline was read.
- Context7 listed Rook v1.19.6 as its newest indexed docs while GitHub shows 1.21.2; sample manifests may differ slightly in 1.21.
