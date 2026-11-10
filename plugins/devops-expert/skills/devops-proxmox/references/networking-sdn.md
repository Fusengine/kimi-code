---
name: networking-sdn
description: Proxmox VE host networking (Linux bridges, VLAN-aware bridges, bonds, interface name pinning) and the SDN stack (zones, VNets, subnets, fabrics)
when-to-use: Editing /etc/network/interfaces on a node, adding VLANs for guests, renamed NICs after an upgrade, or building SDN zones/VNets
keywords: vmbr0, bridge-vlan-aware, bridge-vids, ifupdown2, ifreload, interfaces.new, pve-network-interface-pinning, SDN, zone, vnet, EVPN, VXLAN, fabric
priority: high
related: firewall.md, safe-change-protocol.md
---

# Host Networking and SDN

**Load when:** changing a node's network, giving guests VLANs, fixing NIC names after a kernel/major upgrade, or creating SDN zones and VNets. Generic Linux networking, nftables, DNS and TLS belong to skill `devops-networking`.

## Host networking model

- Guests attach to Linux bridges (`vmbrX`); bonds and VLANs stack under them. Open vSwitch is rarely needed (https://pve.proxmox.com/wiki/Migrate_to_Proxmox_VE).
- The GUI/API writes `/etc/network/interfaces.new`; `ifupdown2` (default since 7.0) applies it live. After a manual edit of `/etc/network/interfaces`: `ifreload -a`. A reboot also commits `interfaces.new` (https://pve.proxmox.com/pve-docs/chapter-sysadmin.html).
- Guest VLAN options: VLAN-aware bridge (tag per vNIC, recommended), "traditional" per-VLAN bridges (`vmbr0v5` created on demand), OVS, or VLANs inside the guest.

## VLAN-aware bridge, management on VLAN 5 (documented example)

```text
auto lo
iface lo inet loopback

iface eno1 inet manual

auto vmbr0.5
iface vmbr0.5 inet static
        address  10.10.10.2/24
        gateway  10.10.10.1

auto vmbr0
iface vmbr0 inet manual
        bridge-ports eno1
        bridge-stp off
        bridge-fd 0
        bridge-vlan-aware yes
        bridge-vids 2-4094
```

Guest NIC on VLAN 30: `qm set <vmid> --net0 virtio,bridge=vmbr0,tag=30` (`tag` and `trunks` are `--net[n]` properties, https://pve.proxmox.com/pve-docs/qm.1.html). Full file with a bond: [templates/vlan-aware-bridge.md](templates/vlan-aware-bridge.md).

## Interface names change (kernel or major upgrade)

New kernels can rename NICs; a bridge pointing at a vanished name loses the node's network. Pin names before upgrading:

```bash
pve-network-interface-pinning generate                 # .link files, names nic1, nic2...
pve-network-interface-pinning generate --interface enp1s0 --target-name if42
diff -y /etc/network/interfaces /etc/network/interfaces.new   # review before reboot
```

It rewrites `/etc/network/interfaces`, `host.fw`, SDN `controllers.cfg` and `fabrics.cfg` (as `.new` files) but **not** `/etc/pve/firewall/cluster.fw`. A reboot applies it; to revert before reboot, delete the `.new` files and the generated files in `/usr/local/lib/systemd/network`. Alternative: kernel parameter `net.naming-scheme=<version>` (https://pve.proxmox.com/pve-docs/chapter-sysadmin.html).

## SDN

Source: https://pve.proxmox.com/pve-docs/chapter-pvesdn.html

Support status (9.2.13): core SDN (VNets, zones, integration) **fully supported**; IPAM/DHCP **tech preview**; FRRouting-based routing and controllers **tech preview**.

| Zone type (`type`) | Use | Notes |
|--------------------|-----|-------|
| `simple` | Isolated per-node bridge, NAT/routed | Only zone with automatic DHCP |
| `vlan` | VLANs over an existing bridge on every node | Bridge must exist on all zone nodes |
| `qinq` | Stacked VLANs | Switches must support it; MTU minus 4 |
| `vxlan` | L2 over UDP 4789 | No encryption; MTU minus 50 |
| `evpn` | VXLAN + BGP, routable L3, anycast gateway | Needs `frr-pythontools`, `frr.service` enabled |

Prerequisites on every node: `libpve-network-perl` (default since 8.1), `ifupdown2`, and the line `source /etc/network/interfaces.d/*` at the end of `/etc/network/interfaces`.

```bash
pvesh create /cluster/sdn/zones --zone lab --type vlan --bridge vmbr0
pvesh create /cluster/sdn/vnets --vnet v30 --zone lab --tag 30
pvesh set /cluster/sdn            # PUT /cluster/sdn = "Apply sdn controller changes && reload"
```

Changes are recorded as **pending** in `/etc/pve/sdn` and applied cluster-wide at once; the applied state is tracked in `.running-config` and `.version`. Parameter names above come from the API schema (https://pve.proxmox.com/pve-docs/api-viewer/). 9.2 adds WireGuard and BGP fabrics, route maps and prefix lists, IPv6 EVPN underlay, and a dry-run of SDN changes (Roadmap).

## Verification

```bash
ip -br link ; bridge vlan show          # bridge ports and allowed VLANs
ifreload -a -s                           # syntax check without applying (ifupdown2)
pvesh get /cluster/sdn/vnets
```

Then ping the gateway from a test guest on each VLAN/VNet.

## Pitfalls

- Editing the management bridge over the same SSH session without console access or a timed rollback: one typo isolates the node. Follow [safe-change-protocol.md](safe-change-protocol.md).
- VXLAN across sites without a VPN: traffic is unencrypted.
- MTU not lowered for VXLAN/QinQ: silent fragmentation and stalls.
- 9.0 changed the default for the VirtIO vNIC MTU field (Roadmap, 9.0 known issues): re-check MTU-sensitive setups after upgrading.

## Not verified

- `ifreload -a -s` (syntax-only flag) is ifupdown2 behaviour, not stated on the Proxmox pages read; confirm with `ifreload --help` on the node.
- The API/CLI parameter for the 9.2 SDN dry-run.
