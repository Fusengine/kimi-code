---
name: nftables-firewall
description: Host firewall with nftables - default-deny inet ruleset, atomic reload, coexisting with Docker/libvirt, iptables-nft, ufw and firewalld front-ends
when-to-use: Writing, reviewing or changing a host firewall; migrating from iptables; opening a port
keywords: nftables, nft -c, inet table, ct state, default drop, flush ruleset, iptables-nft, ufw, firewalld, nat, masquerade
priority: critical
related: safe-network-changes.md, wireguard.md, troubleshooting-order.md
---

# nftables Host Firewall

**Load when:** touching packet filtering on a Linux host. Every apply follows [safe-network-changes.md](safe-network-changes.md).

## Decision rules

| Situation | Choice |
|-----------|--------|
| New host, nothing else manages netfilter | One `table inet firewall` with `policy drop` on `input` and `forward`; file `/etc/nftables.conf`; template [nftables.conf](templates/nftables.conf) |
| Host also runs Docker, Podman, libvirt, kube-proxy | Do NOT `flush ruleset`. Manage only your own table (below). Docker documents that editing its tables is lost on restart; its nftables backend is experimental, not for Swarm, and has no `DOCKER-USER` chain (https://docs.docker.com/engine/network/firewall-nftables/). Container port filtering: `devops-docker` |
| Team already uses ufw / firewalld | Keep the front-end; do not mix it with hand-written nft files on the same host. They generate netfilter rules for you; inspect with `nft list ruleset` |
| Old scripts call `iptables` | The iptables compatibility layer runs iptables syntax over the nf_tables kernel framework (nftables wiki). Do not mix legacy and nft-backed iptables on one host; check which backend `iptables --version` reports |
| Kubernetes node | The CNI / kube-proxy own netfilter; no host-wide default-drop without the cluster's documented ports (`devops-k8s-cluster`) |

## Facts that matter

- `nft -f file` loads the whole file as one atomic transaction: no half-configured moment, unlike a shell script of many `nft add` calls. Add `flush table X` (or `flush ruleset`) at the top, otherwise every reload duplicates rules. `flush table` does not flush sets; `flush ruleset` does (https://wiki.nftables.org/wiki-nftables/index.php/Atomic_rule_replacement).
- `nft -c -f file` (`--check`) validates without applying (nft manpage).
- The `inet` family sees IPv4 and IPv6 in one table; address matches stay family-specific (`ip saddr`, `ip6 saddr`): a set mixing both families does not type-check, so define two sets.
- Must-accept traffic in an IPv6 input chain: neighbour discovery (`nd-neighbor-solicit`, `nd-router-advert`, `nd-neighbor-advert`), otherwise IPv6 connectivity breaks (nftables wiki simple server ruleset).
- Variables: `define name = value`; `$name`. Includes: `include "/etc/nftables/*.nft"`; the file header is `#!/usr/sbin/nft -f` (https://wiki.nftables.org/wiki-nftables/index.php/Scripting).

## Own-table variant (hosts with Docker / libvirt / k8s)

Replace only `inet firewall`, never other tables. Idiom: declare the table (idempotent), delete it, define it again, all in one `nft -f` transaction.

```
table inet firewall
delete table inet firewall
table inet firewall {
    chain inbound { type filter hook input priority 0; policy drop; ... }
}
```

Check with `nft -c -f` first. Hook priority 0 runs next to Docker's chains; both tables see the packet and a drop in any of them wins. If a container port is published, your input chain is not on that path (it is forwarded); filter it with the `forward` hook or the container engine's own mechanism.

## NAT / forwarding (gateway, VPN hub)

```
table ip nat {
    chain postrouting {
        type nat hook postrouting priority 100; policy accept;
        oifname "eth0" ip saddr 10.8.0.0/24 masquerade
    }
}
```

Plus `sysctl -w net.ipv4.ip_forward=1` (persist in `/etc/sysctl.d/`), plus a `forward` rule allowing `iifname "wg0" oifname "eth0"`. Hook syntax `type nat hook postrouting priority 100` appears in the nftables wiki scripting examples (as `type filter` there); the `masquerade` statement is not covered by a page read today (see Not verified).

## Boot persistence

Distribution packages ship an `nftables.service` that loads the ruleset file at boot (`/etc/nftables.conf` on Debian/Ubuntu); enable with `systemctl enable nftables`. Persist only after the live apply is confirmed, otherwise a bad file locks you out at the next reboot.

## Frequent changes

| Task | How |
|------|-----|
| Open a port | Edit the file, `nft -c -f`, `nft-safe-apply.sh`; for a live one-off `nft add rule inet firewall inbound tcp dport 8443 accept` (lost at reload; add it to the file) |
| List with handles | `nft -a list ruleset` (`-a` shows handles) |
| Delete one rule | `nft delete rule inet firewall inbound handle <N>` - propose with the listing first |
| Count / trace | add `counter`; `nft monitor trace` needs `meta nftrace set 1` (not read today) |

## Pitfalls

| Trap | Consequence |
|------|-------------|
| `flush ruleset` on a container host | Deletes the engine's tables; container networking breaks until the engine restarts |
| SSH allowed by `ct state established` only | Existing session lives, new ones fail: test with a NEW session |
| `policy drop` on `output` | Breaks DNS/updates unless every flow is listed; leave output open unless required |
| IPv6 forgotten | Host reachable/exposed on v6 with no rules; `inet` table covers both |
| Rules saved but `nftables.service` disabled | Ruleset empty after reboot (all traffic accepted) |
| Mixed `ip saddr` set with v6 prefixes | Syntax error at load |

## Verification

`nft list ruleset` shows the expected chains and policy; `ss -tlnp` vs rules; external port scan from another host (`nmap` is out of this skill's scope - use `nc -vz host port`); a new SSH session; `journalctl -k | grep nft` if logging is enabled.

## Sources (read 2026-11-10)

- https://wiki.nftables.org/wiki-nftables/index.php/Atomic_rule_replacement
- https://wiki.nftables.org/wiki-nftables/index.php/Scripting
- https://wiki.nftables.org/wiki-nftables/index.php/Simple_ruleset_for_a_server
- https://wiki.nftables.org/wiki-nftables/index.php/What_is_nftables%3F
- https://www.netfilter.org/projects/nftables/manpage.html (page updated 07/02/2026)
- https://docs.docker.com/engine/network/firewall-nftables/ (via the research file, fetched earlier today)

## Not verified

- nftables tool version (no authoritative version page read).
- `nftables.service` and `/etc/nftables.conf` path per distribution (Debian wiki returned an anti-bot challenge).
- `masquerade` statement, NAT hook priorities, `nft monitor trace` / `meta nftrace`, `nft delete rule ... handle`: standard syntax not confirmed on a page read today.
- The `table X` / `delete table X` / `table X {...}` single-transaction idiom: widely used, not on a page read today; check with `nft -c -f` on the target.
- Interaction of your input chain with Docker's forward-path chains at equal hook priority (statement "a drop in any table wins" is netfilter behaviour, not on a page read today).
- ufw and firewalld behaviour (not read); which iptables backend a given distro defaults to.
