---
name: engine-daemon-config
description: Docker Engine 29 daemon.json - logging, storage backend, live-restore, address pools, rootless
when-to-use: Creating or changing /etc/docker/daemon.json, choosing a log driver or storage backend, upgrading the engine
keywords: daemon.json, dockerd, live-restore, log-driver, local, json-file, containerd-snapshotter, overlay2, default-address-pools, rootless
priority: high
related: networking-firewall.md, templates/daemon-json.md
---

# Engine Daemon Configuration

**Load when:** editing `/etc/docker/daemon.json`, planning an engine upgrade, or a host fills its disk with logs.

Verified 2026-11-10: Docker Engine **29.9.3** (2026-11-03), https://docs.docker.com/engine/release-notes/29/ ; endoflife.date agrees and lists 28.x EOL on 2026-05-13.

---

## How daemon.json works

- Default path on Linux: `/etc/docker/daemon.json`; keys are the `dockerd` flag names (plural for repeatable flags, e.g. `labels`).
- A key set both in the file and as a flag makes the daemon **fail to start**, even with the same value. On systemd hosts `-H` is already set, so `hosts` in the file conflicts.
- Validate before restarting:

```bash
sudo dockerd --validate --config-file=/etc/docker/daemon.json   # prints "configuration OK", exit 0
```

Source: https://docs.docker.com/reference/cli/dockerd/ (section "Daemon configuration file").

---

## Decision rules

| Need | Key | Notes |
|------|-----|-------|
| Logs must not fill the disk | `"log-driver": "local"` | Rotates by default: 20m per file, 5 files, compressed |
| Keep `docker logs` + JSON files for a shipper | `"log-driver": "json-file"` + `"log-opts": {"max-size": "10m", "max-file": "3"}` | `json-file` has **no rotation by default** |
| Containers survive a daemon restart | `"live-restore": true` | Patch upgrades only; not across `YY.MM` jumps |
| Avoid subnet clashes with the LAN/VPN | `"default-address-pools"` | Each entry `{"base": "...", "size": N}` |
| Ports published to localhost by default | `"default-network-opts"` | See [networking-firewall.md](networking-firewall.md) |
| Containers cannot gain privileges | `"no-new-privileges": true` | Applies to new containers |
| Debug a startup issue | `"debug": true` | Turn off afterwards |

Logging changes apply only to **containers created after the restart**; existing containers keep their old driver (https://docs.docker.com/engine/logging/configure/). Driver defaults: https://docs.docker.com/engine/logging/drivers/local/.

`live-restore` can be activated with `systemctl reload docker` (SIGHUP) instead of a restart. It only restores containers if daemon options such as bridge IPs or the storage driver did not change (https://docs.docker.com/engine/daemon/live-restore/).

---

## Storage backend (changed in Engine 29)

- **Fresh installs of 29.0+** use the **containerd image store** (snapshotters). **Upgraded hosts keep overlay2** until you opt in.
- Opt in with `"features": {"containerd-snapshotter": true}`, restart, then check:

```bash
docker info -f '{{ .DriverStatus }}'    # [[driver-type io.containerd.snapshotter.v1]]
```

- Switching backend **hides** images and containers of the other backend (data stays on disk). Push or `docker save` what you need first.
- The containerd store uses more disk (compressed + unpacked layers) and keeps its data **outside** Docker's `data-root`: moving `data-root` does not move containerd's storage.
- Not available with `userns-remap`.
- Needed for local multi-platform images and attestations without an external builder.

Source: https://docs.docker.com/engine/storage/containerd/ , https://docs.docker.com/engine/storage/drivers/select-storage-driver/

---

## Engine 29 breaking changes to check before upgrading

From https://docs.docker.com/engine/release-notes/29/ (29.0.0, 2025-11-10):
- The daemon requires API **v1.44+** (clients from Docker 25.0+).
- **cgroup v1 deprecated** (support until at least May 2029): migrate hosts to cgroup v2.
- **Docker Content Trust removed** from the CLI: use cosign ([registries-supply-chain.md](registries-supply-chain.md)).
- Raspbian 32-bit packages dropped; Debian armhf targets ARMv7.
- Experimental nftables firewall backend added ([networking-firewall.md](networking-firewall.md)).

29.9.3 itself is a security release (Go/zstd/RSA fixes, BuildKit 0.34.2, Swarm overlay encryption after a firewalld flush): patch promptly.

---

## Rootless and the docker group

- Members of the `docker` group get **root-level privileges** on the host (https://docs.docker.com/engine/install/linux-postinstall/).
- Rootless mode runs daemon and containers in a user namespace; needs `newuidmap`/`newgidmap` (`uidmap` package) and at least 65,536 subordinate IDs in `/etc/subuid` and `/etc/subgid`. Start at boot with `sudo loginctl enable-linger <user>` (https://docs.docker.com/engine/security/rootless/).
- For a daemonless, systemd-native alternative see [podman-quadlet.md](podman-quadlet.md).

---

## Verification

```bash
sudo dockerd --validate --config-file=/etc/docker/daemon.json
sudo systemctl restart docker && systemctl is-active docker
docker info --format '{{.LoggingDriver}} {{.Driver}} cgroup={{.CgroupVersion}} live-restore={{.LiveRestoreEnabled}}'
```

Field names come from the Engine API `SystemInfo` schema (https://raw.githubusercontent.com/moby/moby/master/api/swagger.yaml, read at `master`, not at the 29.9.3 tag).

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Daemon will not start after edit | Same option in a flag and the file; remove one |
| Disk full of `*-json.log` | `local` driver or `max-size`/`max-file`, then recreate containers |
| Images "vanished" after enabling containerd store | Backend switch hides them; switch back or re-pull |

## Not verified

- The `docker info` field names were read from the API schema at `master`, not at the 29.9.3 tag; if a template fails, inspect `docker info --format '{{json .}}'`.
- Rootless Docker limitations (port numbers below 1024, cgroup delegation) were not read today; see https://docs.docker.com/engine/security/rootless/troubleshoot/ before relying on rootless in production.

→ Template: [daemon-json.md](templates/daemon-json.md)
