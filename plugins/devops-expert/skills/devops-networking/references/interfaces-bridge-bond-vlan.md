---
name: interfaces-bridge-bond-vlan
description: Bridges, bonds and VLANs on Linux hosts - which tool each distro uses (netplan, ifupdown2, systemd-networkd, NetworkManager), VLAN-aware bridge, LACP, safe apply
when-to-use: Configuring uplinks, hypervisor bridges, bonds or tagged VLANs; reading an unfamiliar host's network stack
keywords: netplan, ifupdown2, ifreload, systemd-networkd, NetworkManager, bridge-vlan-aware, 802.3ad, LACP, vmbr0, networkctl
priority: critical
related: safe-network-changes.md, routing-policy.md, troubleshooting-order.md
---

# Interfaces: Bridge, Bond, VLAN

**Load when:** creating or changing L2/L3 interface config. Always [safe-network-changes.md](safe-network-changes.md) first: this is where lock-outs happen.

## 1. Find which tool owns the config (read-only)

```bash
ls /etc/netplan/ /etc/network/interfaces /etc/systemd/network/ 2>/dev/null
systemctl is-active systemd-networkd NetworkManager networking 2>/dev/null
networkctl list ; nmcli device status 2>/dev/null ; ip -br a ; ip -d link show type bridge
```

| Tool | Where it is the norm | Config | Safe apply |
|------|---------------------|--------|-----------|
| netplan (renderer networkd or NetworkManager) | Ubuntu Server (netplan originates at Canonical) | `/etc/netplan/*.yaml` | `netplan try` |
| ifupdown2 | Proxmox VE (recommended, default for new installs since 7.0); installable on Debian | `/etc/network/interfaces` | `ifreload -a` + your own timed restore |
| systemd-networkd | netplan backend; stand-alone on minimal systems | `/etc/systemd/network/*.network,*.netdev` | `networkctl reload` + timed restore |
| NetworkManager | desktops, RHEL-family servers | `nmcli`, keyfiles | `nmcli connection up` + timed restore |

Only the first two rows were confirmed from docs today; distro defaults for Debian 13 and RHEL 10 are in "Not verified". Never run two managers on the same interface.

## 2. Decision rules

| Need | Choice |
|------|--------|
| Guests/VMs on several VLANs | One **VLAN-aware bridge** (`bridge-vlan-aware yes`, `bridge-vids 2-4094`); tag per guest NIC. Fewer devices than one bridge per VLAN |
| Host IP on a tagged VLAN | Put the VLAN on the least-abstracted device: `vmbr0.5` on a VLAN-aware bridge, or `eno1.5` / `bond0.5` (Proxmox docs) |
| Redundancy | Bond mode `802.3ad` (LACP) only if the switch ports are configured for it; otherwise `active-backup`. Proxmox example uses `bond-xmit-hash-policy layer2+3` |
| Several uplinks, no switch support | `active-backup` (no switch config needed) |
| Proxmox node | Use the GUI or `devops-proxmox`; Proxmox writes `interfaces.new` and applies live |

## 3. Netplan (Ubuntu)

Template [netplan-vlan-bridge.yaml](templates/netplan-vlan-bridge.yaml): bond + VLAN + two bridges.

```bash
netplan generate                  # parse/validate, writes backend config, no apply
netplan try --timeout 120         # applies, auto-rolls back unless confirmed
netplan status                    # runtime view
```

- `netplan try` reverts automatically after the timeout (default 120 s) unless confirmed with ENTER or `SIGUSR1`/`SIGINT`; STP may need over a minute to settle; after a timeout or cancel, verify the revert actually happened (netplan-try(8) KNOWN ISSUES).
- `vlans:` entries need `id` (0-4094) and `link` naming a device defined in the same config; a bridge lists the VLAN device under `interfaces`.
- Default route: `routes: - to: default  via: <gw>` (netplan examples).
- Files in `/etc/netplan` must not be world-readable (mode 600).

## 4. ifupdown2 (Proxmox/Debian)

Template [interfaces-vlan-aware-bridge](templates/interfaces-vlan-aware-bridge).

```bash
ifquery -a                       # shows parsed state (read-only)
cp /etc/network/interfaces /root/interfaces.bak
ifreload -a                      # applies live, no reboot (Proxmox docs)
```

- Avoid classic `ifup`/`ifdown` on bridges: `ifdown vmbrX` interrupts all guest traffic and a later `ifup` does not reconnect the guests (Proxmox docs).
- Device naming: `en*` predictable names, bridges `vmbr[N]`, bonds `bond[N]`, VLAN `<dev>.<id>`. A systemd upgrade can rename NICs and break the config; pin the naming scheme or a `.link` file on hypervisors (Proxmox docs).

## 5. Verification

```bash
ip -br a ; ip -br link ; ip r                         # addresses, state, routes
bridge vlan show                                      # per-port VLAN membership of a VLAN-aware bridge
cat /proc/net/bonding/bond0                           # LACP partner, slave state, "MII Status: up"
ip r get 1.1.1.1 ; ping -c2 <gateway>                 # path and reachability
```

## Pitfalls

| Trap | Consequence |
|------|-------------|
| `netplan apply` over SSH | No rollback; wrong gateway = permanent lock-out until console |
| LACP configured on host, not on switch | Bond flaps or one link carries all, switch logs MAC flapping |
| NIC rename after upgrade | Config references a missing device; host boots with no network |
| Gateway not reachable on the new subnet | Route add fails silently in some managers; verify with `ip r get` |
| Two managers (NetworkManager + networkd) | Fight over the same interface after reboot |

## Sources (read 2026-11-10)

- https://manpages.ubuntu.com/manpages/noble/man8/netplan-try.8.html
- https://github.com/canonical/netplan/blob/main/doc/multi-nic-vm-host-with-bonds-and-vlans.md and `netplan-yaml.md` (vlans section) via Context7 `/canonical/netplan`
- https://pve.proxmox.com/wiki/Network_Configuration and https://pve.proxmox.com/pve-docs/chapter-sysadmin.html (via Context7 `/websites/pve_proxmox_pve-docs`)

## Not verified

- Default network manager for Debian 13, RHEL/Alma/Rocky 10 and Ubuntu 26.04 (assumed netplan on Ubuntu; not read).
- `netplan status`, `bridge vlan show`, `ifquery -a`, `networkctl reload`: standard commands, no page read today.
- systemd-networkd `.netdev`/`.network` syntax (not read); NetworkManager bridge/bond/VLAN `nmcli` syntax (not read).
- Netplan version (the netplan GitHub release feed returned 404); Ubuntu Noble ships netplan.io 1.1.2 (manpage footer).
