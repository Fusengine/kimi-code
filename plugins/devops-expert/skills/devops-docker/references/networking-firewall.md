---
name: networking-firewall
description: Container networking and the host firewall - bridge vs macvlan, published ports, ufw/firewalld, DOCKER-USER, experimental nftables backend
when-to-use: Publishing ports on an internet-facing host, a firewall rule "does not work" for containers, migrating Docker to nftables
keywords: bridge, macvlan, publish, 127.0.0.1, ufw, firewalld, iptables, DOCKER-USER, nftables, firewall-backend, ip-forward, gateway_mode, bridge-accept-fwmark
priority: high
related: engine-daemon-config.md, templates/daemon-json.md
---

# Networking and the Host Firewall

**Load when:** a container port must (or must not) be reachable from outside, ufw/firewalld rules seem ignored, or someone wants Docker on nftables.

Verified 2026-11-10 against Engine 29.9.3 docs. Host-wide nftables design, routing and reverse proxies belong to `devops-networking`; this file covers only how Docker's own rules interact with them.

---

## Choose the network driver

| Need | Driver | Caveat |
|------|--------|--------|
| Services of one app talk to each other | **user-defined bridge** | Built-in DNS by service/container name; default `bridge` is legacy (IP only) |
| Container needs its own LAN IP/MAC | `macvlan` | Switch must accept several MACs per port; **host cannot reach its own macvlan containers** (kernel restriction) unless a host macvlan interface or an extra bridge is added |
| No isolation, max performance | `host` | No port mapping, no Docker firewall rules |

Docker creates firewall rules only for **bridge** networks, none for `ipvlan`, `macvlan` or `host` (https://docs.docker.com/engine/network/packet-filtering-firewalls/). Sources: https://docs.docker.com/engine/network/drivers/bridge/ , https://docs.docker.com/engine/network/drivers/macvlan/

---

## Published ports are public by default

`-p 8080:80` (or `ports: ["8080:80"]`) binds **all host interfaces, IPv4 and IPv6**. Decision rule:

- Reached only through a local reverse proxy → `127.0.0.1:8080:80` (and `[::1]:8080:80`).
- Make localhost the default for user-defined bridges, daemon-wide:

```json
{ "default-network-opts": { "bridge": { "com.docker.network.bridge.host_binding_ipv4": "127.0.0.1" } } }
```

- Before Engine **28.0.0**, hosts on the same L2 segment could reach ports published to localhost (moby#45610): upgrade.
- Swarm services ignore the default bind address and always publish on `0.0.0.0`.

Source: https://docs.docker.com/engine/network/port-publishing/

---

## Why ufw rules are bypassed

Docker DNATs published ports in the `nat` table, so packets are routed to the container **before** they reach the `INPUT`/`OUTPUT` chains ufw uses: ufw "deny" does not protect published ports (https://docs.docker.com/engine/network/packet-filtering-firewalls/). Fixes, in order of preference: bind to `127.0.0.1`; filter in `DOCKER-USER` (iptables backend); a dedicated nftables table (nftables backend).

**Never set `"iptables": false`** to make ufw work: containers lose masquerading and every container port becomes reachable from the LAN. Docker cannot be fully prevented from creating rules.

firewalld: Docker adds bridge interfaces to a `docker` zone (target `ACCEPT`) and a `docker-forwarding` policy.

---

## iptables backend (default): DOCKER-USER

Rules in `DOCKER-USER` run before Docker's rules; rules appended to `FORWARD` run after them. Packets are already DNATed, so match original addresses with conntrack (https://docs.docker.com/engine/network/firewall-iptables/):

```bash
sudo iptables -I DOCKER-USER -i ext_if ! -s 192.0.2.0/24 -j DROP                     # only this subnet reaches containers
sudo iptables -I DOCKER-USER -p tcp -m conntrack --ctorigdst 198.51.100.2 --ctorigdstport 80 -j ACCEPT
```

When Docker enables IP forwarding it sets the `filter` `FORWARD` policy to `DROP` (so the host stops routing other traffic); `"ip-forward-no-drop": true` disables that for a host that must route. Direct-routed packets to a container IP are dropped in `raw PREROUTING` before `DOCKER-USER`.

---

## nftables backend (new in 29.0, still experimental)

Status 2026-11-10: **experimental**; options and behaviour may change; overlay rules are not migrated, so it **cannot be used in Swarm mode** (https://docs.docker.com/engine/network/firewall-nftables/).

- Enable: `"firewall-backend": "nftables"` in daemon.json (or `--firewall-backend=nftables`). Docker creates tables `ip docker-bridges` and `ip6 docker-bridges`: **do not edit them**.
- Docker **does not enable IP forwarding** itself with nftables; startup fails if the default bridge needs it. Set `net.ipv4.ip_forward=1` and `net.ipv6.conf.all.forwarding=1` (sysctl.d) and block unwanted forwarding between non-Docker interfaces yourself, or use `"ip-forward": false` (some bridge features, including port forwarding, may then fail).
- **No `DOCKER-USER` chain.** Put your rules in your own table with base chains on the same hooks; order with chain priority. An nftables `accept` is not final: to override Docker's drop, mark packets and start the daemon with `--bridge-accept-fwmark` (mark set at priority `filter - 1` or lower).
- Migration traps: an existing iptables `FORWARD` policy `DROP` still drops packets accepted by Docker's nftables rules; the old jump to `DOCKER-USER` keeps working until reboot, then those rules are silently ignored.

```
table ip my-table {
  chain my-filter-forward {
    type filter hook forward priority filter; policy accept;
    iifname "ext_if" oifname "br-*" ip saddr != 192.0.2.0/24 counter drop
  }
}
```

Check the active backend: `docker info --format '{{json .FirewallBackend}}'` (API `SystemInfo.FirewallBackend`).

---

## Gateway modes (bridge option)

`com.docker.network.bridge.gateway_mode_ipv4|ipv6` = `nat` (default), `nat-unprotected` (legacy, unpublished ports reachable), `routed` (no NAT, only published ports reachable by direct routing), `isolated`.

## Verification

```bash
docker container inspect <c> --format '{{json .NetworkSettings.Ports}}'   # HostIp 127.0.0.1 expected
sudo ss -ltnp | grep docker-proxy                                         # what listens on the host
sudo iptables -L DOCKER-USER -n -v      # or: sudo nft list ruleset | less
```

Then test from **another host**, not from the Docker host itself.

## Not verified

- Whether the nftables backend is planned to become default, and ufw-specific workarounds beyond the above: not stated in the docs read today.
- `ss` output naming `docker-proxy` depends on `userland-proxy` (default true per `dockerd` reference); not tested here.
