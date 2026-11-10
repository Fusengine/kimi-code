---
name: wireguard
description: WireGuard site-to-site and road-warrior setups with wg-quick, key handling, AllowedIPs routing, NAT/forwarding, MTU, plus Tailscale/Headscale pointer
when-to-use: Building or debugging a VPN between hosts, sites or clients; choosing WireGuard vs Tailscale/Headscale
keywords: WireGuard, wg-quick, wg0.conf, AllowedIPs, PersistentKeepalive, full tunnel, split tunnel, Tailscale, Headscale
priority: high
related: safe-network-changes.md, nftables-firewall.md, routing-policy.md, troubleshooting-order.md
---

# WireGuard

**Load when:** creating, changing or stopping a tunnel. `wg-quick down` and any full-tunnel change can cut the session you work in: [safe-network-changes.md](safe-network-changes.md).

## Decision rules

| Need | Choice |
|------|--------|
| Few hosts/sites, full control, no third party | WireGuard + `wg-quick` + `systemd` (`wg-quick@wg0`) |
| Many devices, SSO/ACLs, NAT traversal handled for you | Tailscale (SaaS control plane) or Headscale (self-hosted control plane) - pointer only; both use WireGuard underneath; Headscale 0.29.7 requires Tailscale client >= 1.80.0 (release note 2026-10-30); Tailscale 1.104.5 |
| Site-to-site | One `[Peer]` per site with `AllowedIPs` = that site's LAN prefix(es) on both ends; routes follow from AllowedIPs |
| Road-warrior hub | Server with `/24` for clients, one `/32` per client in server `AllowedIPs` ([wg0-server.conf](templates/wg0-server.conf), [wg0-client.conf](templates/wg0-client.conf)) |
| Peer behind NAT that must be reachable | `PersistentKeepalive = 25` on that peer (WireGuard quickstart: sensible value 25 s; default off; do not enable without need) |

## Core model

- `AllowedIPs` is both the routing table (outgoing: which peer gets the packet) and the source filter (incoming: which source IPs a peer may use). Overlapping ranges between peers are a bug: the more specific prefix wins.
- `wg-quick` infers routes from every peer's `AllowedIPs` and adds them; a default route (`0.0.0.0/0`, `::/0`) triggers an `ip rule` override of the default gateway. `Table = off` disables route creation; `Table = <n>` uses another table (wg-quick(8)).
- Keys: `umask 077; wg genkey | tee privatekey | wg pubkey > publickey`. Config files `chmod 600`, owner root. Never paste private keys into tickets/chat; share only public keys. Preshared keys are optional extra symmetric protection (not read today).
- Interface names: `[a-zA-Z0-9_=+.-]{1,15}`.

## Operations

```bash
wg genkey | tee privatekey | wg pubkey > publickey      # per host
systemctl enable --now wg-quick@wg0                     # persistent (unit name per wireguard-tools packaging; not read)
wg show                                                 # peers, endpoint, latest handshake, transfer
wg-quick strip wg0                                      # config without wg-quick extras, for `wg setconf`
wg syncconf wg0 <(wg-quick strip wg0)                   # apply changes without tearing down the interface
```

`wg syncconf` is the way to add/remove a peer on a live tunnel without `wg-quick down/up` (not read today; see Not verified). `wg show` "latest handshake" older than ~2 minutes or absent = no working path.

## Firewall and forwarding

- Allow the UDP `ListenPort` on the server (templates/nftables.conf opens 51820).
- Gateway use: `net.ipv4.ip_forward=1`, a forward rule `wg0 -> uplink`, and masquerade for the client subnet (nftables-firewall.md). `PostUp`/`PostDown` run via bash and are commonly used for firewall rules; on an nftables-managed host prefer the ruleset file over `PostUp` lines, so reloads do not drop them.
- MTU: wg-quick derives it from the endpoint or default route; set `MTU =` only after measuring (`ping -M do -s <size>`), a wrong MTU shows as "ping works, TLS/SSH hangs".

## Effects to show before running

| Command | Exact effect |
|---------|--------------|
| `wg-quick down wg0` | Removes `wg0`, its routes, the ip-rule override and DNS set by `DNS=` (`resolvconf -d`); runs `PreDown/PostDown`. If your SSH session rides the tunnel it dies |
| `wg-quick up wg0` with `AllowedIPs = 0.0.0.0/0` | All traffic, incl. your SSH session's replies, goes into the tunnel; a wrong endpoint = host cut off. Not on a remote host without a scheduled `wg-quick down wg0` |
| Editing `AllowedIPs` of a live peer | Changes routing at once; overlap steals traffic from another peer |
| Rotating a key | Peer must receive the new public key out-of-band before the old one is removed; otherwise the peer is dropped |
| `SaveConfig = true` | The file is overwritten at shutdown with the live state, discarding your manual edits |

## Verification

```bash
wg show ; ip -br a show wg0 ; ip r | grep wg0
ping -c3 10.8.0.1                                # across the tunnel
ip r get 192.168.10.5                            # does the route use wg0?
tcpdump -ni eth0 udp port 51820                  # does the handshake reach the server?
```

## Sources (read 2026-11-10)

- https://www.wireguard.com/quickstart/ (commands, key generation, PersistentKeepalive)
- https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8 (config keys, Table, PostUp, SaveConfig, route inference)
- wireguard-tools latest tag v1.0.20260223 (https://github.com/WireGuard/wireguard-tools/tags.atom)
- Headscale v0.29.7 and Tailscale v1.104.5 (GitHub releases feeds)

## Not verified

- `wg syncconf`, `wg-quick strip` usage detail (strip confirmed in wg-quick(8) synopsis), `systemctl enable wg-quick@wg0` unit naming, preshared keys, kernel module version.
- Tailscale / Headscale configuration (pointer only); Headscale ACL syntax.
- MTU values for specific transports.
- IPv6 inside the tunnel (not covered by a page read).
