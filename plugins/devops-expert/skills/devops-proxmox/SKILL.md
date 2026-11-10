---
name: devops-proxmox
description: Use when installing, operating or automating Proxmox VE 9.x - repositories, clusters and quorum (corosync, QDevice), HA and the Cluster Resource Scheduler, storage.cfg (LVM-thin, ZFS, Ceph, NFS, PBS), VLAN-aware bridges and SDN, the PVE firewall, VMs (qm) and containers (pct), cloud-init templates, pvesh/pveum and API tokens, backup jobs to Proxmox Backup Server, 8 to 9 upgrades (pve8to9), or importing VMs from ESXi. Not for ZFS/Ceph/PBS internals or restore drills (devops-storage-backup), plain KVM/libvirt/Incus/Packer (devops-virtualization), Terraform/OpenTofu providers (devops-iac) or generic nftables/DNS/TLS (devops-networking).
versions:
  proxmox-ve: "9.2"
  proxmox-ve-docs: "9.2.13"
  proxmox-backup-server: "4.2"
  ceph-on-pve: "20.2 Tentacle (default), 19.2 Squid"
references:
  - references/install-repositories.md
  - references/cluster-quorum.md
  - references/ha-crs.md
  - references/storage-model.md
  - references/networking-sdn.md
  - references/firewall.md
  - references/guests-qm-pct.md
  - references/api-access.md
  - references/backup-pbs.md
  - references/upgrade-migration.md
  - references/safe-change-protocol.md
  - references/templates/cloud-init-template.md
  - references/templates/vlan-aware-bridge.md
  - references/templates/api-token-least-privilege.md
  - references/templates/backup-job-pbs.md
  - references/templates/pre-upgrade-checklist.md
related-skills:
  - devops-storage-backup
  - devops-virtualization
  - devops-networking
  - devops-linux
  - devops-iac
  - devops-ansible
  - devops-observability
  - devops-secrets
  - devops-sre-ops
---

<objective>
Covers Proxmox VE 9.x as a platform - repositories, clusters, HA/CRS, the storage
model as PVE sees it, networking and SDN, the firewall, VM/CT lifecycle with
cloud-init, API automation and least-privilege access, backup jobs to PBS, major
upgrades and imports - always via read-only discovery, dry run, one go, safety
net, verification and a ready rollback. Does not cover ZFS/Ceph/PBS internals
(devops-storage-backup), generic KVM/libvirt (devops-virtualization), IaC
providers (devops-iac) or general nftables/DNS/TLS (devops-networking).
</objective>

# Proxmox VE

## Agent Workflow (MANDATORY)

Before ANY Proxmox change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find local IaC/Ansible/scripts touching PVE (`pvesh`, `qm`, `/etc/pve`, provider configs)
2. **research-expert** - re-read https://pve.proxmox.com/wiki/Roadmap (newer release? its known issues) and the man page of every command you will run
3. **mcp__context7__query-docs** (`/websites/pve_proxmox_pve-docs`, `/proxmox/pve-docs`) - confirm each option you are about to write

On a live host, Phase A discovery is read-only ([safe-change-protocol.md](references/safe-change-protocol.md)). After file changes in a repo, run **sniper**.

---

## Overview

| Area | What matters on 2026-11-10 |
|------|----------------------------|
| **Release** | PVE 9.2 (2026-05-21, Debian 13.5, kernel 7.0, QEMU 11.0); PVE 8 is EOL since 2026-08; PBS 4.2 |
| **Cluster/HA** | QDevice for even node counts only; HA groups -> affinity rules; CRS `dynamic` + auto-rebalance (HA guests only); `disarm-ha`/`arm-ha` |
| **Storage** | GlusterFS dropped in 9.0; snapshots as volume chains are tech preview; Ceph Tentacle is the default for new installs |
| **Network/Firewall** | Core SDN supported, IPAM/DHCP and FRR tech preview; pin NIC names; nftables `proxmox-firewall` tech preview |
| **Guests** | OCI-image containers tech preview; privileged CTs need `Sys.Modify`; cgroup v1 gone |

---

## Critical Rules

1. **Read-only first** - `pveversion`, `pvecm status`, `ha-manager status`, `pvesm status`, `qm list`, `pct list` before any write; stop on lost quorum, fenced HA services or inactive storage.
2. **Never invent a command, option or API path** - every one used here is from the man pages, the admin guide or the API viewer (docs 9.2.13); anything else goes under "Not verified".
3. **Destructive and cluster-breaking commands are proposed, never run on your own** - `qm destroy`, `pct destroy`, `pvecm delnode`, `pvecm expected`, `pvesm remove`/`free`, `zfs destroy`, `pveceph osd destroy`, edits to `/etc/pve/corosync.conf`, `disarm-ha`: state the exact effect and quorum impact, then wait for the user's go naming the object.
4. **A verified backup precedes every irreversible step** - snapshot for reversible guest changes, `vzdump --protected 1` before destroy/upgrade; a backup counts once a restore was tested.
5. **One node at a time, always with a way back** - upgrades, reboots, network and firewall changes; console access or a timed revert; quorum and HA checked between nodes.
6. **Tech preview is said out loud** - nftables firewall, SDN IPAM/DHCP/FRR, OCI app containers, volume-chain snapshots, BTRFS.

