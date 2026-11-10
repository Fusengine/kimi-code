---
name: dns
description: DNS on servers - systemd-resolved client config, choosing Unbound, BIND or CoreDNS, split-horizon, resolver changes without lock-out
when-to-use: Fixing name resolution on a host, deploying an internal resolver or authoritative server, split DNS for an internal zone
keywords: systemd-resolved, resolvectl, resolved.conf, Unbound, BIND, CoreDNS, split-horizon, forward-zone, local-zone, stub listener, dig
priority: high
related: safe-network-changes.md, troubleshooting-order.md, tls-acme.md
---

# DNS

**Load when:** a host cannot resolve, you choose a DNS server, or an internal zone must answer differently inside the LAN. Changing a host's resolver can silently break updates, ACME and package installs: [safe-network-changes.md](safe-network-changes.md).

## 1. Client side: systemd-resolved

```bash
resolvectl status                       # per-link servers, domains, DNSSEC, stub state
resolvectl query app.example.com        # resolve through resolved, shows interface and protocol
resolvectl dns eth0 192.0.2.53          # runtime change for one link (lost at reboot/link reload)
resolvectl domain eth0 '~corp.example.com'   # route only that domain to this link's servers
cat /etc/resolv.conf ; ls -l /etc/resolv.conf   # symlink to the stub (127.0.0.53) or a static file?
```

Persistent config: `/etc/systemd/resolved.conf` or drop-ins `/etc/systemd/resolved.conf.d/*.conf`, section `[Resolve]`, keys `DNS=` (system servers, optional `:port`, `%ifname`, `#SNI`), `FallbackDNS=`, `Domains=` (a `~` prefix makes it a routing-only domain, not a search domain). Drop-ins sort lexicographically and the last value wins for single-value keys; local drop-ins belong in `/etc/systemd/resolved.conf.d/` with numbers 60-90 (resolved.conf(5), systemd 262). In netplan, `nameservers:` feeds the backend.

Check order for "DNS broken": link up and route (troubleshooting-order.md) -> `resolvectl status` shows the expected server -> query that server directly with `dig @192.0.2.53 example.com` -> is the answer wrong (zone) or missing (server/firewall UDP+TCP 53)?

## 2. Choosing a DNS server (pointer level)

| Need | Pick | Why |
|------|------|-----|
| Recursive, caching, validating resolver for LAN/servers | **Unbound** (NLnet Labs) | Small, validating, `local-zone`/`local-data` for simple internal names, `forward-zone`, `stub-zone`, `auth-zone`, RPZ; not an authoritative server for complex zones |
| Authoritative server for real zones (secondaries, DNSSEC signing, zone transfers) | **BIND 9** (ISC) | Full-featured authoritative + recursive; the heavier config. Alternatives (PowerDNS, Knot) are out of this skill's scope |
| Resolver/authoritative inside Kubernetes or plugin-chained | **CoreDNS** | Plugin architecture (`forward`, `cache`, `file`, `kubernetes`); cluster DNS belongs to `devops-k8s-cluster` |
| Just a laptop/server client | systemd-resolved (above) | Nothing to run |

Unbound docs state that complex authoritative data (referrals, wildcards, CNAME/DNAME, DNSSEC authoritative service) goes to a `stub-zone` pointing at a real authoritative server; a `forward-zone` sends queries to another recursive server (https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html).

## 3. Split-horizon

Same name, different answers for LAN vs Internet:

1. Public authoritative zone (registrar/provider) has the public A records.
2. The LAN resolver (Unbound) carries `local-zone: "corp.example.com." transparent` plus `local-data` for internal hosts, or forwards the zone to an internal authoritative server. Template [unbound-split-horizon.conf](templates/unbound-split-horizon.conf).
3. Clients use the LAN resolver only (DHCP/netplan/resolved `DNS=`); `~corp.example.com` routing domain on VPN links sends just that zone through the tunnel.

Pitfall: DoH/DoT in browsers bypasses the LAN resolver; internal names then fail for those clients.

## 4. Running Unbound next to systemd-resolved

Both want port 53. resolved listens on `127.0.0.53`; Unbound with `interface: 0.0.0.0` fails with "address in use". Bind Unbound to the LAN address or `127.0.0.1` (Unbound docs mention this workaround), and point resolved at it with `DNS=127.0.0.1`. Or disable the stub listener (`DNSStubListener=` in `[Resolve]`; key name not read today, see Not verified).

```bash
unbound-checkconf                 # validate before reload
systemctl reload unbound ; dig @192.0.2.53 git.corp.example.com +short
```

## Effects to show before applying

| Change | Exact effect |
|--------|--------------|
| Edit `/etc/resolv.conf` by hand | Overwritten by resolved/NetworkManager; if it is a symlink you edit the target |
| Point a host at a resolver that is down or unreachable | Every lookup stalls ~ seconds before fallback; `apt`, `curl`, ACME and monitoring fail while IP connectivity is fine |
| `systemctl restart systemd-resolved` | Flushes the cache; briefly interrupts lookups |
| Open Unbound `access-control: 0.0.0.0/0 allow` | Open resolver usable for amplification attacks |

## Sources (read 2026-11-10)

- https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html (systemd 262)
- https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html and `.../getting-started/configuration.html` via Context7 `/websites/unbound_nlnetlabs_nl_en`
- Unbound 1.26.2 (release-1.26.2 tag, 2026-10-21; "a number of security fixes": https://github.com/NLnetLabs/unbound/tags.atom); CoreDNS v1.15.0 (2026-10-21: https://github.com/coredns/coredns/releases.atom)

## Not verified

- BIND 9 current version and supported branches (ISC pages not read); CoreDNS Corefile syntax (not read, pointer only).
- `DNSStubListener=` and `resolvectl dns|domain` subcommand syntax (resolvectl page read only up to `query`).
- DNSSEC setup, zone transfers (AXFR/TSIG), and PowerDNS/Knot: out of the research done today.
- The DoH/browser bypass remark is operational knowledge, not sourced.
