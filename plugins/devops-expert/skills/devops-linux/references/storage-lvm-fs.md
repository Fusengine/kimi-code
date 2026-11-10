---
name: storage-lvm-fs
description: Disks, partitions, LVM, ext4/XFS grow, fstab entries and swap on a single host
when-to-use: Adding a disk, growing a volume, writing fstab, adding swap, full-disk triage
keywords: lsblk, blkid, findmnt, pvcreate, vgextend, lvextend, resizefs, xfs_growfs, resize2fs, fstab, nofail, swap
priority: high
related: perf-troubleshooting.md
---

# Storage: Partitions, LVM, Filesystems, fstab

**Load when:** a disk is added, a filesystem is full, or an fstab line is written.
ZFS, Ceph, NFS servers and backups belong to **devops-storage-backup**.

Sources (read 2026-11-10): https://man7.org/linux/man-pages/man8/lvextend.8.html, `lvcreate.8`, `lvresize.8`,
`pvcreate.8`, `vgcreate.8`, `vgextend.8`, `lvremove.8`, `xfs_growfs.8`, `resize2fs.8`, `lsblk.8`, `findmnt.8`,
`mount.8`, `swapon.8`, https://man7.org/linux/man-pages/man5/fstab.5.html,
https://www.freedesktop.org/software/systemd/man/latest/systemd.mount.html.

## Discovery (read-only, always first)

```bash
lsblk -f                      # tree: disks, partitions, LVs, FS type, UUID, mountpoint
findmnt -D                    # mounted filesystems with usage
pvs; vgs; lvs                 # LVM state (VFree = room to grow)
df -hT; df -i                 # space and inodes
cat /etc/fstab
```

Identify the target by **WWN/by-id + size** (`lsblk -o NAME,SIZE,MODEL,WWN`, `ls -l /dev/disk/by-id/`;
`lsblk --list-columns` shows what else is available), never by `/dev/sdX` alone - names can change
between boots.

## Decision Rules

| Situation | Action |
|-----------|--------|
| LV full, VG has free extents | `lvextend -r -l +100%FREE vg/lv` (grows LV and FS together) |
| LV full, VG full | add a disk -> `pvcreate` -> `vgextend` -> `lvextend -r` |
| VM disk enlarged by the hypervisor | grow the partition (growpart / parted, see Not verified) -> `pvresize` -> `lvextend -r` |
| Need to shrink | ext4: offline only (`resize2fs` shrinks unmounted FS); XFS: treat as grow-only (only shrinking inside the last AG is implemented) |
| Non-critical mount (data disk, NFS) | `nofail` in fstab so boot does not hang |
| Network FS used rarely | `x-systemd.automount` + `x-systemd.idle-timeout=` |

## Grow Online

```bash
lvextend -r -L +20G vg0/data          # -r|--resizefs calls the FS resizer
# Manual equivalent if the LV was already extended:
xfs_growfs /srv/data                  # XFS: takes the MOUNT POINT, FS must be mounted
resize2fs /dev/vg0/data               # ext4: grows a mounted FS online
```

## New Volume End-to-End

```bash
pvcreate /dev/disk/by-id/<id>
vgcreate vg_data /dev/disk/by-id/<id>
lvcreate -n srv -l 100%FREE vg_data
# create the filesystem with the mkfs.<type> tool for xfs or ext4 - DESTRUCTIVE, see below
blkid /dev/vg_data/srv                # copy the UUID
```

fstab line (use `UUID=`, never `/dev/sdX`):

```text
UUID=<uuid>  /srv  xfs  defaults,nofail,x-systemd.device-timeout=30s  0  0
```

Fields: device, mount point, type, options, dump, fsck pass (`1` root, `2` other checked filesystems,
`0` or absent = never checked at boot).

## Swap

```bash
swapon --show                         # current swap
# File-based swap: allocate, chmod 600, mkswap, swapon; persist with an fstab line "<file> none swap defaults 0 0"
```

Tuning `vm.swappiness` lives in [kernel-sysctl-limits.md](kernel-sysctl-limits.md).

## Destructive Operations

| Command | Exact effect | Rule |
|---------|--------------|------|
| `mkfs.*` / `mkswap` on a device | writes a new filesystem/swap signature - existing data is gone | confirm device by serial + `lsblk -f` showing no FS, propose, wait for the go |
| `wipefs -a` | erases all filesystem/RAID/partition-table signatures | same; `wipefs` without `-a` only lists |
| `dd of=/dev/...` | overwrites the raw device | never on a guessed device name |
| partition tools (`fdisk`, `sfdisk`, `parted`, `sgdisk`) | rewrite the partition table | dump the table first (`sfdisk -d /dev/X > table.bak`) |
| `lvremove vg/lv` | deletes the LV and its data | `lvs` + `findmnt` showing it unmounted, backup proven, propose, wait for the go |
| `lvreduce` / `lvresize -L -<size>` | truncates the LV; FS corruption if the FS was not shrunk first | ext4 only, offline, `-r`, backup first |
| `vgremove` / `pvremove` | destroys LVM metadata | same |

## Verification

```bash
findmnt --verify                      # parses and checks /etc/fstab
mount -a && findmnt /srv              # mounts all non-noauto entries now
systemctl daemon-reload               # regenerate mount units after editing fstab
df -hT /srv; lvs vg_data
```

## Pitfalls

- Editing fstab and rebooting without `findmnt --verify` + `mount -a` - emergency shell at boot
- Forgetting `nofail` on a secondary disk - boot waits then drops to emergency mode
- `lvextend` without `-r` - LV grows, filesystem does not (`df` unchanged)
- `xfs_growfs` on an unmounted filesystem - it must be mounted to be grown
- `systemctl daemon-reload` skipped after an fstab edit - generators keep the old mount units

## Not verified

- `growpart` (cloud-utils) and `parted resizepart` syntax - read their man pages on the host before use
- `sfdisk -d` dump syntax was not re-read this session (`sfdisk --help`)
- `pvresize`, `vgremove`, `pvremove`, `wipefs` pages were not fetched this session