---

## Architecture

```
/etc/pve/                          # pmxcfs, replicated cluster-wide, read-only without quorum
├── corosync.conf                  # membership + links (edit a copy, bump config_version)
├── storage.cfg                    # every storage definition
├── datacenter.cfg                 # crs:, migration, defaults
├── jobs.cfg                       # backup jobs (pvescheduler)
├── qemu-server/ lxc/              # <vmid>.conf of this node's VMs / CTs
├── firewall/ nodes/<node>/host.fw # cluster.fw, <vmid>.fw, host rules
├── sdn/                           # zones, vnets, subnets, fabrics (+ .running-config)
└── priv/                          # keys, storage passwords (root only)
/etc/network/interfaces(.new)      # node networking (ifupdown2, ifreload -a)
/etc/apt/sources.list.d/*.sources  # deb822 repositories
```

---

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Install & repos** | [install-repositories.md](references/install-repositories.md) | Versions/EOL, enterprise vs no-subscription, deb822, apt 401 |
| **Cluster & quorum** | [cluster-quorum.md](references/cluster-quorum.md) | create/join, QDevice, delnode, expected votes, corosync.conf |
| **HA & CRS** | [ha-crs.md](references/ha-crs.md) | HA resources, affinity rules, fencing, rebalancing, maintenance |
| **Storage** | [storage-model.md](references/storage-model.md) | storage.cfg, type choice, pvesm, removal semantics |
| **Network & SDN** | [networking-sdn.md](references/networking-sdn.md) | bridges, VLANs, NIC pinning, zones/VNets |
| **Firewall** | [firewall.md](references/firewall.md) | enabling without lockout, guest rules, nftables preview |
| **VMs & CTs** | [guests-qm-pct.md](references/guests-qm-pct.md) | qm/pct lifecycle, cloud-init, destroy semantics |
| **API & access** | [api-access.md](references/api-access.md) | pvesh, pveum, roles, ACLs, API tokens |
| **Backups** | [backup-pbs.md](references/backup-pbs.md) | vzdump modes, jobs, retention, PBS storage, encryption |
| **Upgrade & import** | [upgrade-migration.md](references/upgrade-migration.md) | pve8to9, minor updates, ESXi/OVF/disk import |
| **Safe change** | [safe-change-protocol.md](references/safe-change-protocol.md) | any write on a live node; destructive command catalogue |

### Templates

| Template | When to Use |
|----------|-------------|
| [cloud-init-template.md](references/templates/cloud-init-template.md) | Build a cloud-init VM template and deploy clones |
| [vlan-aware-bridge.md](references/templates/vlan-aware-bridge.md) | Bond + VLAN-aware `vmbr0` + corosync NIC, with timed revert |
| [api-token-least-privilege.md](references/templates/api-token-least-privilege.md) | Automation user, role, pool, privsep token with expiry |
| [backup-job-pbs.md](references/templates/backup-job-pbs.md) | Attach PBS with encryption, scheduled job with retention |
| [pre-upgrade-checklist.md](references/templates/pre-upgrade-checklist.md) | 8.4 to 9.x upgrade, cluster and per-node evidence |

---

## Quick Reference

```bash
pveversion; pvecm status; ha-manager status; pvesm status; qm list; pct list   # read-only state
pvesh get /cluster/resources --output-format json-pretty                       # whole cluster inventory
qm snapshot <vmid> pre-change && qm config <vmid>                               # reversible safety net
vzdump <vmid> --storage <pbs-id> --mode snapshot --protected 1                  # irreversible-step safety net
pve8to9 --full; pve-firewall status                                             # upgrade checklist; firewall compile check
```

---

## Best Practices

### DO
- Enterprise repository in production, same subscription level on every node
- Corosync on its own NIC plus a second link on another physical network
- Groups, pools and privilege-separated, expiring API tokens for access
- `protection 1` on critical guests; pin NIC names before kernel or major upgrades

### DON'T
- Power a deleted node back on with its old config; enable a `DROP` input policy before the `management` IP set holds your admin addresses
- Treat `pvesm remove` as data deletion, or `pvesm free`/`qm destroy` as reversible
- Run Docker directly on the PVE host - use a VM
