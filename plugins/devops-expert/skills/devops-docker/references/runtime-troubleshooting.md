---
name: runtime-troubleshooting
description: Read-only diagnosis of a container host - restarts, OOM kills, unhealthy loops, disk usage, events, logs
when-to-use: A container restarts or is unhealthy, the host runs out of disk or memory, a service is unreachable
keywords: docker inspect, OOMKilled, healthcheck, docker events, docker logs, docker stats, docker system df, restart loop, exit code
priority: high
related: safe-ops.md, networking-firewall.md, engine-daemon-config.md
---

# Runtime Troubleshooting

**Load when:** "the container keeps restarting", "unhealthy", "disk full", "cannot reach the service". Every command here is **read-only**; cleanup is in [safe-ops.md](safe-ops.md).

Metrics, dashboards and alerting on containers (cAdvisor, Prometheus) are `devops-observability`; host-level CPU/IO/disk tooling is `devops-linux`.

---

## First five minutes

```bash
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'   # Restarting / unhealthy / Exited (code)
docker compose ps                                                   # same, per Compose project
docker logs --since 30m -t -n 200 <c>                               # last lines with timestamps
docker events --since 30m --filter container=<c>                    # die, oom, health_status, restart
docker system df                                                    # images / containers / volumes / build cache
```

`docker logs` options: `--since` (timestamp or relative like `42m`), `-n/--tail`, `-t/--timestamps` (https://docs.docker.com/reference/cli/docker/container/logs/). `docker events` reports container events including `die`, `oom` and `health_status`, filterable with `--filter` and bounded with `--since/--until` (https://docs.docker.com/reference/cli/docker/system/events/).

---

## Decision tree

| Symptom | Check | Likely cause → action |
|---------|-------|-----------------------|
| `Exited (137)` or `oom` event | `docker inspect -f '{{.State.OOMKilled}} {{.State.ExitCode}}' <c>` | Memory limit too low or leak → raise `mem_limit` after measuring with `docker stats --no-stream` |
| `Exited (1)` right after start | `docker logs <c>` | App config/env error; dependency not ready → `depends_on: condition: service_healthy` |
| `Restarting` forever | restart policy + logs | Crash loop; stop the loop with `docker update --restart=no <c>` while debugging |
| `(unhealthy)` but app works | `docker inspect -f '{{json .State.Health}}' <c>` | Check command missing in image (no curl in distroless), wrong port, timeout too short, no `start_period` |
| Healthy, unreachable from outside | `docker container inspect <c> --format '{{json .NetworkSettings.Ports}}'` | Bound to `127.0.0.1`, host firewall, or nftables backend forwarding off → [networking-firewall.md](networking-firewall.md) |
| Host disk full | `docker system df -v`, `du -sh /var/lib/docker/*` | Unrotated `json-file` logs, dangling images, build cache, volumes |
| Daemon down after config change | `journalctl -u docker -e` | Invalid or conflicting daemon.json key → `dockerd --validate` |

`State.OOMKilled` and `State.Health.Status` (`none`, `starting`, `healthy`, `unhealthy`) are Engine API fields (https://raw.githubusercontent.com/moby/moby/master/api/swagger.yaml, `ContainerState`).

Exit code 137 = 128 + 9 (SIGKILL, shell convention): OOM kill or a stop that exceeded the grace period. Confirm with `OOMKilled` before blaming memory. `docker update --restart` changes the policy of a running container (https://docs.docker.com/reference/cli/docker/container/update/).

---

## Memory and OOM

- No limit by default: a runaway container can push the **host** into the kernel OOM killer. Set `-m/--memory` (minimum 6m) or Compose `mem_limit`.
- `--memory-swap` only means something with `--memory`; equal values disable swap for the container.
- Never use `--oom-kill-disable` without `-m`: the host may then kill its own processes.

Source: https://docs.docker.com/engine/containers/resource_constraints/

```bash
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}\t{{.PIDs}}'
```

---

## Healthcheck loops

1. Read the last results: `docker inspect -f '{{json .State.Health}}' <c> | jq '.Log[-3:]'`.
2. Run the probe yourself: `docker exec <c> <the test command>`.
3. Slow boot → raise `start_period` (failures inside it do not count) and keep `start_interval` short.
4. A check slower than `timeout` is killed with SIGKILL and counts as a failure.

Healthcheck semantics: https://docs.docker.com/reference/dockerfile/#healthcheck

---

## Disk usage

```bash
docker system df -v                       # per image, container, volume, cache entry
docker buildx du --verbose                # build cache detail (https://docs.docker.com/reference/cli/docker/buildx/du/)
sudo du -sh /var/lib/docker/containers/*/*-json.log 2>/dev/null | sort -h | tail
```

- The containerd image store keeps compressed **and** unpacked layers, so expect more disk than overlay2, and its data lives outside Docker's `data-root` (https://docs.docker.com/engine/storage/containerd/).
- Logs: switch to the `local` driver or rotate `json-file`, then **recreate** containers (logging config only applies to new containers).
- Long-term: BuildKit garbage collection policy in daemon.json (`builder.gc`), shown in the `dockerd` reference example.

Freeing space = deleting things: build the list, then follow [safe-ops.md](safe-ops.md).

---

## Verification

After a fix, the symptom itself must be gone: `docker ps` shows `Up ... (healthy)` for at least one full `interval × retries` window, `docker events --since 10m --filter container=<c>` shows no new `die`/`oom`, and the service answers from a remote host.

## Not verified

- `jq` is assumed installed; it is not part of Docker.
- `du` over `/var/lib/docker` assumes the default `data-root`; with the containerd store, image data is elsewhere (containerd's root, not read today).
