---
name: devops-docker
description: Use when configuring Docker Engine (daemon.json, logging, storage, live-restore), writing Compose files, building images with BuildKit/Buildx (multi-stage, cache mounts, multi-platform, SBOM/provenance, Bake), publishing ports safely next to a host firewall (iptables, experimental nftables backend, ufw/firewalld), running a private registry, signing images with cosign, running daemonless containers with Podman/Quadlet, or troubleshooting/cleaning a container host. Not for Kubernetes (devops-kubernetes), CI pipelines (devops-cicd), dependency vulnerability audits (dependency-audit) or Swarm.
versions:
  docker-engine: "29.9.3"
  docker-compose: "5.7.0"
  buildkit: "0.34.2"
  buildx: "0.38.2"
  podman: "6.1.4"
  cosign: "3.1.4"
  distribution-registry: "3.1.2"
references:
  - references/engine-daemon-config.md
  - references/compose-v5.md
  - references/buildkit-dockerfile.md
  - references/networking-firewall.md
  - references/registries-supply-chain.md
  - references/podman-quadlet.md
  - references/runtime-troubleshooting.md
  - references/safe-ops.md
  - references/templates/daemon-json.md
  - references/templates/dockerfile-hardened.md
  - references/templates/compose-production.md
  - references/templates/bake-and-sign.md
  - references/templates/quadlet-units.md
related-skills:
  - devops-kubernetes
  - devops-cicd
  - devops-linux
  - devops-networking
  - devops-secrets
  - devops-observability
  - devops-storage-backup
  - devops-sre-ops
  - dependency-audit
---

<objective>
Covers a container host end to end: Engine daemon config, Compose v5, BuildKit/Buildx
builds (multi-stage, multi-platform, attestations, Bake), networking versus the host
firewall, registries, cosign signing, Podman/Quadlet, troubleshooting and safe cleanup.
Not covered: Kubernetes (devops-kubernetes), CI pipelines (devops-cicd), host nftables
design (devops-networking), secret stores (devops-secrets), CVE audits
(dependency-audit), Swarm.
</objective>

# Docker, Compose, BuildKit and Podman

## Agent Workflow (MANDATORY)

Before ANY container change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find `Dockerfile*`, `compose*.yaml`, `docker-bake.hcl`, `daemon.json`, Quadlet units
2. **research-expert** - re-check the versions in the frontmatter at docs.docker.com and the GitHub releases
3. **mcp__context7__query-docs** (`/docker/docs`, `/docker/compose`) - confirm every flag or key you are about to write

On a live host, inspect read-only first (`docker version`, `docker info`, `docker compose ls`, `docker system df`). After changes, run **sniper**.

---

## Overview

| Area | What matters in 2026 |
|------|----------------------|
| **Engine 29** | containerd image store is the default on fresh installs only; cgroup v1 deprecated; Docker Content Trust removed from the CLI |
| **Compose v5** | internal builder removed, builds go through Bake; top-level `version:` is obsolete |
| **BuildKit / Buildx** | min-mode provenance added by default; SBOM is opt-in; Bake files drive multi-target builds |
| **Firewall** | iptables is the default backend; nftables backend (`firewall-backend`) is experimental, no `DOCKER-USER` chain, not usable in Swarm |
| **Supply chain** | cosign v3 stores signatures as OCI 1.1 referrers and uses the bundle format by default |
| **Podman 6 / Quadlet** | `.container`/`.network`/`.volume` units generated into systemd services |

---

## Critical Rules

1. **Never invent a flag or key** - `dockerd --validate --config-file=...` and `docker compose config -q` prove syntax before any restart or `up`.
2. **Published ports bypass ufw** - Docker's `nat` rules divert traffic before ufw's `INPUT` chain; bind to `127.0.0.1` or filter in `DOCKER-USER` (iptables) or your own nftables table.
3. **Do not edit Docker's own firewall tables or chains** - Docker owns them and rewrites them.
4. **Destructive commands are proposed, never run on your own** - prune, `volume rm`, `compose down -v`, `podman system reset`: list what goes, state the effect, wait for the user's explicit go ([safe-ops.md](references/safe-ops.md)).
5. **Secrets never in `ENV`, `ARG` or image layers** - use build secret mounts and Compose `secrets:`; `mode=max` provenance exposes build args.
6. **Sign and deploy by digest, not tag** - tags move; cosign signs `image@sha256:...`.
7. **Read the release notes before a minor upgrade** - live-restore only survives patch upgrades, not `YY.MM` jumps.

---

## Architecture

```
/etc/docker/daemon.json            # engine config (validate before restart)
project/{Dockerfile,.dockerignore,docker-bake.hcl,compose.yaml,secrets/}   # secrets/ never committed
~/.config/containers/systemd/      # rootless Quadlet units (Podman)
```

---

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Daemon config** | [engine-daemon-config.md](references/engine-daemon-config.md) | daemon.json, logging, storage, live-restore, rootless |
| **Compose v5** | [compose-v5.md](references/compose-v5.md) | healthchecks, depends_on, profiles, secrets, limits |
| **BuildKit** | [buildkit-dockerfile.md](references/buildkit-dockerfile.md) | multi-stage, cache mounts, multi-platform, SBOM, Bake |
| **Networking** | [networking-firewall.md](references/networking-firewall.md) | bridge/macvlan, published ports, ufw, nftables backend |
| **Registries** | [registries-supply-chain.md](references/registries-supply-chain.md) | registry:3, mirrors, cosign sign/verify, digests |
| **Podman** | [podman-quadlet.md](references/podman-quadlet.md) | rootless, Quadlet units, auto-update |
| **Troubleshooting** | [runtime-troubleshooting.md](references/runtime-troubleshooting.md) | OOM, unhealthy loops, disk usage, events |
| **Safe ops** | [safe-ops.md](references/safe-ops.md) | any prune/rm/down -v/reset |

### Templates

| Template | When to Use |
|----------|-------------|
| [daemon-json.md](references/templates/daemon-json.md) | Baseline `/etc/docker/daemon.json` for a server |
| [dockerfile-hardened.md](references/templates/dockerfile-hardened.md) | Multi-stage, non-root, cache-mounted Dockerfile |
| [compose-production.md](references/templates/compose-production.md) | Compose app with healthchecks, limits, secrets |
| [bake-and-sign.md](references/templates/bake-and-sign.md) | Multi-arch Bake build + attestations + cosign sign/verify |
| [quadlet-units.md](references/templates/quadlet-units.md) | Rootless Podman service as systemd units |

---

## Quick Reference

```bash
docker version && docker info -f '{{ .DriverStatus }}'        # engine + storage backend
dockerd --validate --config-file=/etc/docker/daemon.json      # before any restart
docker compose config -q && docker compose up -d --wait       # validate, then start until healthy
docker buildx bake --print                                    # resolved build plan, builds nothing
docker system df -v                                           # what uses the disk (read-only)
```

---

## Best Practices

### DO
- Pin base images by digest in production and rebuild on a schedule for patched layers
- Set `log-driver: local` (rotated by default) or `max-size`/`max-file` on `json-file`
- Give every long-running service a healthcheck and memory/pids limits
- Prefer named volumes or explicit bind mounts for data; anonymous volumes are not reattached by a new `up`

### DON'T
- Expose the Docker socket or add users to the `docker` group casually - it grants root-level privileges
- Set `"iptables": false` to "fix" ufw - it breaks masquerading and exposes container ports to the LAN
- Run `docker system prune -a --volumes` on a host that holds data
- Assume Compose `depends_on` waits for readiness without `condition: service_healthy`
