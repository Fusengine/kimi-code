---
name: storage-selection
description: Choosing between block, file and object storage and between local, shared and distributed backends
when-to-use: Deciding where a workload's data should live, or reviewing a storage design before building it
keywords: block, file, object, local, shared, distributed, san, nas, zfs, ceph, nfs, iscsi, s3, rbd, cephfs
priority: high
related: nfs-iscsi.md, object-storage-s3.md, zfs-pools-datasets.md, ceph-architecture-deploy.md
---

# Choosing a Storage Type

**Load when:** a new workload needs persistent data, or a design review asks "why this storage".

## Type by access pattern

| Type | What the client sees | Use for | Typical backends |
|------|---------------------|---------|------------------|
| **Block** | A raw disk the client formats | One VM disk, one database, one pod volume (RWO) | local disk, ZFS zvol, Ceph RBD, iSCSI LUN, Longhorn |
| **File** | A POSIX tree shared by many clients | Shared home dirs, media, CI caches, RWX volumes | NFS, CephFS, ZFS dataset exported over NFS |
| **Object** | HTTP API (S3), no POSIX semantics | Backups, artifacts, logs, static assets, large blobs | Ceph RGW, Garage, SeaweedFS, public S3 |

Rule of thumb: databases want low-latency block; many writers of small files want a file system; anything append-once-read-many and large belongs in object storage.

## Placement: local, shared, distributed

| Placement | Strength | Cost | Pick when |
|-----------|----------|------|-----------|
| **Local** (ZFS/ext4/xfs on the node) | Lowest latency, simplest to reason about | Data dies with the node unless replicated or backed up | Single host, or the app replicates itself |
| **Shared** (NFS/iSCSI from a filer or SAN) | One place to back up, live migration possible | The filer is a single point of failure unless HA | Small clusters, VM live migration, known filer |
| **Distributed** (Ceph, Longhorn) | Survives node loss, scales out | Needs 3+ nodes, network, operations skill, spare capacity | Hyper-converged clusters, OpenStack, Kubernetes at scale |

## Decision order

1. **What is the recovery goal?** RPO/RTO from [backup-strategy.md](backup-strategy.md) decides replication versus backup; they are not substitutes.
2. **Does one node loss need zero downtime?** Yes means shared or distributed storage; no means local storage plus fast restore may be cheaper.
3. **How many nodes and what network?** Ceph needs at least 3 nodes in production and a dedicated, fast network; with fewer, use ZFS replication or a filer.
4. **Who operates it?** A distributed system you cannot repair at 03:00 is a risk; prefer the simpler one that meets the goal.

## Anti-patterns

| Anti-pattern | Why it fails |
|--------------|--------------|
| RAID or mirror counted as backup | Deletion, corruption and ransomware replicate instantly |
| Ceph on 2 nodes | No quorum-safe MON layout, `size 3` replicas cannot place |
| NFS for a database datadir | Locking and latency problems; use block |
| Object storage as a POSIX file system | Semantics differ (no rename, no append); use a file system |
| One shared pool for production and backups | One failure or one mistaken `destroy` removes both |

## Pointers (not covered here)

LVM, ext4/xfs, fstab, swap: `devops-linux`. PV/PVC/StorageClass: `devops-kubernetes`. Proxmox storage types: `devops-proxmox`. OpenStack Cinder with Ceph: `devops-openstack`.

## Sources

- https://openzfs.github.io/openzfs-docs/Basic%20Concepts/Pool%20Structure/Changing%20Pool%20Layout.html (read 2026-11-10 via Context7)
- https://docs.ceph.com/en/latest/releases/ (read 2026-11-10)

## Not verified

- The "at least 3 nodes" and "2-node Ceph" statements follow from the `size 3` / `min_size 2` pool defaults and 3-MON quorum; the Ceph hardware-recommendations page was not read today.
- The block/file/object table is a general classification, not taken from a single vendor page.
