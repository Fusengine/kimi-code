---
name: compose-v5
description: Docker Compose v5 - startup order with healthchecks, profiles, secrets, interpolation, resource limits
when-to-use: Writing or reviewing compose.yaml, debugging startup order, moving credentials out of environment variables
keywords: compose.yaml, depends_on, service_healthy, healthcheck, start_interval, profiles, secrets, mem_limit, deploy.resources, up --wait
priority: high
related: safe-ops.md, templates/compose-production.md
---

# Docker Compose v5

**Load when:** writing a `compose.yaml`, a service starts before its database is ready, or credentials sit in `environment:`.

Verified 2026-11-10: Compose **v5.7.0** (2026-11-02), https://github.com/docker/compose/releases/tag/v5.7.0 (single source: GitHub releases; Context7 `/docker/compose` lists v5.x).

---

## What changed with v5

- v5.0.0 (2025-12-02): the **internal builder was removed**; `build:` is delegated to Docker Bake, like `docker build`. Compose can also be used as a Go SDK. Versions 3 and 4 were skipped to avoid confusion with legacy file formats (https://github.com/docker/compose/releases/tag/v5.0.0).
- The top-level `version:` key is **obsolete**: informative only, it triggers a warning; Compose always validates against the latest schema (https://docs.docker.com/reference/compose-file/version-and-name/). Remove it.
- Canonical file name: `compose.yaml` (preferred) or `compose.yml`; `docker-compose.y(a)ml` still read for compatibility; `compose.yaml` wins if both exist.

---

## Startup order: running is not ready

Compose waits for a dependency to be **running**, not ready, unless you use a condition (https://docs.docker.com/compose/how-tos/startup-order/):

| Condition | Meaning |
|-----------|---------|
| `service_started` | Container started (default behaviour) |
| `service_healthy` | Dependency's `healthcheck` passes |
| `service_completed_successfully` | One-shot job (migration) exited 0 |

```yaml
services:
  web:
    depends_on:
      db:
        condition: service_healthy
        restart: true          # restart web when db is restarted by a Compose operation
  db:
    image: postgres:18
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 10s
      retries: 5
      start_period: 30s
```

`$$` escapes interpolation so the variable is expanded inside the container. Healthcheck keys `interval`, `timeout`, `start_period`, `start_interval` are durations; `test` list starts with `CMD`, `CMD-SHELL` or `NONE`; `disable: true` turns off an image healthcheck (https://docs.docker.com/reference/compose-file/services/#healthcheck). The Dockerfile defaults are interval 30s, timeout 30s, start-period 0s, start-interval 5s, retries 3; `start_interval` needs Engine 25.0+ (https://docs.docker.com/reference/dockerfile/#healthcheck).

Use `docker compose up -d --wait` (with `--wait-timeout`) in scripts: it waits for services to be running/healthy (https://docs.docker.com/reference/cli/docker/compose/up/).

---

## Secrets instead of environment variables

Environment variables are visible to every process and can end up in debug logs. Compose secrets are bind-mounted as a single file at `/run/secrets/<name>`, granted per service (https://docs.docker.com/compose/how-tos/use-secrets/):

Pattern: service `secrets: [db_password]` + `POSTGRES_PASSWORD_FILE: /run/secrets/db_password`, top-level `secrets: {db_password: {file: ./secrets/db_password.txt}}` (full example in [compose-production.md](templates/compose-production.md)). Linux containers only. Prefer images that support `*_FILE` variables. Where the secret comes from (SOPS, Vault/OpenBao) is `devops-secrets`.

---

## Interpolation and profiles

- `${VAR:-default}` uses a default; `${VAR:?message}` **fails** the command if unset or empty - use it for mandatory settings (https://docs.docker.com/reference/compose-file/interpolation/).
- `profiles: [debug]` keeps a service out of the default `up`; enable with `docker compose --profile debug up` or `COMPOSE_PROFILES=debug` (https://docs.docker.com/compose/how-tos/profiles/).
- Top-level `name:` sets the project name (`COMPOSE_PROJECT_NAME`), which prefixes containers, networks and volumes.

---

## Limits and hardening keys

| Key | Effect | Source |
|-----|--------|--------|
| `mem_limit` / `deploy.resources.limits.memory` | Hard memory cap (must be consistent if both set) | services, deploy reference |
| `deploy.resources.limits.cpus`, `.pids` | CPU and PID caps | deploy reference |
| `pids_limit` | PID cap (`-1` = unlimited) | services reference |
| `read_only: true` + `tmpfs:` | Read-only root filesystem, writable scratch paths | services reference |
| `cap_drop: [ALL]` (+ `cap_add` only what is needed) | Drop Linux capabilities; `ALL` is accepted (engine run reference) | services reference, https://docs.docker.com/engine/containers/run/ |
| `security_opt: [no-new-privileges:true]` | Block setuid escalation | services reference |
| `init: true` | Init as PID 1 reaps zombies, forwards signals | services reference |
| `stop_grace_period` | Wait before SIGKILL on stop | services reference |

Sources: https://docs.docker.com/reference/compose-file/services/ , https://docs.docker.com/reference/compose-file/deploy/

## Verification

```bash
docker compose config -q                 # validate only, prints nothing on success
docker compose config --services         # resolved service list (profiles applied)
docker compose up -d --wait --wait-timeout 120
docker compose ps                        # STATUS shows (healthy)
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| App crashes on first boot, works on restart | `condition: service_healthy` + real healthcheck |
| Data lost after `down`/`up` | Data was in an anonymous volume; use a named volume |
| `version: "3.8"` warning | Delete the key |
| Password set in `environment:` | Move to `secrets:` and `*_FILE` |

`docker compose down -v` deletes named volumes: see [safe-ops.md](safe-ops.md) before running it.

## Not verified

- Compose v5.7.0 release content was not read beyond the version tag; check its notes before relying on a new feature.

→ Template: [compose-production.md](templates/compose-production.md)
