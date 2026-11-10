---
name: plugins-proxy-ids
description: OPNsense plugins - reverse proxy (Caddy, HAProxy, nginx), ACME, IDS/IPS (Suricata), CrowdSec pointers
when-to-use: Publishing services behind the firewall, certificates, intrusion detection
keywords: os-caddy, os-haproxy, os-nginx, os-acme-client, Suricata, Netmap, CrowdSec, plugin tiers
priority: medium
related: firewall-nat-interfaces.md, safe-opnsense-changes.md
---

# Plugins: Reverse Proxy, Certificates, IDS/IPS

## Plugin model (firmware.html)
Plugins install from System > Firmware > Plugins; tier 1 and 2 are shown by default, lower tiers (e.g. bind, c-icap, freeradius) need "Show community plugins". Support tiers: https://docs.opnsense.org/support.html (not read: do not claim a tier for a given plugin).

Plugins with API documentation pages (development/api.html plugin list): Acmeclient, Caddy, Haproxy, Nginx, Crowdsec, Quagga, Bind, Dnscryptproxy, Netbird, Cloudflared and others. Presence on that list proves the plugin exists in the OPNsense plugins repository, not its support tier.

## Reverse proxy
- **Caddy** (`os-caddy`): documented how-to. It uses ports 80 and 443, so the web GUI must move (System > Settings > Administration, e.g. TCP port 8443, tick "disable web GUI redirect rule") and WAN rules must allow HTTP and HTTPS to "This Firewall". On LAN a hidden anti-lockout rule keeps GUI access; other interfaces need explicit rules. Caddy obtains and renews certificates automatically (Let's Encrypt, ZeroSSL).
  The GUI port move is a lock-out operation: use the format in safe-opnsense-changes.md.
- **HAProxy** and **nginx**: plugins exist (API pages); configuration details were not read.
- **ACME client** (`Acmeclient` API page exists): setup not read. Use it for certificates when not using Caddy's automatic HTTPS.
- Generic proxy choice and TLS theory: `devops-networking`.

## IDS/IPS (ips.html)
Suricata-based, uses Netmap for performance, can run as IDS or IPS. Interface choice matters: on WAN you see post-NAT addresses only. Rule download and policy details not read.

## CrowdSec
Plugin API page exists (`Crowdsec`). Its setup was not read: pointer only.

## Not verified
- Tier of each plugin; HAProxy/nginx/ACME procedures; CrowdSec and Suricata rule management.

## Sources
- https://docs.opnsense.org/manual/firmware.html (2026-11-10)
- https://docs.opnsense.org/development/api.html (2026-11-10)
- https://docs.opnsense.org/manual/how-tos/caddy.html (2026-11-10)
- https://docs.opnsense.org/manual/ips.html (2026-11-10)
