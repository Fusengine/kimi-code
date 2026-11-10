---
name: incus-core
description: Incus system containers and VMs - LTS vs feature releases, install and init, storage pools, bridge networks, images and remotes, launching containers and VMs, limits, snapshots, deletion semantics and live migration
when-to-use: Running Linux system containers or lightweight VMs on one host or an Incus cluster, instead of libvirt or Proxmox
keywords: incus, incus admin init, incus launch, incus init, --vm, images:, storage create, network create, incus-admin, snapshot, delete --force, security.protection.delete, migration.stateful, incus-agent
priority: high
related: incus-profiles-lxd-migration.md, cloud-init-nocloud.md, guest-agent.md, safe-change-protocol.md
---

# Incus: System Containers and VMs

**Load when:** the target runtime is Incus (CLI `incus`). Application containers are `devops-docker`; Proxmox LXC is `devops-proxmox`; raw KVM is [libvirt-domains.md](libvirt-domains.md).

## Versions and channels (verified 2026-11-10)

| Channel | Version | Date | Source |
|---------|---------|------|--------|
| LTS | 7.0.2 (7.0 line; 6.0 also LTS) | 2026-10-16 | https://github.com/lxc/incus/releases/tag/v7.0.2 ; LTS list in https://linuxcontainers.org/incus/docs/main/installing/ |
| Feature | 7.6 | 2026-10-30 | https://github.com/lxc/incus/releases/tag/v7.6.0 |

"LTS releases are recommended for production environments ... no new features added to an LTS release". Feature releases are monthly. Debian 13 ships native `incus` packages that "track the Incus LTS releases"; the Zabbly repository (https://github.com/zabbly/incus) provides current packages for Debian 11/12/13 and Ubuntu LTS 22.04/24.04/26.04. Ubuntu 24.04+ has a native `incus` package. Choose LTS for production hosts, a feature release only for a lab that needs a new feature.

## Install and first run

```bash
# Debian 13: apt install incus   (installs everything for containers and VMs)
# Access: root, or members of the incus-admin group (full control); the incus group is the restricted user access
# group membership applies at next login (or newgrp incus-admin)
incus admin init --minimal          # quick start: dir storage (slow, no quotas/fast snapshots)
incus admin init                    # interactive: storage (zfs or btrfs recommended), bridge, remote access, auto image update
incus --version ; incus list
```

`--minimal` is a test setup. For production: interactive init or `incus admin init --preseed` with a YAML file reviewed in Git. Loop-backed pools are for tests only ("slower and their size can't be reduced"). Preseed merges into existing entities and rolls back on conflict, but "the rollback process might potentially fail": do not preseed a live host without a backup.

## Storage and networks

```bash
incus storage create pool1 zfs source=/dev/sdX          # whole disk; other drivers: dir btrfs lvm ceph cephfs ...
incus storage list ; incus storage show pool1
incus network create labbr0 --type=bridge ipv4.address=10.20.0.1/24 ipv4.nat=true   # keys per https://linuxcontainers.org/incus/docs/main/reference/network_bridge/
incus network attach labbr0 <inst> eth0                 # give the device name; images auto-configure eth0
```

Create ZFS/btrfs/LVM on dedicated devices only after `lsblk` confirms they are empty; `source=` pointing at a disk is destructive to its content (see [safe-change-protocol.md](safe-change-protocol.md)). Ceph and ZFS internals: `devops-storage-backup`.

## Images and launching

```bash
incus remote list
incus image list images: debian                     # check which release aliases exist today
incus launch images:debian/12 c1                    # system container, starts immediately
incus init   images:debian/12/cloud c2              # create only: configure cloud-init, then start
incus launch images:debian/12 v1 --vm --device root,size=30GiB     # virtual machine with a bigger disk
incus launch images:debian/12 c3 --config limits.cpu=1 --config limits.memory=192MiB
incus launch images:debian/12 v2 --vm --profile default --profile <extra> --network labbr0 --storage pool1
incus exec c1 -- bash ; incus console v1 --type=vga ; incus info c1 --show-log
```

- `incus launch` = create + start; `incus init` = create only. Use `init` whenever cloud-init data must be set before first start (it only runs once).
- `images:` is the built-in remote; `/cloud` suffix selects cloud-init-enabled variants. OCI registries can be added with `incus remote add <name> <url> --protocol=oci` for application containers.
- Booting an ISO: `incus init iso-vm --empty --vm`, `incus storage volume import <pool> <iso> iso-volume --type=iso`, `incus config device add iso-vm iso-volume disk pool=<pool> source=iso-volume boot.priority=10`. Windows/BSD/macOS guests need `image.os` set (Incus create docs).
- VMs from `images:` ship `incus-agent` (exec, files, metrics work); other VMs: `incus config device add <inst> agent disk source=agent:config`, then run the installer from the mounted agent (see [guest-agent.md](guest-agent.md)).

Full sequence with a profile: [templates/incus-launch-sequence.md](templates/incus-launch-sequence.md).

## Snapshots, move, delete

```bash
incus snapshot create c1 clean ; incus snapshot restore c1 clean ; incus snapshot delete c1 clean
incus move  [src:]c1 target:        # container must be stopped; VM stopped unless migration.stateful=true (live)
incus copy  [src:]c1 target:        # duplicate
incus config set c1 security.protection.delete=true     # blocks accidental deletion
```

| ACTION | EFFECT | PROOF | WAIT-FOR-GO |
|--------|--------|-------|-------------|
| `incus delete <inst>` | "permanently deletes the instance and all its snapshots"; instance must be stopped | `incus info`, backup/export exists, `security.protection.delete` read (if true, someone set it on purpose: ask) | Required |
| `incus delete --force <inst>` | Same, and also removes a running instance (`-f, --force`: "Force the removal of running instances") with no shutdown | As above + owner confirms downtime and no open sessions | Required |
| `incus snapshot restore <inst> <snap>` | Instance returns to the snapshot state (`--stateful` restores running state); later changes are lost | Fresh snapshot of the current state first | Required |
| `incus rebuild <image> <inst>` / `--empty` | Wipes and re-initialises the root disk, keeps config; only without snapshots | Data on the root disk is disposable | Required |

A safe alias for interactive hosts: `incus alias add delete "delete -i"`.

Live migration: VMs need `migration.stateful=true` on the instance; containers have "limited support using CRIU" and should be stopped, moved, started. Transfer modes `--mode pull|push|relay`.

## Verification

```bash
incus list -c ns4tS            # state, IPv4, type, snapshots (column letters: check incus list --help)
incus info c1 | head -30
incus exec c1 -- cloud-init status --wait      # image with cloud-init
```

## Pitfalls

- `dir` default storage: no fast snapshots/quotas; switch pool driver before building a fleet (a pool's driver cannot be changed in place).
- Instance names are unique across a cluster; options set via profiles are not shown by `incus config show` without `--expanded`.
- Forgetting `--vm` creates a container, which shares the host kernel.

## Sources

https://linuxcontainers.org/incus/docs/main/ : installing, howto/initialize, howto/instances_create, howto/instances_manage, howto/instances_backup, howto/move_instances, howto/storage_pools, howto/network_create, howto/images_remote, reference/manpages/incus/delete (read 2026-11-10); releases pages on GitHub (dates).

## Not verified

- Which bridge keys are mandatory for your topology (only `ipv4.address` and `ipv4.nat` were read in the bridge reference).
- Available `images:` release aliases today (`debian/12` is the docs' example; list them first).
- `incus list -c` column letters.
- IncusOS (immutable Incus host OS) was seen in Context7 but not evaluated.
