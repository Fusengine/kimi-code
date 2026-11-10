---
name: devops-opnsense
description: Use when operating an OPNsense firewall/router - interfaces, VLANs and bridges, firewall rules and NAT, DNS (Unbound) and DHCP (Dnsmasq, Kea), WireGuard/OpenVPN/IPsec, multi-WAN gateway groups, high availability (CARP, pfsync, config sync), reverse proxy and IDS plugins, firmware updates, major upgrades, snapshots and rollback, config.xml backup and restore, the REST API and automation (Ansible, OpenTofu), running OPNsense as a VM, and troubleshooting. Not for Linux host nftables or generic networking (devops-networking), Proxmox itself (devops-proxmox), or security audit (security-expert).
versions:
  opnsense-community: "26.7 series, latest listed 26.7.8 (2026-10-30), FreeBSD 15.1 base"
  opnsense-business: "26.10 series listed"
  release-cadence: "two majors per year, minors about every two weeks"
  dhcp: "Dnsmasq default, Kea for large HA, ISC DHCP end of life"
  ansible-collection: "oxlorg.opnsense (third party, 26.1.11 tag shown in README)"
  terraform-provider: "browningluke/opnsense ~> 0.16 (third party, pre-1.0)"
references:
  - references/safe-opnsense-changes.md
  - references/upgrade-rollback.md
  - references/firewall-nat-interfaces.md
  - references/dns-dhcp.md
  - references/vpn.md
  - references/multiwan.md
  - references/ha-carp.md
  - references/plugins-proxy-ids.md
  - references/backup-restore-api.md
  - references/console-vm-pfsense.md
  - references/troubleshooting-order.md
  - references/templates/api-calls.sh
  - references/templates/config-backup.sh
  - references/templates/opentofu-opnsense.tf
  - references/templates/requirements.yml
  - references/templates/wireguard-checklist.md
  - references/templates/carp-ha-checklist.md
  - references/templates/pre-upgrade-checklist.md
  - references/templates/rollback-checklist.md
related-skills:
  - devops-networking
  - devops-proxmox
  - devops-virtualization
  - devops-ansible
  - devops-iac
  - devops-secrets
  - devops-storage-backup
  - devops-observability
  - devops-sre-ops
  - devops-linux
---

<objective>
Covers day-to-day and risky operations on an OPNsense firewall: network objects, rules and NAT, DNS/DHCP, VPN, multi-WAN, HA, plugins, upgrades and rollback, backup, API and automation, VM deployment and troubleshooting, with a lock-out-proof way to apply every risky change. Does not cover Linux host firewalls and generic networking (devops-networking), Proxmox administration (devops-proxmox), or security audits (security-expert).
</objective>

# DevOps OPNsense

## Agent Workflow (MANDATORY)

Before ANY change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find existing OPNsense IaC (Terraform/OpenTofu, Ansible), exported `config.xml` and runbooks
2. **research-expert** - verify menu paths, API endpoints and plugin names against docs.opnsense.org for the installed release
3. **mcp__context7__query-docs** - library docs if the automation uses a provider or collection

Then inspect read-only (GUI views, `GET` API calls) and confirm the installed version first. After file changes (templates, IaC), run **sniper**.

## Versions (checked 2026-11-10)

See the frontmatter `versions` map and the "Sources" of each reference. Community Edition 26.7 series on FreeBSD 15.1; Business Edition series 26.10 is listed. Menu paths and API endpoints change between series: check the release page of the installed version before quoting a path.

## Overview

| Area | Decision in one line |
|------|----------------------|
| **Rules** | MVC rules are the default; order is Floating > group > interface; `quick` is first-match; NAT is evaluated before filter rules |
| **DHCP** | Dnsmasq for small/medium, Kea for large HA, ISC is end of life |
| **VPN** | WireGuard for simple tunnels, IPsec connections (swanctl) for interop, OpenVPN 2.7 shipped in 26.7 |
| **Multi-WAN** | Monitor IPs + gateway group tiers + policy rule on the traffic that should fail over |
| **HA** | CARP VIPs + pfsync on a dedicated link + XMLRPC sync from master only; same version on both nodes |
| **Upgrade** | Major upgrades are offline: console, snapshot (ZFS) or VM snapshot, config backup first |
| **API** | Basic auth with key/secret, read first, then write, then apply step, then read back |
| **Automation** | Third-party Ansible collection and Terraform provider, pre-production grade |

## Critical Rules

