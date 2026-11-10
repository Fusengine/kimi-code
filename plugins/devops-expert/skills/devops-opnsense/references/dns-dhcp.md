---
name: dns-dhcp
description: OPNsense DNS (Unbound) and DHCP servers (Dnsmasq, Kea, ISC end of life, DHCP relay)
when-to-use: Choosing or changing the DHCP/DNS service, static reservations, HA DHCP
keywords: Unbound, Dnsmasq, Kea, ISC DHCP, dhcrelay, reservations, control agent, DDNS
priority: medium
related: multiwan.md, ha-carp.md, safe-opnsense-changes.md
---

# DNS and DHCP

## DHCP servers (dhcp.html, read 2026-11-10)
| Server | Status in the docs | Use |
|--------|--------------------|-----|
| Dnsmasq DNS & DHCP | Default for DHCPv4, DHCPv6 and Router Advertisements out of the box; couples DNS and DHCP | Small/medium, under 1000 unique clients |
| Kea DHCP | ISC successor, DHCPv4/v6, no DNS or RA built in | Medium/large HA setups (over 1000 clients) or API-driven configuration |
| ISC DHCP | End of life, no updates or security patches; migrate to Kea or Dnsmasq | Do not deploy |
| DHCrelay | Relay to a server on another network; binds port 67, use strict interface binding to coexist | Segments without local server |

- Reservations: Dnsmasq inside the pool; ISC and Kea outside the pool.
- Kea: dynamic lease registration into Unbound is not implemented, only static reservations are synchronized at an Unbound restart. The Control Agent (REST) is required for Kea HA peers; DDNS (D2) needed for RFC2136 updates. Kea HA example: all config on the master, then System > High Availability > Status > "Synchronize and reconfigure all" with Kea in "Services to synchronize" (kea.html).
- Dnsmasq needs a recursive resolver to forward to (Unbound or upstream); HA for Dnsmasq DHCP is split pools (dnsmasq.html).

## Unbound (unbound.html)
- Standard DNS service since 17.7, enabled by default on new installs. Recommended listen and outbound interfaces: "All". Options include DNSSEC, DNS64 (needs NAT64), host/domain overrides and DHCP lease registration (ISC leases and static mappings).
- DoT upstream forwarding and blocklists: the Unbound page was read only in its opening sections; the DNS-over-TLS and blocklist settings were not read. See "Not verified".

## Not verified
- DoT and blocklist setting names and menu paths; override menu paths.
- Whether the 26.7 wizard still defaults to Dnsmasq for DHCP (dhcp.html says default; dnsmasq.html says the wizard configures Dnsmasq for DHCP).

## Sources
- https://docs.opnsense.org/manual/dhcp.html (2026-11-10)
- https://docs.opnsense.org/manual/kea.html (2026-11-10)
- https://docs.opnsense.org/manual/dnsmasq.html (2026-11-10)
- https://docs.opnsense.org/manual/unbound.html (2026-11-10)
