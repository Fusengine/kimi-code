---
name: firewall-nat-interfaces
description: OPNsense interfaces and devices, firewall rule order, aliases, states and NAT modes
when-to-use: Writing or debugging rules, NAT, port forwards, reflection, bridges
keywords: floating rules, quick, MVC rules, os-firewall-legacy, alias, state, port forward, outbound NAT, 1:1, reflection, bridge
priority: high
related: safe-opnsense-changes.md, multiwan.md, troubleshooting-order.md
---

# Interfaces, Firewall Rules, NAT

## Interfaces and devices
- Virtual devices live under Interfaces > Devices: bridge (L2, optional RSTP/STP, no DHCP across it: use DHCP relay), plus VLAN and LAGG devices on the same page family (other-interfaces.html; VLAN/LAGG sections were not read in detail).
- Assignments must be identical on both HA nodes (opt1 must be the same network on both) (carp.html).
- Disable all hardware offloading in Interfaces > Settings for virtual installs (virtuals.html).

## Rules (firewall.html)
- Two implementations: **Firewall Rules** = default MVC with API support; **Firewall Rules [legacy]** = optional plugin `os-firewall-legacy`. Existing legacy rules keep working and can be migrated with Firewall > Migration Assistant. 26.7 notes say rules now default to MVC/API.
- The "Firewall > Automation" screen is a reference/testbed UI for the firewall API, unrelated to rules managed by the core system; rules not visible there are not returned by that API (api core firewall page).
- Actions: pass, block (silent, for untrusted), reject (TCP RST / UDP ICMP unreachable).
- Stateful by default; after a policy change reset states in Firewall > Diagnostics > States (drops live flows: format in safe-opnsense-changes.md). Default 10% of RAM reserved for states (Firewall > Settings).
- **Order:** system rules first, then Floating, then interface-group rules, then interface rules. Priorities 200000 / 300000 / 400000. `quick` is the default: first match wins; without quick, last match wins (the default deny relies on that).
- **NAT is processed before filter rules.** A port forward whose filter-rule association is "Pass" leaves no other rule to apply to it.
- Floating = any number of interfaces or one inverted interface; group = a group interface; interface rule = one interface.
- Inspect the final ruleset in `/tmp/rules.debug`.
- Aliases: managed under Firewall > Aliases; API controller `firewall/alias` has `add_item`, `del_item`, `get_item`, `search_item`, `import`, `export`, `reconfigure`.

## NAT (nat.html)
| Mode | Where | Note |
|------|-------|------|
| Destination NAT (port forward) | Firewall > NAT > Destination NAT | Also used for transparent proxies; cannot NAT to `::1` or link-local |
| One-to-one | Firewall > NAT > One-to-one | Two IPs mapped 1:1 |
| Source NAT (outbound) | Firewall > NAT > Source NAT (Outbound) | Modes: automatic (default), manual, hybrid, disabled (for transparent bridges) |
| NPTv6 | Firewall > NAT > NPTv6 | IPv6 prefix translation |
- Reflection options are in Firewall > Settings > Advanced; no firewall rules are generated for reflection, add them manually. Inspect auto reflection rules with `pfctl -s nat`. Docs advise explicit manual NAT over the automatic reflection helpers.
- Disabling pf disables NAT. NAT is not a security measure.

## Not verified
- VLAN and LAGG menu paths and LAGG protocols; exact anti-lockout rule behavior beyond "hidden rule on LAN".
- MVC rule field names for API writes (see backup-restore-api.md).

## Sources
- https://docs.opnsense.org/manual/firewall.html (2026-11-10)
- https://docs.opnsense.org/manual/nat.html (2026-11-10)
- https://docs.opnsense.org/manual/firewall_settings.html (2026-11-10)
- https://docs.opnsense.org/manual/other-interfaces.html (2026-11-10)
- https://docs.opnsense.org/development/api/core/firewall.html (2026-11-10)
- https://docs.opnsense.org/releases/CE_26.7.html (2026-11-10)