1. **Lock-out is the main danger.** Every operation in the table of [safe-opnsense-changes.md](references/safe-opnsense-changes.md) is proposed as ACTION / EFFECT / PROOF / ROLLBACK, console path and rollback stated first, then WAIT-FOR-GO
2. **Out-of-band access before any change** to interfaces, rules on the management path, restores, upgrades or HA actions
3. **Backup before change**: download `config.xml`, snapshot (ZFS) or VM snapshot; keep copies off-box and encrypted
4. **Read-only first**: GUI views, `GET` API calls, `pfctl -s ...`; never `pfctl -d` or a state flush on a remote box without the format
5. **One change at a time**, verified from a NEW session before the next
6. **Never invent a menu path, endpoint, command or flag**: unknown = "not verified" (every reference ends with that list)
7. **Secrets stay out of output and Git**: API key/secret and WireGuard keys only through environment variables or a secret store (`devops-secrets`)
8. **HA**: change the master, sync to the backup; a backup node never holds sync settings

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Safe changes** | [safe-opnsense-changes.md](references/safe-opnsense-changes.md) | Before ANY change that can cut access or lose state |
| **Upgrades** | [upgrade-rollback.md](references/upgrade-rollback.md) | Release line, minor/major upgrades, snapshots, rollback |
| **Rules and NAT** | [firewall-nat-interfaces.md](references/firewall-nat-interfaces.md) | Interfaces, rule order, aliases, NAT modes |
| **DNS/DHCP** | [dns-dhcp.md](references/dns-dhcp.md) | Unbound, Dnsmasq, Kea, relay |
| **VPN** | [vpn.md](references/vpn.md) | WireGuard, IPsec, OpenVPN |
| **Multi-WAN** | [multiwan.md](references/multiwan.md) | Gateways, groups, failover |
| **HA** | [ha-carp.md](references/ha-carp.md) | CARP, pfsync, config sync |
| **Plugins** | [plugins-proxy-ids.md](references/plugins-proxy-ids.md) | Caddy/HAProxy/nginx, ACME, Suricata, CrowdSec |
| **Backup and API** | [backup-restore-api.md](references/backup-restore-api.md) | Backups, REST API, Ansible, OpenTofu |
| **Console, VM, pfSense** | [console-vm-pfsense.md](references/console-vm-pfsense.md) | Console menu, VM install, migrating from pfSense |
| **Troubleshooting** | [troubleshooting-order.md](references/troubleshooting-order.md) | Any "cannot connect" |

### Templates

| Template | When to Use |
|----------|-------------|
| [api-calls.sh](references/templates/api-calls.sh) | Read-only API calls with key/secret from environment |
| [config-backup.sh](references/templates/config-backup.sh) | Pull and encrypt the config off-box |
| [opentofu-opnsense.tf](references/templates/opentofu-opnsense.tf) | OpenTofu/Terraform provider example (pre-1.0) |
| [requirements.yml](references/templates/requirements.yml) | Install the Ansible collection |
| [wireguard-checklist.md](references/templates/wireguard-checklist.md) | WireGuard instance and peer checklist |
| [carp-ha-checklist.md](references/templates/carp-ha-checklist.md) | HA cluster setup and failover checklist |
| [pre-upgrade-checklist.md](references/templates/pre-upgrade-checklist.md) | Before a firmware upgrade |
| [rollback-checklist.md](references/templates/rollback-checklist.md) | Recovering from a failed change or upgrade |

## Quick Reference

```bash
pfctl -s nat                                   # NAT/reflection rules (read-only, on the firewall)
less /tmp/rules.debug                          # generated ruleset (on the firewall)
curl -sS -u "$OPNSENSE_API_KEY:$OPNSENSE_API_SECRET" "https://$OPNSENSE_HOST/api/firewall/alias/get"
```
Boot loader menu (press Space during boot): option 8 = Boot Environments (ZFS snapshots). Console menu: option 12 = update / major upgrade.

## Best Practices

### DO
- Keep the web GUI and SSH on all interfaces unless a loopback alias design is proven
- Use a dedicated least-privilege API user and rotate its key
- Keep both HA nodes on the same version and the same interface assignments
- Prefer explicit manual NAT over automatic reflection helpers

### DON'T
- Deploy ISC DHCP, or leave a plugin owning ports 80/443 while the GUI uses them
- Run `pfctl -d`, reset states, restore a config or start a major upgrade without the ACTION/EFFECT/PROOF/ROLLBACK format and the user's go
- Treat the third-party Ansible collection or Terraform provider as production-stable
- Paste API secrets, WireGuard private keys or `config.xml` into chat or Git
