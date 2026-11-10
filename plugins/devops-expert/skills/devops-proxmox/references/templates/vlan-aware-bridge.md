---
name: vlan-aware-bridge
description: /etc/network/interfaces for a PVE node with an LACP bond, a VLAN-aware vmbr0, management on a VLAN, and a dedicated corosync NIC, applied with a safe rollback
keywords: /etc/network/interfaces, bond0, 802.3ad, vmbr0, bridge-vlan-aware, bridge-vids, ifreload, corosync link
---

# Template: VLAN-aware Bridge on a Bond

## Usage

Combines two documented examples from https://pve.proxmox.com/pve-docs/chapter-sysadmin.html ("VLAN aware Linux bridge" and "bond0 ... 802.3ad"). Adapt NIC names (`ip -br link`; pin them first with `pve-network-interface-pinning`, see [../networking-sdn.md](../networking-sdn.md)). The switch ports must be an LACP (802.3ad) group carrying the tagged VLANs. Apply only with console access or the timed rollback below.

## `/etc/network/interfaces`

```text
auto lo
iface lo inet loopback

iface eno1 inet manual

iface eno2 inet manual

# dedicated corosync link0 (no bridge, no other traffic)
auto eno3
iface eno3 inet static
        address  10.20.0.11/24

auto bond0
iface bond0 inet manual
        bond-slaves eno1 eno2
        bond-miimon 100
        bond-mode 802.3ad
        bond-xmit-hash-policy layer2+3

# management IP on VLAN 5, carried by the VLAN-aware bridge
auto vmbr0.5
iface vmbr0.5 inet static
        address  10.10.10.11/24
        gateway  10.10.10.1

auto vmbr0
iface vmbr0 inet manual
        bridge-ports bond0
        bridge-stp off
        bridge-fd 0
        bridge-vlan-aware yes
        bridge-vids 2-4094

# keep this line last if SDN is used
source /etc/network/interfaces.d/*
```

Guests: `qm set <vmid> --net0 virtio,bridge=vmbr0,tag=30`; containers: `pct set <vmid> --net0 name=eth0,bridge=vmbr0,tag=30,ip=dhcp`.

## Apply with an automatic revert

```bash
cp -a /etc/network/interfaces /root/interfaces.$(date +%F-%H%M).bak
# write the new file to /etc/network/interfaces.new, review:
diff -u /etc/network/interfaces /etc/network/interfaces.new
# schedule a revert in 5 minutes (needs the 'at' package)
echo "cp /root/interfaces.<stamp>.bak /etc/network/interfaces && ifreload -a" | at now + 5 minutes
mv /etc/network/interfaces.new /etc/network/interfaces
ifreload -a
```

From a **second** SSH session to the new management IP: `ip -br addr`, `bridge vlan show dev vmbr0`, `ping -c3 10.10.10.1`, `pvecm status` (cluster nodes still seen). Then cancel the revert: `atq` and `atrm <job>`.

## Verification

- `cat /proc/net/bonding/bond0`: mode IEEE 802.3ad, both slaves `MII Status: up`, same aggregator ID.
- A test guest on tag 30 reaches its gateway.
- `pvecm status` quorate; corosync uses `eno3` (`corosync-cfgtool -s`).

## Rollback

Without the timer: from the console, restore the `.bak` file and run `ifreload -a`.

## Not verified

- The combination bond + VLAN-aware bridge as one file is assembled from two documented examples, not printed as one example in the docs.
- `at`, `/proc/net/bonding`, `bridge vlan show` and `corosync-cfgtool -s` are standard Debian/Linux/corosync tools, not documented on the Proxmox pages read.
