---
name: devops-virtualization
description: Use when working with plain KVM/QEMU and libvirt (virsh, virt-install, domain XML, pools, networks, snapshots, live migration), KVM performance tuning (virtio, CPU model, hugepages, NUMA, pinning), PCI/GPU passthrough prerequisites, the QEMU guest agent, qemu-img formats, Incus or LXC system containers and VMs (including LXD to Incus migration), cloud-init NoCloud, or building images with Packer or virt-customize. Not for Proxmox VE tooling (devops-proxmox), OpenStack Nova/Glance (devops-openstack), application containers (devops-docker), Terraform/OpenTofu providers (devops-iac) or ZFS/Ceph internals (devops-storage-backup).
versions:
  libvirt: "12.9.0 (2026-11-02)"
  qemu: "11.1.3 (2026-10-28); 11.0.5 stable"
  incus: "7.0.2 LTS (2026-10-16); 7.6 feature (2026-10-30)"
  cloud-init: "26.2"
  packer: "1.16.2 (BSL 1.1, IBM); qemu plugin 1.1.8; proxmox plugin 1.2.4"
references:
  - references/libvirt-domains.md
  - references/libvirt-storage-networks.md
  - references/snapshots-migration.md
  - references/kvm-performance.md
  - references/pci-gpu-passthrough.md
  - references/guest-agent.md
  - references/qemu-img-formats.md
  - references/cloud-init-nocloud.md
  - references/cloud-init-debug.md
  - references/incus-core.md
  - references/incus-profiles-lxd-migration.md
  - references/packer-images.md
  - references/virt-customize-builder.md
  - references/safe-change-protocol.md
  - references/templates/virt-install-cloud-image.md
  - references/templates/nocloud-user-data.yaml
  - references/templates/nocloud-meta-data.yaml
  - references/templates/nocloud-network-config.yaml
  - references/templates/libvirt-bridge-network.xml
  - references/templates/libvirt-nat-network.xml
  - references/templates/libvirt-dir-pool.xml
  - references/templates/libvirt-domain-tuned.xml
  - references/templates/incus-profile.yaml
  - references/templates/incus-launch-sequence.md
  - references/templates/packer-qemu-cloudimg.pkr.hcl
  - references/templates/packer-proxmox-clone.pkr.hcl
related-skills:
  - devops-proxmox
  - devops-linux
  - devops-networking
  - devops-storage-backup
  - devops-iac
  - devops-ansible
  - devops-cicd
  - devops-docker
  - devops-openstack
  - devops-observability
  - devops-secrets
  - devops-sre-ops
---

<objective>
Covers virtualization below and beside the platforms - KVM/QEMU with libvirt, KVM performance
tuning, PCI passthrough prerequisites, the guest agent, disk image formats, Incus/LXC system
containers and VMs, cloud-init NoCloud, and image building with Packer or libguestfs tools - always
through read-only discovery, dry run, one go, a safety net, verification and a ready rollback. Does
not cover Proxmox VE tooling (devops-proxmox), OpenStack (devops-openstack), application
containers (devops-docker), IaC providers (devops-iac) or ZFS/Ceph internals (devops-storage-backup).
</objective>

# Virtualization (KVM, libvirt, Incus, cloud-init, Packer)

## Agent Workflow (MANDATORY)

