---
name: devops-networking
description: Use when configuring or debugging Linux server and infrastructure networking - host firewall with nftables (iptables-nft, ufw, firewalld as front-ends), bridges/bonds/VLANs with netplan, ifupdown2, systemd-networkd or NetworkManager, static and policy routing, DNS (systemd-resolved, Unbound/BIND/CoreDNS, split-horizon), TLS and ACME certificates (certbot, acme.sh, lego, HTTP-01 vs DNS-01), reverse proxies (Traefik, Nginx, Caddy, HAProxy), WireGuard (and Tailscale/Headscale as a pointer) and layer-by-layer network troubleshooting. Not for Kubernetes networking, Gateway API or CNI (devops-kubernetes, devops-k8s-cluster), Docker networks (devops-docker), Proxmox SDN (devops-proxmox), Neutron (devops-openstack), or security audit and TLS grading (security-headers, security-expert).
versions:
  nftables-wiki: "atomic reload via nft -f, check via nft -c (manpage updated 2026-02-07)"
  systemd: "262 (resolved.conf docs)"
  netplan: "1.1.2 (Ubuntu 24.04 package)"
  traefik: "3.7.18 (3.7.17 per endoflife.date)"
  caddy: "2.11.9"
  nginx: "1.31.8 mainline, 1.30.6"
  haproxy: "3.4.7 LTS"
  certbot: "5.9.0"
  lego: "5.6.0"
  acme-sh: "3.1.6"
  unbound: "1.26.2"
  coredns: "1.15.0"
  wireguard-tools: "1.0.20260223"
  headscale: "0.29.7"
  tailscale: "1.104.5"
references:
  - references/safe-network-changes.md
  - references/nftables-firewall.md
  - references/interfaces-bridge-bond-vlan.md
  - references/routing-policy.md
  - references/dns.md
  - references/tls-acme.md
  - references/reverse-proxy.md
  - references/wireguard.md
  - references/troubleshooting-order.md
  - references/templates/nftables.conf
  - references/templates/nft-safe-apply.sh
  - references/templates/wg0-server.conf
  - references/templates/wg0-client.conf
  - references/templates/traefik-static.yml
  - references/templates/traefik-dynamic.yml
  - references/templates/nginx-proxy.conf
  - references/templates/Caddyfile
  - references/templates/haproxy.cfg
  - references/templates/netplan-vlan-bridge.yaml
  - references/templates/interfaces-vlan-aware-bridge
  - references/templates/unbound-split-horizon.conf
related-skills:
  - devops-linux
  - devops-opnsense
  - devops-docker
  - devops-kubernetes
  - devops-k8s-cluster
  - devops-proxmox
  - devops-virtualization
  - devops-openstack
  - devops-observability
  - devops-secrets
  - devops-sre-ops
  - devops-ansible
---

<objective>
Covers server networking on Linux hosts: the host firewall, interfaces (bridge, bond, VLAN), routing, DNS, TLS/ACME certificates, reverse proxies, WireGuard and a fixed troubleshooting order, with a lock-out-proof way to apply every change. Does not cover Kubernetes networking, Gateway API and CNI (devops-kubernetes, devops-k8s-cluster), Docker networks (devops-docker), Proxmox SDN (devops-proxmox), Neutron (devops-openstack) or security audit and TLS grading (security-headers, security-expert).
</objective>

# DevOps Networking

## Agent Workflow (MANDATORY)

Before ANY network change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find existing firewall, netplan/interfaces, proxy and ACME configs in the repo or IaC
2. **research-expert** - verify directives against the version in use (nftables wiki, nginx.org, caddyserver.com, doc.traefik.io, haproxy docs)
3. **mcp__context7__query-docs** - `/traefik/traefik`, `/websites/nginx_en`, `/websites/caddyserver_caddyfile`, `/haproxy/docs`, `/canonical/netplan`, `/websites/unbound_nlnetlabs_nl_en`, `/websites/eff-certbot_readthedocs_io_en_stable`, `/go-acme/lego`

