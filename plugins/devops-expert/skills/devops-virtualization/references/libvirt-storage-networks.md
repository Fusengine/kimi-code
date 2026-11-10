---
name: libvirt-storage-networks
description: libvirt storage pools and volumes (dir, netfs, logical, zfs, rbd), qcow2 backing chains, and virtual networks (NAT, routed, isolated, existing host bridge) with exact virsh commands and removal semantics
when-to-use: Defining where guest disks live, creating or resizing volumes, or choosing how guests attach to the network (NAT vs host bridge)
keywords: pool-define-as, pool-start, pool-autostart, vol-create-as, vol-resize, vol-delete, vol-wipe, net-define, net-start, net-autostart, forward mode bridge, nat, dhcp host, backing store
priority: high
related: libvirt-domains.md, qemu-img-formats.md, snapshots-migration.md, safe-change-protocol.md
---

# libvirt Storage and Networks

**Load when:** creating pools/volumes or networks for libvirt guests. Host bridge creation (netplan, systemd-networkd, NetworkManager) belongs to `devops-networking`; ZFS/Ceph internals to `devops-storage-backup`.

## Storage pools

A pool is a place libvirt manages volumes. Types named in the virsh man page: `dir`, `fs`, `netfs`, `logical`, `disk`, `iscsi`, `zfs`, `rbd`, `gluster` (pool-define-as source options: `--source-host`, `--source-path`, `--source-dev`, `--source-name`, `--target`, `--source-format`).

| Need | Pool type | Note |
|------|-----------|------|
| Files on a local FS | `dir` | Simplest; qcow2/raw files; XML below |
| NFS shared between hosts (migration) | `netfs` | Same path on both hosts for shared-storage live migration |
| LVM volumes | `logical` | Volume group is the source |
| Ceph block | `rbd` | Details in `devops-storage-backup` |

```bash
virsh -c qemu:///system pool-define-as vmimages dir --target /srv/vm/images   # persistent definition
virsh -c qemu:///system pool-build vmimages          # dir pool: makes the target directory (no mkfs for fs pools unless --overwrite)
virsh -c qemu:///system pool-start vmimages
virsh -c qemu:///system pool-autostart vmimages
virsh -c qemu:///system pool-list --all ; virsh -c qemu:///system pool-info vmimages
```

XML form: [templates/libvirt-dir-pool.xml](templates/libvirt-dir-pool.xml). Define from file with `virsh pool-define <file>`.

### Pool removal semantics (do not confuse them)

| Command | Exact effect (man page) |
|---------|-------------------------|
| `pool-destroy <pool>` | Stops the pool; libvirt stops managing it; "the raw data contained in the pool is not changed" |
| `pool-undefine <pool>` | Removes the configuration of an inactive pool |
| `pool-delete <pool>` | "Destroy the resources used by a given pool object. This operation is non-recoverable" |

`pool-delete` is the destructive one: propose with the pool source and contents listed (`vol-list`), then wait for the go.

## Volumes

```bash
virsh -c qemu:///system vol-list vmimages --details
virsh -c qemu:///system vol-create-as vmimages web01.qcow2 20G --format qcow2          # new empty volume
virsh -c qemu:///system vol-create-as vmimages web01.qcow2 20G --format qcow2 \
  --backing-vol base-debian.qcow2 --backing-vol-format qcow2                         # thin clone on a base image
virsh -c qemu:///system vol-resize web01.qcow2 30G --pool vmimages                    # grow (shrink needs --shrink)
virsh -c qemu:///system vol-info web01.qcow2 --pool vmimages
```

- A backing-chain clone depends on its base: never modify, move or delete the base while clones exist; check with `qemu-img info --backing-chain` ([qemu-img-formats.md](qemu-img-formats.md)).
- Growing a volume does not grow the guest filesystem; do it inside the guest (cloud-init `growpart` handles the root disk on first boot of cloud images).
- `vol-delete <vol> --pool <pool>` deletes the data (the `--delete-snapshots` flag only works for rbd). `vol-wipe` overwrites before removal. Both: ACTION/EFFECT/PROOF/WAIT-FOR-GO, see [safe-change-protocol.md](safe-change-protocol.md).

## Virtual networks

| Mode | XML | Use |
|------|-----|-----|
| NAT | `<forward mode='nat'/>` + `<ip>` with `<dhcp>` | Lab, laptop; guests reach out, LAN cannot reach in |
| Routed | `<forward mode='route'/>` | Guests on their own subnet routed by the host |
| Isolated | no `<forward>` element | Guests and host only ("cannot reach any other machines on the LAN") |
| Existing host bridge | `<forward mode='bridge'/>` + `<bridge name='br0'/>` | Guests on the LAN; required for live migration |

```bash
virsh -c qemu:///system net-define labnet.xml       # inactive persistent network (--validate available)
virsh -c qemu:///system net-start labnet
virsh -c qemu:///system net-autostart labnet
virsh -c qemu:///system net-dhcp-leases labnet
```

Templates: [templates/libvirt-bridge-network.xml](templates/libvirt-bridge-network.xml) (host bridge), [templates/libvirt-nat-network.xml](templates/libvirt-nat-network.xml) (NAT with static DHCP host).

Attach a guest NIC: `<interface type='bridge'><source bridge='br0'/><model type='virtio'/></interface>` or, with a libvirt network, `<interface type='network'><source network='labnet'/>...`. `net-destroy` stops a network immediately (guests on it lose connectivity); `net-undefine` removes the definition (or makes an active network transient).

## Verification

```bash
virsh -c qemu:///system pool-info vmimages      # State: running, Autostart: yes
virsh -c qemu:///system net-info labnet         # Active: yes
virsh -c qemu:///system domiflist <dom>         # which network/bridge each NIC uses
ip -br link show master br0                     # tap devices attached to the bridge
```

## Pitfalls

- A pool left inactive at boot makes every guest using it fail to start: set `pool-autostart`.
- A bridged libvirt network does not create the bridge; the host bridge must already exist.
- NAT networks add firewall rules; running another firewall manager can fight them (`devops-networking`).
- Do not use a NAT network for guests that must be live-migrated between hosts with stable addresses.

## Sources

https://libvirt.org/manpages/virsh.html (pool-*, vol-*, net-* sections), https://libvirt.org/formatnetwork.html , https://libvirt.org/formatstorage.html (read 2026-11-10).

## Not verified

- Default pool name/path of the `default` pool on a distribution install.
- That `route` mode needs `ip_forward` set (general Linux; the page read was not searched for it).
- Behaviour of NAT networks alongside nftables/firewalld on each distribution (libvirt adds its own rules; not tested here).
