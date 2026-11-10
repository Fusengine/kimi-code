---
name: multiwan
description: OPNsense multi-WAN - gateways, monitor IPs, gateway groups, policy routing and failover
when-to-use: Adding a second uplink, failover or load balancing
keywords: gateway group, tier, trigger level, monitor IP, policy based routing, reply-to, route-to
priority: medium
related: firewall-nat-interfaces.md, ha-carp.md, safe-opnsense-changes.md
---

# Multi-WAN

Failover procedure from the how-to (multiwan.html):
1. Gateway monitoring: enable it, set a monitor IP per gateway (System > Gateways > Configuration).
2. Gateway group (System > Gateways > Group): members with tiers (Tier 1 primary, Tier 2 backup) and a trigger level: Member Down (100% loss), Packet Loss, High Latency, or Packet Loss or High Latency.
3. DNS: one DNS server per gateway (System > Settings > General).
4. Policy based routing: set the Gateway field of the LAN pass rule to the group. It skips normal routing, so add an explicit earlier rule for traffic to internal networks and VPNs, or it leaves via the group too.
5. A rule for DNS traffic aimed at the firewall itself, since the group rule would route it the wrong way.
- On static-address interfaces the interface gateway setting drives automatic source NAT and return-path rules (`reply-to`, `route-to`).
- 26.7 adds gateway groups via MVC/API; 26.7.8 notes mention ECMP route support in the development version only.

Deleting a gateway or group, or changing the rule you connect through: lock-out format (safe-opnsense-changes.md).

## Not verified
- Weighted load balancing options; gateway group API endpoints.

## Sources
- https://docs.opnsense.org/manual/how-tos/multiwan.html (2026-11-10)
- https://docs.opnsense.org/releases/CE_26.7.html (2026-11-10)