Then inspect the host read-only (`ip -br a`, `ip r`, `nft list ruleset`, `ss -tulpn`, `resolvectl status`, which network manager owns the config). After file changes, run **sniper**.

## Versions (checked 2026-11-10)

See the frontmatter `versions` map; sources per reference under "Sources". Traefik 3.6 reached end of life 2026-08-16; Nginx 1.29 on 2026-05-13; HAProxy 3.4 is an LTS (EOL 2031-04-01). Tool versions on the target host decide which directives exist: check `nginx -v`, `nft --version`, `caddy version`, `haproxy -v`, `traefik version` first.

## Overview

| Area | Decision in one line |
|------|----------------------|
| **Firewall** | One `inet` table, `policy drop` on input/forward, SSH limited to admin networks; never `flush ruleset` on a container/VM host |
| **Interfaces** | netplan on Ubuntu, ifupdown2 on Proxmox/Debian hypervisors; VLAN-aware bridge for guests; LACP only if the switch is configured |
| **Routing** | Static route for one prefix; `ip rule` + table for multi-homing; forwarding needs sysctl + firewall + NAT |
| **DNS** | Unbound for recursive/internal names, BIND for authoritative zones, CoreDNS for plugin chains/cluster; systemd-resolved on clients |
| **TLS** | Proxy built-in ACME if Traefik/Caddy; certbot/lego/acme.sh otherwise; DNS-01 for wildcard; staging first |
| **Reverse proxy** | Caddy (simple), Traefik (dynamic), Nginx (classic), HAProxy (load balancing); fix proxy headers and trusted proxies first |
| **VPN** | WireGuard; Tailscale/Headscale when SSO/ACLs/NAT traversal are needed |
| **Troubleshooting** | link -> IP -> route -> firewall -> DNS -> TLS -> application, stop at the first failure |

## Critical Rules

1. **Lock-out is the main danger.** Any change to firewall, SSH port, routing, DNS resolver, interface config or tunnels on a remote host is proposed with ACTION / EFFECT / PROOF / ROLLBACK, then waits for the user's go ([safe-network-changes.md](references/safe-network-changes.md))
2. **Rollback that fires without the operator** - `nft -c` then apply via `templates/nft-safe-apply.sh` (timed revert), `netplan try`, `systemd-run --on-active=` restore for ifupdown2/routes/resolver, a second session open, console access known
3. **Check mode before apply** - `nft -c -f`, `netplan generate`, `nginx -t`, `caddy validate`, `haproxy -c`, `unbound-checkconf`
4. **Read-only first** - identify the owning network manager and the current rules; never run two managers on one interface
5. **Exact effect for destructive commands** - `nft flush ruleset`, `ip link del`, `wg-quick down`, `certbot revoke|delete`, deleting `acme.json`: show what disappears
6. **One change at a time**, verified from a NEW session before the next
7. **Never invent a directive or flag** - cite the official page for the version in use; unknown = "not verified"
8. **Secrets stay out of output** - WireGuard private keys, DNS-provider API tokens, ACME account keys: names and paths only (`devops-secrets`)

## Architecture

