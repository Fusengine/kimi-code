---
name: troubleshooting-order
description: Fixed-order network troubleshooting - link, IP, route, firewall, DNS, TLS, application - with the read-only command for each layer
when-to-use: "Cannot connect", timeouts, resets, name errors, certificate errors, intermittent loss; before proposing any fix
keywords: ip, ss, nft, dig, tcpdump, mtr, openssl s_client, curl -v, traceroute, nc, troubleshooting
priority: critical
related: safe-network-changes.md, nftables-firewall.md, dns.md, tls-acme.md, reverse-proxy.md
---

# Network Troubleshooting Order

**Load when:** something is unreachable. Walk the layers in this order and stop at the first failure; every command here is read-only. No fix before the evidence; any fix then follows [safe-network-changes.md](safe-network-changes.md).

State first: source host, destination (name AND IP), port, protocol, what changed and when.

| # | Layer | Question | Commands | Failure means |
|---|-------|----------|----------|---------------|
| 1 | Link | Interface up, carrier, right speed, errors? | `ip -br link` ; `ip -s link show eth0` ; `ethtool eth0` ; `bridge link` ; `cat /proc/net/bonding/bond0` | Cable/switch/VLAN tag/bond; nothing above works |
| 2 | IP | Right address, mask, no duplicate? | `ip -br a` ; `ip neigh show` ; `arping -D -I eth0 <ip>` | Wrong subnet; neighbour `FAILED`/`INCOMPLETE` = L2 problem or VLAN mismatch |
| 3 | Route | Which path would the kernel use? | `ip r` ; `ip rule` ; `ip route get <dst> [from <src>]` ; `ping -c3 <gateway>` | No route, wrong gateway, asymmetric policy routing (routing-policy.md) |
| 4 | Firewall | Is a rule dropping it, here or at the destination? | `nft list ruleset` ; `nft -a list chain inet firewall inbound` ; counters ; `ss -tlnp` on the destination | Dropped by policy, port not listening, or listening on 127.0.0.1 only |
| 5 | DNS | Does the name resolve to the intended IP, from the failing host? | `dig +short app.example.com` ; `dig @192.0.2.53 app.example.com` ; `resolvectl query app.example.com` | Wrong/stale record, wrong resolver, split-horizon mismatch (dns.md) |
| 6 | TLS | Handshake, chain, SNI, expiry? | `openssl s_client -connect host:443 -servername host </dev/null` ; `curl -vI https://host` | Expired/wrong cert, missing intermediate, SNI mismatch, protocol mismatch (tls-acme.md) |
| 7 | Application | Does the service answer correctly? | `curl -sv http://127.0.0.1:8080/healthz` ; `journalctl -u <svc> -n 100` ; proxy logs | App down, 502/504 at the proxy (reverse-proxy.md) |

## Tools: what each tells you

| Tool | Use | Reading it |
|------|-----|-----------|
| `ss -tulpn` | Listening sockets and owning process | `127.0.0.1:port` = not reachable remotely; no line = nothing listening |
| `ss -tn state established '( dport = :443 )'` | Live connections | Many `SYN-SENT` = packets leave but no reply (firewall/route) |
| `nc -vz host port` | TCP connect test | `refused` = host reached, nothing listening; `timed out` = dropped or no route |
| `curl -v --connect-timeout 5 URL` | Connect, TLS, HTTP in one trace | Where it stops in the output = the failing layer |
| `dig +trace name` | Walks delegation from the root | Finds lame delegation / wrong NS at the registrar |
| `mtr -n -r -c 20 host` | Per-hop loss and latency | Loss at one hop that continues downstream = real; loss only at one hop = ICMP rate-limiting there |
| `tcpdump -ni eth0 host X and port Y` | Packets on the wire | SYN out, no SYN-ACK in = remote/path drop; SYN in, nothing out = local firewall/app |
| `openssl s_client -showcerts` | Chain actually served | Compare with the intended chain; always give `-servername` |

`tcpdump` captures traffic: use a tight filter and a bounded count (`-c 50`), write to a file you delete after (`-w /tmp/x.pcap`), and never capture payloads of sensitive traffic casually.

## Quick discriminators

- **Timeout** (no answer): firewall drop or routing/L2 problem -> layers 1-4. **Refused** (RST): host reachable, no listener -> layer 7/4.
- **Works by IP, fails by name**: layer 5. **Works from LAN, fails from Internet**: NAT/port-forward/firewall at the edge or split-horizon.
- **Small packets work, large hang** (SSH banner OK then stall, TLS hang): MTU/PMTUD; test `ping -M do -s 1472 <dst>` and lower until it passes.
- **Intermittent**: two backends/IPs, one bad (`dig` returns several A records; `curl --resolve host:443:IP`), or a flapping bond/link (`dmesg`, `/proc/net/bonding`).
- **Only one client fails**: its resolver, proxy setting or source-based rule, not the server.

## Verification of a fix

Re-run the failing check from the original source, then the layer above it; confirm the change with a counter or log, not only exit code 0.

## Sources (read 2026-11-10)

- https://man7.org/linux/man-pages/man8/ip-route.8.html (`ip route get`), https://man7.org/linux/man-pages/man8/ip-rule.8.html
- https://www.netfilter.org/projects/nftables/manpage.html (`nft -a`, list commands)
- https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html (`resolvectl query`)
- https://www.wireguard.com/quickstart/ (`wg show`)

## Not verified

- Option details of `ss`, `ethtool`, `arping`, `dig +trace`, `mtr`, `tcpdump`, `nc`, `curl --connect-timeout/--resolve` and `ping -M do -s` (standard utilities; man pages not read today; flag sets differ between BSD/GNU/iputils builds).
- Interpretation tables are operational practice, not from an official page.
