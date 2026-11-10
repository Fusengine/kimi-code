---
name: troubleshooting-order
description: Fixed troubleshooting order for "cannot connect" on an OPNsense firewall
when-to-use: Any connectivity or rule problem behind or through OPNsense
keywords: interface, gateway, rules, NAT, states, DNS, VPN, HA
priority: medium
related: firewall-nat-interfaces.md, multiwan.md, ha-carp.md
---

# Troubleshooting Order

Stop at the first failure. Read-only checks only until the cause is known.

1. **Link and interface:** assignment, status and IP in Interfaces > Overview; on HA, assignments identical on both nodes.
2. **Gateway:** System > Gateways status (monitor IP up?), gateway group tier/trigger (multiwan.md).
3. **Rules:** Firewall > Log Files > live view; rule order Floating > group > interface; quick vs last-match; read `/tmp/rules.debug` when in doubt (firewall-nat-interfaces.md).
4. **NAT:** port forward with filter association "Pass" bypasses later rules; outbound mode; reflection needs manual rules; `pfctl -s nat` (read-only).
5. **States:** Firewall > Diagnostics > Sessions/States; stale states after a rule change need a reset (lock-out/disruption format).
6. **DNS/DHCP:** which DHCP server runs (Dnsmasq/Kea; ISC is end of life); Unbound listen interfaces; Kea does not register dynamic leases in Unbound (dns-dhcp.md).
7. **VPN:** instance enabled, listen port open on WAN, allowed IPs/children match, HA "Depend on (CARP)" (vpn.md).
8. **HA:** both nodes same version (sync compatibility), pfsync interface, CARP status, backup node holds no sync settings (ha-carp.md).
9. **Service/plugin:** System > Diagnostics > Services; plugin port conflicts (Caddy vs web GUI on 443).

## Not verified
- Exact menu names of the live log view and capture tool on 26.7.

## Sources
- https://docs.opnsense.org/manual/firewall.html (2026-11-10)
- https://docs.opnsense.org/manual/how-tos/multiwan.html (2026-11-10)
- https://docs.opnsense.org/manual/hacarp.html (2026-11-10)
- https://docs.opnsense.org/development/api.html (2026-11-10)
