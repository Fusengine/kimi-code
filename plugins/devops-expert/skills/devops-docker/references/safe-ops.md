---
name: safe-ops
description: Exact effect of every destructive Docker/Podman cleanup command and the propose-then-go protocol
when-to-use: Before any prune, volume removal, compose down -v, image removal, registry GC, cosign clean or podman system reset
keywords: docker system prune, docker volume rm, docker volume prune, docker compose down -v, docker image prune, docker builder prune, podman system reset, data loss
priority: critical
related: runtime-troubleshooting.md, registries-supply-chain.md, podman-quadlet.md
---

# Safe Operations on a Container Host

**Load when:** about to delete anything on a Docker or Podman host, or a user asks to "clean up", "free disk" or "reset".

Rule: **propose, then wait for the user's explicit go.** The agent lists exactly what will be removed, states the effect and whether it is reversible, and runs nothing destructive until the user answers. One go covers one listed command on one host; a new list needs a new go. Never add `-f/--force` to skip the prompt on a host you have not inventoried.

Backups and restore tests of volume data are `devops-storage-backup`.

---

## 1. Inventory (read-only, always first)

```bash
docker system df -v
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Mounts}}'
docker volume ls --format '{{.Name}}' | while read v; do
  echo "$v -> $(docker ps -a --filter volume="$v" --format '{{.Names}}' | paste -sd, -)"; done
docker compose ls                                             # projects, so `down` targets the right one
```

A volume with no container listed is "unused" for Docker - that does **not** mean its data is worthless (a stopped stack may have been removed with `docker rm`).

---

## 2. Effect table (Engine 29 CLI reference, read 2026-11-10)

| Command | Removes | Data risk |
|---------|---------|-----------|
| `docker system prune` | all stopped containers, networks not used by a container, **dangling** images, **all build cache** (including `RUN --mount=type=cache` caches) | Containers' writable layers lost; volumes kept |
| `docker system prune -a` | as above + **every image not used by a container** | Re-pull/rebuild needed; images without a registry copy are gone |
| `docker system prune --volumes` | as above + **anonymous** volumes | Data in anonymous volumes lost |
| `docker volume prune` | unused **anonymous** volumes | Data lost |
| `docker volume prune -a` | unused anonymous **and named** volumes | **Database data lost** |
| `docker volume rm NAME` | that volume (refused if a container uses it; `-f` forces) | Irreversible |
| `docker compose down` | project containers, project networks, default network | Volumes and images kept; external networks/volumes never removed |
| `docker compose down -v` | above + **named volumes declared in the file** + anonymous volumes attached | **Project data lost** |
| `docker compose down --rmi all` / `local` | above + images used by services (`local` = only images without a custom tag) | Rebuild/re-pull |
| `docker image prune` / `-a` | dangling images / all images not referenced by a container | Rebuild/re-pull |
| `docker builder prune` / `-a` | dangling / all unused build cache (`--keep-storage`, `--filter until=24h` narrow it) | Slower next build only |
| `podman system reset` | **all** pods, containers, images, networks, volumes, machines; deletes `graphRoot`/`runRoot` | Everything local lost |

Sources: https://docs.docker.com/reference/cli/docker/system/prune/ , https://docs.docker.com/reference/cli/docker/volume/prune/ , https://docs.docker.com/reference/cli/docker/volume/rm/ , https://docs.docker.com/reference/cli/docker/compose/down/ , https://docs.docker.com/reference/cli/docker/image/prune/ , https://docs.docker.com/reference/cli/docker/builder/prune/ , `podman-system-reset.1.md` at Podman v6.1.4.

Also destructive, covered elsewhere: registry `garbage-collect` without `--dry-run` and `cosign clean` ([registries-supply-chain.md](registries-supply-chain.md)); switching the storage backend hides (does not delete) images ([engine-daemon-config.md](engine-daemon-config.md)).

---

## 3. Proposal format (what the agent shows before asking)

```
Host: <hostname>   Docker: <version>   Free on /var/lib/docker: <df -h>
Command: docker image prune -a --filter "until=240h"
Will remove: 14 images, about 6.2 GB (list attached from `docker image ls`)
Will NOT touch: volumes, running containers, build cache
Reversible: no (images can be re-pulled from <registry>; local-only images: none found)
Backup taken: n/a (no data)       Waiting for your go.
```

For anything touching volumes: name each volume, its size, the containers/projects that used it, and the backup or snapshot taken (with its path and a restore check) before asking.

---

## 4. Safer alternatives first

| Goal | Least destructive option |
|------|-------------------------|
| Free build space | `docker builder prune --filter until=72h` or `--keep-storage` |
| Remove old images only | `docker image prune -a --filter "until=240h"` |
| Restart a stack cleanly | `docker compose down` (no `-v`) then `up -d --wait` |
| Logs filling the disk | Log rotation ([engine-daemon-config.md](engine-daemon-config.md)), then recreate containers |
| Recurring build cache growth | `builder.gc` policy in daemon.json instead of manual prunes |

Prefer `--filter label=...` or `until=` to scope prunes; never `prune -a --volumes` on a host that runs databases.

---

## 5. After the go

```bash
docker system df            # compare with the inventory: the expected space came back
docker compose ps           # every expected service is Up (healthy)
```

Report what was removed (counts, names, reclaimed size) and what was kept.

## Not verified

- The `docker ps` reference describes the `volume` filter as matching "running containers"; that `-a` extends it to stopped containers was not confirmed - cross-check with `docker inspect` on stopped containers before calling a volume orphaned.
- `docker compose down --rmi` default when no value is given was not stated in the reference read today.
