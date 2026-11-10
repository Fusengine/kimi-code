---
name: daemon-json
description: Baseline /etc/docker/daemon.json for a Linux server running Docker Engine 29
keywords: daemon.json, live-restore, log-driver local, default-address-pools, default-network-opts, no-new-privileges, builder gc
---

# Template: Server `daemon.json` (Engine 29)

## Usage

A conservative baseline for a single Linux host: rotated logs, containers kept alive across daemon restarts, localhost-by-default port publishing for user-defined bridges, private address pools that avoid common LAN ranges, and a build-cache GC policy. Every key appears in the full Linux example of https://docs.docker.com/reference/cli/dockerd/ (read 2026-11-10). Values are starting points: adapt the pools to your network and the GC sizes to your disk.

Do not add a key here that is also passed as a `dockerd` flag (systemd unit or drop-in): the daemon refuses to start.

---

## `/etc/docker/daemon.json`

```json
{
  "live-restore": true,
  "log-driver": "local",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  },
  "default-address-pools": [
    { "base": "172.30.0.0/16", "size": 24 },
    { "base": "172.31.0.0/16", "size": 24 }
  ],
  "default-network-opts": {
    "bridge": {
      "com.docker.network.bridge.host_binding_ipv4": "127.0.0.1"
    }
  },
  "no-new-privileges": true,
  "builder": {
    "gc": {
      "enabled": true,
      "defaultReservedSpace": "10GB",
      "policy": [
        { "maxUsedSpace": "512MB", "keepDuration": "48h", "filter": ["type=source.local"] },
        { "reservedSpace": "10GB", "maxUsedSpace": "100GB", "keepDuration": "1440h" }
      ]
    }
  }
}
```

---

## Optional keys (add only when the condition holds)

| Condition | Key | Effect / caveat |
|-----------|-----|-----------------|
| Upgraded host, want multi-platform images and attestations locally | `"features": {"containerd-snapshotter": true}` | Hides existing overlay2 images; more disk; not with `userns-remap` |
| Host must keep routing non-Docker traffic | `"ip-forward-no-drop": true` | Docker no longer sets `FORWARD` policy to `DROP` (iptables backend) |
| Testing the nftables backend (not Swarm) | `"firewall-backend": "nftables"` | Experimental; enable IP forwarding yourself; no `DOCKER-USER` |
| Pull through a Docker Hub mirror | `"registry-mirrors": ["https://mirror.example.internal"]` | Docker Hub mirrors only |
| Logs shipped by a file-tailing agent | `"log-driver": "json-file"` with the same `log-opts` | `json-file` does not rotate without `max-size` |

Details: [engine-daemon-config.md](../engine-daemon-config.md), [networking-firewall.md](../networking-firewall.md), [registries-supply-chain.md](../registries-supply-chain.md).

---

## Apply

```bash
sudo cp daemon.json /etc/docker/daemon.json.new
sudo dockerd --validate --config-file=/etc/docker/daemon.json.new   # must print "configuration OK"
sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.bak 2>/dev/null || true
sudo mv /etc/docker/daemon.json.new /etc/docker/daemon.json
sudo systemctl restart docker
```

A restart stops running containers unless `live-restore` was **already** active; on a production host, schedule it and announce it. Enabling only `live-restore` can be done with `sudo systemctl reload docker`.

---

## Verify

```bash
systemctl is-active docker
docker info --format '{{.LoggingDriver}} live-restore={{.LiveRestoreEnabled}}'
docker network create probe && docker network inspect probe --format '{{json .Options}}' && docker network rm probe
```

New logging options and `default-network-opts` apply to containers and networks **created after** the restart; recreate existing ones (`docker compose up -d --force-recreate`) when the change must cover them.

## Notes

- `default-network-opts` applies to user-defined bridge networks; it does not change Swarm services (port-publishing docs).

## Not verified

- `no-new-privileges` breaking images that rely on setuid binaries (for example `sudo` inside the container) is inferred from what the option blocks, not tested; try it on staging first.
- The `builder.gc` values are the ones from the `dockerd` reference example, not sized for a specific disk.
