---
name: zfs-pools-datasets
description: ZFS pool design - vdev layouts and their redundancy, ashift, datasets, ARC, TRIM, and the common mistakes
when-to-use: Designing or reviewing a ZFS pool, adding or replacing disks, tuning memory, or checking pool health
keywords: zpool, vdev, mirror, raidz, raidz2, draid, special vdev, ashift, arc, zfs_arc_max, autotrim, dataset, zvol
priority: critical
related: zfs-snapshots-replication.md, zfs-destructive-ops.md, capacity-smart-monitoring.md
---

# ZFS Pools and Datasets

**Load when:** creating a pool, adding capacity, replacing a disk or tuning ZFS. Version context: OpenZFS zfs-2.4.4 (2026-08-21).

## Vdev layouts (zpoolconcepts(7))

| Layout | Usable capacity | Survives | Notes |
|--------|----------------|----------|-------|
| `mirror` of N disks | one disk (X bytes) | N-1 failures | Best IOPS; grow by adding mirrors |
| `raidz1` (`raidz`) | (N-1)*X | 1 failure | Minimum devices = parity + 1; avoid on large disks |
| `raidz2` | (N-2)*X | 2 failures | Default pick for HDD capacity pools |
| `raidz3` | (N-3)*X | 3 failures | Very wide or very large disks |
| `draid1..3` | (N-S)*(D/(D+P))*X | P failures | Distributed hot spares, fast resilver; fixed stripe width wastes space on small blocks |
| `special` | metadata / small blocks | must be as redundant as the pool | Losing it loses the pool; mirror it |
| `log` (SLOG) | none | n/a | Helps synchronous writes only |
| `cache` (L2ARC) | none | n/a | Read cache; uses RAM for headers |
| `spare` | none | n/a | Hot spare |

The pool's redundancy is the redundancy of its **weakest top-level vdev**: every top-level vdev must be redundant on its own. The manual recommends 3 to 9 devices per raidz group, whole disks rather than files, and describes files as experimental only.

## Create

```bash
ls -l /dev/disk/by-id/ | grep -v part          # stable names, never /dev/sdX
zpool create -n -o ashift=12 tank mirror /dev/disk/by-id/ata-A /dev/disk/by-id/ata-B   # -n previews
zpool create -o ashift=12 tank mirror ... ; zpool set autotrim=on tank                 # after review
```

`zpool create -n` and `zpool add -n` print the configuration without writing it. `ashift` is a bit shift between 9 and 16 (12 = 4096-byte sectors), default 0 = auto-detect; set it explicitly at creation and when adding vdevs, because a mismatch cannot be undone and later blocks top-level vdev removal.

## Datasets

One dataset per workload so snapshot, quota and replication policy can differ.

```bash
zfs create -o compression=lz4 tank/data
zfs create -o quota=500G -o recordsize=16K tank/data/db     # DB dataset; value per engine docs
zfs create -V 100G tank/vm/vm-101-disk-0                     # zvol (block)
zfs get -r compression,recordsize,quota,used,available tank
```

Native encryption exists; with it, `zfs send -w` (raw) ships data without loading keys ([zfs-snapshots-replication.md](zfs-snapshots-replication.md)).

## ARC and memory

`zfs_arc_max` default `0` means: the larger of (all memory minus 1 GiB) and 5/8 of memory; minimum 64 MiB; it can be changed at runtime but cannot be set back to 0 while running, and lowering it does not shrink ARC without memory pressure. Read with `cat /sys/module/zfs/parameters/zfs_arc_max`. On hypervisors and database hosts, cap it explicitly so guests and the database keep their RAM.

## Operations that change the layout

| Task | Command | Rule |
|------|---------|------|
| Replace a failed disk | `zpool replace tank OLD NEW` | Watch `zpool status`; resilver must finish before the next change |
| Add a mirror/vdev | `zpool add -n tank mirror C D`, then without `-n` | Permanent; a raidz or draid pool can never remove a top-level vdev |
| Add a disk to a mirror | `zpool attach tank EXISTING NEW` | Raises redundancy |
| Remove a disk from a mirror | `zpool detach tank DISK` | Lowers redundancy |
| Remove a top-level vdev | `zpool remove -n -p tank VDEV` first | Only if no raidz/draid vdev, equal ashift, keys loaded, `device_removal` enabled |
| Checkpoint before a risky change | `zpool checkpoint tank` | While it exists, remove/attach/detach/split/reguid are refused; discard with `zpool checkpoint -d` |

Changing redundancy (detach, adding a non-redundant vdev, `zpool add -f`) is destructive-class: see [zfs-destructive-ops.md](zfs-destructive-ops.md).

## Common mistakes

| Mistake | Consequence |
|---------|-------------|
| `zpool add tank /dev/sdX` (single disk) on a mirror/raidz pool | Non-redundant top-level vdev; pool dies with that disk; on raidz it can never be removed |
| Forgetting `ashift` | Wrong sector alignment, performance loss, permanent |
| Using `/dev/sdX` names | Names change at reboot; use `/dev/disk/by-id` |
| No scrub schedule | Silent corruption found only at rebuild; see [zfs-snapshots-replication.md](zfs-snapshots-replication.md) |
| Snapshots as the only backup | Same pool, same failure |
| Special vdev without mirror | Single point of failure for all metadata |
| Huge raidz1 group of big disks | Second failure during resilver loses the pool |

## Sources

- https://openzfs.github.io/openzfs-docs/man/master/7/zpoolconcepts.7.html (read 2026-11-10)
- https://openzfs.github.io/openzfs-docs/Basic%20Concepts/Pool%20Structure/Changing%20Pool%20Layout.html , https://openzfs.github.io/openzfs-docs/man/v2.4/8/zpool-add.8.html , .../zpool-remove.8.html (via Context7, 2026-11-10)
- https://openzfs.github.io/openzfs-docs/man/v2.4/4/zfs.4.html (`zfs_arc_max`), https://openzfs.github.io/openzfs-docs/Project%20and%20Community/FAQ.html (ashift), https://openzfs.github.io/openzfs-docs/Basic%20Concepts/Operations/TRIM.html (autotrim, default off)
- https://github.com/openzfs/zfs/releases (zfs-2.4.4)

## Not verified

- `compression=lz4` and `recordsize=16K` for databases are common practice, not read from a page today; confirm in the engine's tuning guide.
- Pool fill threshold (80 percent) is a practice rule, not read from OpenZFS docs today.
- `zpool create -n` output format on 2.4.4 was not run (no storage commands against real hosts).
- RAIDZ expansion and `zpool attach` onto a raidz vdev: not read; do not assume.