```
/etc/nftables.conf                 # host firewall (table inet firewall)
/etc/netplan/*.yaml | /etc/network/interfaces   # interfaces, one manager only
/etc/wireguard/wg0.conf            # chmod 600
/etc/systemd/resolved.conf.d/      # client DNS
/etc/unbound/unbound.conf.d/       # internal resolver
/etc/nginx/conf.d | /etc/caddy/Caddyfile | /etc/traefik | /etc/haproxy   # one proxy per public port
/etc/letsencrypt/live/<name>/      # certbot lineages (or Traefik acme.json, Caddy data dir)
```

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Safe changes** | [safe-network-changes.md](references/safe-network-changes.md) | Before ANY change that can cut your session |
| **nftables** | [nftables-firewall.md](references/nftables-firewall.md) | Host firewall, opening ports, NAT, Docker coexistence |
| **Interfaces** | [interfaces-bridge-bond-vlan.md](references/interfaces-bridge-bond-vlan.md) | Bridges, bonds, VLANs, which tool owns the config |
| **Routing** | [routing-policy.md](references/routing-policy.md) | Static routes, multi-homing, forwarding |
| **DNS** | [dns.md](references/dns.md) | Resolver config, Unbound/BIND/CoreDNS, split-horizon |
| **TLS/ACME** | [tls-acme.md](references/tls-acme.md) | Issue/renew/revoke certificates, challenge choice |
| **Reverse proxy** | [reverse-proxy.md](references/reverse-proxy.md) | Choosing and configuring a proxy, headers, HTTP/3 |
| **WireGuard** | [wireguard.md](references/wireguard.md) | Site-to-site, road-warrior, full vs split tunnel |
| **Troubleshooting** | [troubleshooting-order.md](references/troubleshooting-order.md) | Any "cannot connect" |

### Templates

| Template | When to Use |
|----------|-------------|
| [nftables.conf](references/templates/nftables.conf) | Default-deny server firewall: SSH from admin nets, HTTP(S), HTTP/3, WireGuard |
| [nft-safe-apply.sh](references/templates/nft-safe-apply.sh) | Apply a ruleset with a timed automatic revert |
| [wg0-server.conf](references/templates/wg0-server.conf) / [wg0-client.conf](references/templates/wg0-client.conf) | WireGuard hub and client pair |
| [traefik-static.yml](references/templates/traefik-static.yml) / [traefik-dynamic.yml](references/templates/traefik-dynamic.yml) | Traefik v3 entrypoints, ACME, file-provider routers and middlewares |
| [nginx-proxy.conf](references/templates/nginx-proxy.conf) | Nginx TLS proxy, h2/h3, proxy headers, WebSocket, rate limit |
| [Caddyfile](references/templates/Caddyfile) | Caddy automatic HTTPS reverse proxy with health checks |
| [haproxy.cfg](references/templates/haproxy.cfg) | HAProxy TLS frontend, health checks, per-IP rate limit |
| [netplan-vlan-bridge.yaml](references/templates/netplan-vlan-bridge.yaml) | Bond + VLAN + bridges on Ubuntu |
| [interfaces-vlan-aware-bridge](references/templates/interfaces-vlan-aware-bridge) | VLAN-aware bridge on a bond with ifupdown2 |
| [unbound-split-horizon.conf](references/templates/unbound-split-horizon.conf) | Internal zone answers plus a forward-zone |

## Quick Reference

```bash
ip -br a ; ip r ; ip rule                     # state
nft list ruleset ; ss -tulpn                  # firewall and listeners
nft -c -f /etc/nftables.conf                  # validate only
resolvectl status ; resolvectl query example.com
netplan try --timeout 120                     # apply with auto-rollback (Ubuntu)
wg show                                       # tunnel state
openssl s_client -connect host:443 -servername host </dev/null | openssl x509 -noout -dates
curl -sv -o /dev/null https://host/ 2>&1 | grep -E 'HTTP/|subject|expire'
```

## Best Practices

### DO
- Keep the firewall in one file under version control and reload it atomically
- Restrict SSH by source network, keep a second session and a console path while changing
- Use staging ACME endpoints before production; persist ACME state
- Set trusted proxies explicitly and make the backend trust only the proxy
- Open UDP 443 when serving HTTP/3 and the WireGuard port when running a tunnel

### DON'T
- Run `netplan apply`, plain `nft -f` or `ifdown` on a remote host without a timed rollback
- `flush ruleset` where Docker, libvirt or kube-proxy own tables
- Expose the Traefik dashboard or API unauthenticated, or run an open DNS resolver
- Edit `/etc/resolv.conf` by hand on a resolved/NetworkManager host
- Put private keys, API tokens or `acme.json` in Git or in a chat
