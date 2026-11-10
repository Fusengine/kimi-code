---
name: routing-policy
description: Static and policy routing on Linux - routes, ip rule with custom tables, multi-homing, forwarding sysctl, persistence per manager
when-to-use: Adding a route, a second uplink, source-based routing, a gateway/VPN hub, or debugging "wrong path" traffic
keywords: ip route, ip rule, routing table, policy routing, multi-homing, ip_forward, rp_filter, ip route get, metric
priority: high
related: safe-network-changes.md, interfaces-bridge-bond-vlan.md, wireguard.md, troubleshooting-order.md
---

# Routing and Policy Routing

**Load when:** the default path is wrong, a host has two uplinks, or you build a gateway. A bad default route cuts the session: [safe-network-changes.md](safe-network-changes.md).

## Decision rules

| Need | Choice |
|------|--------|
| One uplink, extra LAN/VPN prefix | Static route: `ip route add 10.20.0.0/16 via 192.0.2.254 dev eth0`; persist in the manager's config (netplan `routes:`, `interfaces` `up ip route ...`) |
| Two uplinks, answer on the interface the request came in | Policy routing: one table per uplink + `ip rule from <src-ip> lookup <table>` |
| Active/backup default | Two default routes with different `metric`; lowest wins; failover needs link or health detection (not automatic for a dead upstream) |
| Gateway / VPN hub | `net.ipv4.ip_forward=1` + firewall forward rules + NAT (nftables-firewall.md) |
| Container/VM host | Let the engine or hypervisor manage its own routes; do not hand-edit them |

## Commands (syntax from ip-route(8) and ip-rule(8))

```bash
ip route show ; ip -6 route show ; ip rule show          # read-only
ip route get 203.0.113.9                                 # the route the kernel WOULD use
ip route get 203.0.113.9 from 192.0.2.10 iif eth0        # as seen for a given source/iface

# second uplink via table 100 (runtime only, lost at reboot)
ip route add default via 198.51.100.1 dev eth1 table 100
ip rule add from 198.51.100.10/32 lookup 100 priority 1000
ip route flush cache
```

Rule selectors include `from`, `to`, `fwmark`, `iif`, `oif`, `priority`; action `table TABLE_ID` or `lookup`. Routes accept `via`, `dev`, `metric`, `table` (man pages above). Table names map in `/etc/iproute2/rt_tables` (not read today).

## Effect of mutating commands

| Command | Exact effect |
|---------|--------------|
| `ip route replace default via X` | Replaces the main default route atomically; if X is unreachable every off-link connection, including your SSH session, stalls |
| `ip route del default` | Removes the default route immediately; same outage |
| `ip route flush ...` | Deletes all routes matching the selector; `flush table main` removes everything |
| `ip rule add ... priority N` | Takes effect for new lookups at once; a low priority number is evaluated before `main`, so a catch-all rule can hijack all traffic |

Propose with ACTION / EFFECT / PROOF and schedule the restore (`systemd-run --on-active=120s ip route replace default via <old-gw>`).

## Forwarding and reverse-path filter

- Forwarding: `sysctl net.ipv4.ip_forward` (read), `sysctl -w net.ipv4.ip_forward=1` (runtime), file in `/etc/sysctl.d/` to persist (kernel parameters in depth: `devops-linux`).
- Asymmetric routing (second uplink) is dropped by strict reverse-path filtering: `net.ipv4.conf.<if>.rp_filter` (1 strict, 2 loose). Setting it is a security trade-off; propose it, do not apply it silently.

## Persistence per manager

| Manager | Where |
|---------|-------|
| netplan | `routes:` (`to`, `via`, `metric`, `table`) and `routing-policy:` per interface; examples "Configure source routing" in https://netplan.readthedocs.io/en/stable/examples/ |
| ifupdown2 | `up ip route add ...` / `post-up ip rule add ...` lines in the stanza |
| systemd-networkd | `[Route]` and `[RoutingPolicyRule]` sections in `.network` (not read today) |
| WireGuard `wg-quick` | adds routes from peers' `AllowedIPs`; default route case uses `ip-rule` (wg-quick(8)); `Table = off` disables |

## Verification

`ip route get <dst> [from <src>]` shows the chosen next hop; `ip rule show` ordering; `traceroute`/`mtr -n <dst>` from the host (mtr: troubleshooting-order.md); a connection test from each source IP.

## Sources (read 2026-11-10)

- https://man7.org/linux/man-pages/man8/ip-rule.8.html and https://man7.org/linux/man-pages/man8/ip-route.8.html (synopsis and description only)
- https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8

## Not verified

- Exact `sysctl` semantics of `rp_filter` values, `ip route flush cache` necessity on current kernels, `/etc/iproute2/rt_tables` format: standard practice, no page read.
- netplan `routing-policy:` keys and systemd-networkd `[RoutingPolicyRule]` (netplan examples page was nav-only through the fetch tool).
- Failover behaviour of equal-metric or multipath routes.
