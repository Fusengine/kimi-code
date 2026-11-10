---
name: safe-network-changes
description: Lock-out-proof procedure for any change to firewall, SSH port, routing, DNS resolver or interface config on a remote host
when-to-use: Before ANY command or file change that can cut the session you are working in
keywords: lock-out, nft -c, systemd-run, netplan try, ifreload, second session, rollback, console, propose then go
priority: critical
related: nftables-firewall.md, interfaces-bridge-bond-vlan.md, routing-policy.md, dns.md, wireguard.md
---

# Safe Network Changes (lock-out prevention)

**Load when:** the change touches the path your own SSH session uses. Read-only inspection (`ip a`, `ip r`, `ss`, `nft list ruleset`, `resolvectl status`, `wg show`) needs no go; everything else follows this file.

## The five rules

1. **Propose, then the user's go.** Show ACTION / EFFECT / PROOF and wait. Never apply a firewall, routing, resolver, interface or SSH change on a remote host on your own initiative.
2. **A rollback that fires without the operator.** If the new config cuts you off, nobody is there to type the fix. Schedule the restore *before* the change (table below).
3. **A second session stays open** (and out-of-band console / IPMI / hypervisor console when it exists). Established SSH connections survive most firewall changes only because of `ct state established`; a new connection is the real test. Test from a NEW session.
4. **Validate before apply**, with the tool's check mode (`nft -c`, `netplan generate`, `nginx -t`, `caddy validate`, `haproxy -c`, `unbound-checkconf`).
5. **Change one thing, verify, then the next.** Never combine firewall + SSH port + route in one apply.

## Format of every risky command

```
ACTION   nft -f /etc/nftables.conf   (via nft-safe-apply.sh, 120 s revert)
EFFECT   default policy becomes drop on input; SSH only from 192.0.2.0/24, HTTP(S), UDP 51820 stay open
PROOF    new SSH session from 192.0.2.0/24 succeeds; ss -tlnp unchanged; backup at /root/nft-before-*.conf
ROLLBACK systemd timer nft-revert reloads the backup after 120 s unless cancelled
WAITING  for your go
```

## Rollback mechanisms

| Change | Check first | Auto-revert | Confirm / cancel |
|--------|-------------|-------------|------------------|
| nftables ruleset | `nft -c -f file` | `templates/nft-safe-apply.sh`: backup (`flush ruleset` + `nft list ruleset`), `systemd-run --unit=nft-revert --on-active=120s nft -f backup`, then `nft -f file` | `systemctl stop nft-revert.timer` |
| netplan | `netplan generate` | `netplan try --timeout 120`: applies, rolls back unless confirmed (default 120 s; STP may need over a minute to settle; after a timeout verify the revert really happened) | press ENTER, or send SIGUSR1/SIGINT |
| ifupdown2 (`/etc/network/interfaces`) | `ifquery -a -c` is NOT a safe check; read the diff | no built-in timer: `cp interfaces interfaces.bak` then `systemd-run --unit=net-revert --on-active=180s sh -c 'cp interfaces.bak interfaces && ifreload -a'` | `systemctl stop net-revert.timer` |
| systemd-networkd / NetworkManager without netplan | `networkctl` / `nmcli` read-only | NetworkManager: `nmcli` changes are persistent; use the same `systemd-run` restore of the saved profile | stop the timer |
| sshd port / config | `sshd -t` | keep the old port also listening until the new one is proven (`Port 22` and `Port 2222` both), then remove the old one in a second change | second session on the new port |
| Routing (`ip route`, `ip rule`) | `ip route get <dst>` after, not before | runtime-only changes vanish on reboot; still schedule `systemd-run --on-active=120s ip route replace default via <old-gw>` | stop the timer |
| systemd-resolved / resolv.conf | `resolvectl query example.com` after | keep the old file (`cp -a`) and schedule its restore | stop the timer |
| Reverse proxy | `nginx -t` / `caddy validate` / `haproxy -c` | reload is graceful (old workers keep serving on a bad reload for nginx); keep the previous file | `systemctl reload` of the old file |

`systemd-run ... --on-active=` creates a transient timer plus service (systemd-run(1), https://www.freedesktop.org/software/systemd/man/latest/systemd-run.html). The classic `at` command is an alternative on hosts that have `atd`; its man page was not read today.

## Commands that need exact effect shown

| Command | Exact effect | Do instead |
|---------|--------------|-----------|
| `nft flush ruleset` | Removes ALL tables of all families, including Docker/Podman/libvirt/kube-proxy tables. With a default-drop policy loaded the host is open until reload; with no ruleset all traffic is accepted | Replace only your own table (nftables-firewall.md) |
| `nft -f file` (plain, remote) | Atomic swap; a rule that drops SSH cuts new connections immediately | `nft-safe-apply.sh` |
| `ip link del <if>` | Removes the interface and its addresses/routes; a bridge or bond port deletion cuts every guest/VM behind it | `ip link set <if> down` only when proven harmless; never on the uplink |
| `wg-quick down wg0` | Removes `wg0`, its routes and any `ip rule` override; over a VPN-only admin path this cuts your session | Schedule `wg-quick up wg0` via `systemd-run` first |
| `systemctl restart networking` / `ifdown vmbrX` | Drops all guest traffic on the bridge and may not reconnect guests on `ifup` (Proxmox warns about this) | `ifreload -a` |
| `certbot revoke` | Tells the CA the certificate is no longer valid; irreversible; clients get errors until a new one is served | Only for key compromise; issue the replacement first |
| `certbot delete --cert-name X` | Irreversible removal of the lineage files; does NOT revoke. Proxies still pointing at `/etc/letsencrypt/live/X/` fail to start/reload | `certbot certificates`, check which configs reference it, then propose |
| `rm -rf /etc/letsencrypt` / deleting `acme.json` | Loses the account key and issued certificates; re-issuing counts against CA rate limits | Back up first |

## Verification after every change

New SSH session works; `ss -tlnp` shows the expected listeners; external check of each published port; `journalctl -u <unit> --since "5 min ago"`; then cancel the revert timer. A command that exited 0 is not proof the service is reachable.

## Sources (read 2026-11-10)

- https://wiki.nftables.org/wiki-nftables/index.php/Atomic_rule_replacement
- https://www.netfilter.org/projects/nftables/manpage.html (`-c`, `--check`)
- https://manpages.ubuntu.com/manpages/noble/man8/netplan-try.8.html
- https://pve.proxmox.com/wiki/Network_Configuration
- https://www.freedesktop.org/software/systemd/man/latest/systemd-run.html
- https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- https://eff-certbot.readthedocs.io/en/stable/using.html

## Not verified

- `at` / `atd` behaviour and man page.
- Exact unit naming of `systemd-run --unit=X --on-active=` (timer `X.timer`): standard behaviour, systemd-run page read only up to the synopsis.
- `ifquery -a -c` safety remark, NetworkManager rollback advice, sshd dual-port advice: operational practice, not from an official page read today.
- Revert-by-timer correctness was not executed on a live host (no host available to this agent).
