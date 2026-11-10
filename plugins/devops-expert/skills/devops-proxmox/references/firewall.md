---
name: firewall
description: The Proxmox VE firewall - cluster/host/guest/VNet zones, config files, enabling without lockout, management IP set, ports, iptables vs nftables (tech preview)
when-to-use: Enabling or changing the PVE firewall, filtering guest traffic, opening access to the GUI/API, or evaluating proxmox-firewall (nftables)
keywords: pve-firewall, proxmox-firewall, cluster.fw, host.fw, VMID.fw, management, ipfilter, local_network, security group, nftables, 8006
priority: high
related: networking-sdn.md, safe-change-protocol.md
---

# PVE Firewall

**Load when:** enabling the firewall, writing rules for hosts or guests, locking down port 8006, or someone proposes the nftables backend. Host-level nftables rulesets outside PVE belong to skill `devops-networking`.

Source unless noted: https://pve.proxmox.com/pve-docs/chapter-pve-firewall.html (9.2.13).

## Model

| Level | File | Directions |
|-------|------|-----------|
| Datacenter (cluster-wide) | `/etc/pve/firewall/cluster.fw` | in, out, forward (forward: nftables only) |
| Host | `/etc/pve/nodes/<node>/host.fw` | in, out, forward (nftables only); host rules override datacenter rules |
| VM / CT | `/etc/pve/firewall/<VMID>.fw` | in, out |
| VNet (SDN) | per VNet | forward only, **nftables backend only** |

Files are replicated by pmxcfs; the service on each node recompiles rules on change. Sections: `[OPTIONS]`, `[RULES]`, `[IPSET <name>]`, `[GROUP <name>]`, `[ALIASES]`.

The firewall is **disabled by default**. Enabling it at datacenter level (`enable: 1`) blocks traffic to all hosts except the defaults below; a guest is filtered only if its vNIC has `firewall=1` and its own `.fw` enables it.

## Enable without locking yourself out

1. Keep an SSH session open to a node (documented advice) and have console/IPMI access.
2. Put admin source addresses into the `management` IP set first:

```text
# /etc/pve/firewall/cluster.fw
[IPSET management]
192.168.2.10
192.168.2.0/24

[OPTIONS]
enable: 1
policy_in: DROP
```

3. Check the auto-detected cluster network: `pve-firewall localnet` (alias `local_network`; a single host on a public network should set it explicitly in `[ALIASES]`).
4. Compile and check before relying on it: `pve-firewall compile` and `pve-firewall status` (status reads and compiles all rules and prints configuration errors).

## Defaults that stay open (policy DROP/REJECT)

Loopback, established connections, IGMP; from `management` hosts: TCP 8006 (GUI/API), 5900-5999 (VNC), 3128 (SPICE), 22 (SSH), 60000-60050 (migration); UDP 5405-5412 corosync and multicast inside the cluster network.

Ports used by PVE: 8006/tcp, 5900-5999/tcp, 3128/tcp, 22/tcp, 111/udp (rpcbind), 25/tcp outgoing, 5405-5412/udp, 60000-60050/tcp.

## Guest rules

```text
# /etc/pve/firewall/100.fw
[OPTIONS]
enable: 1
policy_in: DROP

[RULES]
IN SSH(ACCEPT) -source +management
IN HTTPS(ACCEPT)

[IPSET ipfilter-net0]
192.168.2.10
```

`ipfilter-net*` IP sets drop outgoing traffic whose source IP does not match the interface (anti-spoofing). The `blacklist` IP set is dropped by every host and guest. Macros (`SSH`, `HTTPS`, ...) are listed in the admin guide appendix "Firewall Macro Definitions". SDN generates IP sets `vnet-all`, `vnet-gateway`, `vnet-no-gateway`, `vnet-dhcp` per VNet (https://pve.proxmox.com/pve-docs/chapter-pvesdn.html).

## iptables (`pve-firewall`) vs nftables (`proxmox-firewall`)

`proxmox-firewall` is a **technology preview, "currently not suited for production use"**. The Roadmap aims to make it production-ready and eventually replace the iptables firewall (https://pve.proxmox.com/wiki/Roadmap). Do not present it as GA.

Lab only:

```bash
apt install proxmox-firewall
# per node: /etc/pve/nodes/<node>/host.fw  ->  [OPTIONS] nftables: 1
systemctl status proxmox-firewall
/usr/libexec/proxmox/proxmox-firewall compile > firewall.json   # debug: generated commands
```

After switching backends, **all running VMs and CTs must be restarted**. It manages tables `proxmox-firewall` and `proxmox-firewall-guests`; custom rules go in your own table.

## Verification

```bash
pve-firewall status        # running, no compile errors
iptables-save | head       # iptables backend: rules present
```

From an address outside `management`, port 8006 must be refused; from inside, reachable.

## Pitfalls

- `policy_in: DROP` at datacenter level with an empty `management` set and a remote admin: lockout.
- Forward and VNet rules on the iptables backend are **silently ignored**.
- Interface names in `cluster.fw` are not rewritten by `pve-network-interface-pinning`.
- `ebtables` is on by default cluster-wide (`ebtables: 1`).