Before ANY change on a hypervisor host or image pipeline, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find local XML, Packer templates, cloud-init data, Ansible/Terraform touching the same hosts
2. **research-expert** - re-read the release pages (https://libvirt.org/news.html, https://www.qemu.org/download/, https://github.com/lxc/incus/releases) and the man page of every command you will run
3. **mcp__context7__query-docs** (`/libvirt/libvirt`, `/lxc/incus`, `/websites/linuxcontainers`) - confirm each option before writing it

On a live host, Phase A discovery is read-only ([safe-change-protocol.md](references/safe-change-protocol.md)). After file changes in a repo, run **sniper**.

---

## Overview

| Area | What matters on 2026-11-10 |
|------|----------------------------|
| **libvirt/QEMU** | libvirt 12.9.0, QEMU 11.1.3; `qemu:///system` is root-equivalent; modular `virt*d` daemons are replacing `libvirtd` |
| **Hard stop vs delete** | `virsh destroy` is a power-cord pull, `undefine` removes the definition, `--remove-all-storage` deletes disks: three different things |
| **Incus** | LTS 7.0.2 for production, 7.6 feature releases monthly; `lxd-to-incus` migrates LXD 4.0-5.21 |
| **cloud-init** | 26.2; NoCloud seed = drive labelled `CIDATA`; runs once per `instance-id`; network-config v2 with `routes` |
| **Packer** | 1.16.2 under BSL 1.1 (IBM); internal use is allowed by the grant; QEMU and Proxmox plugins via `required_plugins` |
| **Images** | qcow2 overlays depend on their base; in-place `qemu-img`/`virt-customize` operations need a copy first |

---

## Critical Rules

1. **Read-only first** - `virsh list --all`, `dumpxml`, `domblklist`, `pool-list`, `qemu-img info --backing-chain`, `incus list` before any write; stop on inactive pools, missing paths, unknown snapshots.
2. **Never invent a command, flag or XML element** - everything used here comes from the man pages and docs listed under Sources in each reference; anything else goes under "Not verified".
3. **Destructive commands are proposed, never run on your own** - ACTION / EFFECT / PROOF / WAIT-FOR-GO for `destroy`, `undefine`, `--remove-all-storage`, `vol-delete`, `pool-delete`, `snapshot-revert`, `blockcommit`, `qemu-img` in-place operations, `virt-customize`/`virt-sysprep`, `incus delete --force`, `lxd-to-incus`; the go names the object.
4. **Back up before irreversible steps; snapshots are not backups** - copy the image, dump the XML, export the instance; a backup counts once restored.
5. **Pin the connection** - `virsh -c qemu:///system` and `incus` remote explicit; never rely on defaults.
6. **cloud-init data carries no secrets** - keys, not passwords; per-guest `instance-id`.
7. **One host at a time** with a console or a timed revert for network/storage edits.

---

## Architecture

```
/etc/libvirt/qemu/<dom>.xml        # domain definitions (edit with virsh edit, not by hand)
/etc/libvirt/qemu/networks/        # network definitions (virsh net-*)
<pool target>/<vol>.qcow2          # volumes; base images + overlays (qemu-img info --backing-chain)
/var/lib/libvirt/qemu/*.agent      # guest-agent sockets (unix channels)
incus: storage pools, incusbr0, profiles, instances   # `incus admin init`; groups incus-admin / incus
seed:  user-data, meta-data, network-config -> CIDATA drive | HTTP seed | virt-install --cloud-init
packer: *.pkr.hcl + *.pkrvars.hcl  -> output-<name>/<image>.qcow2 | Proxmox template
```
(Paths other than the pool target are libvirt conventions; confirm on the host.)

---

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **libvirt guests** | [libvirt-domains.md](references/libvirt-domains.md) | URIs, daemons, virsh lifecycle, virt-install, domain XML, destroy vs undefine |
| **Pools, volumes, networks** | [libvirt-storage-networks.md](references/libvirt-storage-networks.md) | Where disks live, NAT vs bridge, backing chains |
| **Snapshots & migration** | [snapshots-migration.md](references/snapshots-migration.md) | Restore points, blockcommit, live migration |
| **Performance** | [kvm-performance.md](references/kvm-performance.md) | virtio, CPU model, hugepages, NUMA, pinning, IOThreads |
| **Passthrough** | [pci-gpu-passthrough.md](references/pci-gpu-passthrough.md) | IOMMU groups, vfio-pci, hostdev |
| **Guest agent** | [guest-agent.md](references/guest-agent.md) | quiesce, domifaddr, shutdown, RPC lists |
| **Images** | [qemu-img-formats.md](references/qemu-img-formats.md) | convert, resize, commit, rebase, check |
| **cloud-init** | [cloud-init-nocloud.md](references/cloud-init-nocloud.md), [cloud-init-debug.md](references/cloud-init-debug.md) | seed files, network v2, golden image, debugging |
| **Incus** | [incus-core.md](references/incus-core.md), [incus-profiles-lxd-migration.md](references/incus-profiles-lxd-migration.md) | system containers/VMs, profiles, LXD/LXC migration |
| **Image building** | [packer-images.md](references/packer-images.md), [virt-customize-builder.md](references/virt-customize-builder.md) | Packer HCL, license, libguestfs route |
| **Safe change** | [safe-change-protocol.md](references/safe-change-protocol.md) | any write on a live host; destructive catalogue |

### Templates

| Template | When to Use |
|----------|-------------|
| [virt-install-cloud-image.md](references/templates/virt-install-cloud-image.md) | Cloud image + overlay + NoCloud seed in one `virt-install` |
| [nocloud-user-data.yaml](references/templates/nocloud-user-data.yaml), [nocloud-meta-data.yaml](references/templates/nocloud-meta-data.yaml), [nocloud-network-config.yaml](references/templates/nocloud-network-config.yaml) | NoCloud seed files (keys, packages, static IP) |
| [libvirt-bridge-network.xml](references/templates/libvirt-bridge-network.xml), [libvirt-nat-network.xml](references/templates/libvirt-nat-network.xml) | Host-bridge network; NAT network with static lease |
| [libvirt-dir-pool.xml](references/templates/libvirt-dir-pool.xml) | Directory storage pool |
| [libvirt-domain-tuned.xml](references/templates/libvirt-domain-tuned.xml) | Hugepages, pinning, IOThreads, NUMA fragment |
| [incus-profile.yaml](references/templates/incus-profile.yaml), [incus-launch-sequence.md](references/templates/incus-launch-sequence.md) | Profile with cloud-init; host to running instances |
| [packer-qemu-cloudimg.pkr.hcl](references/templates/packer-qemu-cloudimg.pkr.hcl), [packer-proxmox-clone.pkr.hcl](references/templates/packer-proxmox-clone.pkr.hcl) | Golden qcow2; Proxmox template via clone |

---

## Quick Reference

```bash
virsh -c qemu:///system list --all; virsh -c qemu:///system dumpxml <dom> > <dom>.before.xml   # state + rollback copy
virsh -c qemu:///system snapshot-create-as <dom> pre-change --disk-only --atomic --quiesce      # reversible safety net
qemu-img info --backing-chain <image>; qemu-img check <image>                                    # image state
virt-install --connect qemu:///system ... --print-xml                                            # preview, defines nothing
incus list; incus snapshot create <inst> pre-change                                              # Incus state + safety net
cloud-init schema -c user-data.yaml --annotate; cloud-init status --wait --long                  # seed validation / first-boot result
packer init . && packer validate .                                                               # image pipeline check
```

---

## Best Practices

### DO
- Thin overlays on a read-only base for fleets; `qemu-img info --backing-chain` before touching a base
- `virtio` disks/NICs, a bridge for LAN and migration, `host-model` when migrating
- `incus init`, set cloud-init, then `incus start`; LTS channel for production
- Rebuild golden images on a schedule; keep Packer/plugin versions pinned in `required_plugins`

### DON'T
- Use `virsh destroy` as a "delete", or add `--force`/`--remove-all-storage` to silence an error
- Edit a disk image while a guest has it open, or run `virt-customize` on a live guest
- Reuse an `instance-id` across clones, or put passwords in user-data
- Pass a device to a guest without checking its IOMMU group first
