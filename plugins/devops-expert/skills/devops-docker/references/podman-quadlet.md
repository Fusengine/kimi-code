---
name: podman-quadlet
description: Podman 6 as the daemonless alternative - rootless containers managed by systemd through Quadlet units, secrets, auto-update
when-to-use: A host should run containers without a root daemon, containers must be plain systemd services, or Docker is not wanted
keywords: podman, quadlet, rootless, systemd, .container, .network, .volume, podman-system-generator, auto-update, loginctl enable-linger, podman secret
priority: medium
related: engine-daemon-config.md, safe-ops.md, templates/quadlet-units.md
---

# Podman and Quadlet

**Load when:** choosing between Docker and Podman on a server, or turning a container into a systemd service that starts at boot.

Verified 2026-11-10: Podman **v6.1.4** (2026-10-12), https://github.com/podman-container-tools/podman/releases/tag/v6.1.4 ; endoflife.date agrees (6.0 EOL 2026-08-12). **Doc-link trap:** the repository moved from `containers/podman` to `podman-container-tools/podman` (old URLs redirect). Unit reference read from the v6.1.4 tag: `docs/source/markdown/podman-systemd.unit.5.md`.

---

## Docker or Podman?

| Situation | Choose |
|-----------|--------|
| Compose-heavy stack, Docker-specific tooling, Buildx/Bake pipelines | Docker Engine |
| No root daemon wanted; each container a systemd service with journald, restart and dependencies | Podman + Quadlet |
| RHEL/Fedora-family host where Podman is the vendor default | Podman |
| Need Kubernetes YAML locally | Podman `.kube` units (cluster work is `devops-kubernetes`) |

---

## How Quadlet works

A systemd **generator** reads unit files and generates `.service` units at boot and on `systemctl daemon-reload`. File types: `.container`, `.network`, `.volume`, `.pod`, `.kube`, `.image`, `.build`, `.artifact`. All normal systemd sections (`[Unit]`, `[Service]`, `[Install]`) pass through.

Search paths:
- rootful: `/etc/containers/systemd/` (also `/run/...` for tests, `/usr/share/...` for distro units)
- rootless: `~/.config/containers/systemd/` (or `$XDG_CONFIG_HOME/containers/systemd/`), `/etc/containers/systemd/users/${UID}`

Rules that bite:
- Generated services are **transient**: `systemctl enable` does not work. Put `WantedBy=default.target` in `[Install]`; the generator applies it (`Alias`, `WantedBy`, `RequiredBy`, `UpheldBy` only).
- Quadlet **requires cgroup v2** (`podman info --format {{.Host.CgroupsVersion}}`).
- Do not use systemd `User=`/`Group=`/`DynamicUser=` to go rootless: create the user and place units in its rootless path.
- Image pulls can exceed systemd's 90 s start timeout: pre-pull or set `TimeoutStartSec=900` in `[Service]`.
- Default `Type`: `notify` for `.container`/`.kube`, `oneshot` for `.network`/`.volume`/`.image`/`.build`.
- A rootless user's services start at boot only with lingering: `sudo loginctl enable-linger <user>`.

---

## Key `[Container]` options

| Key | Purpose |
|-----|---------|
| `Image=` | Fully-qualified image (needed for `AutoUpdate=registry`) |
| `PublishPort=` | `ip:hostPort:containerPort`; empty IP or `0.0.0.0` = all IPv4 addresses |
| `Network=app.network` | Uses network `systemd-app`, adds a dependency on its service |
| `Volume=data.volume:/data` | Uses volume `systemd-data`, adds a dependency |
| `Secret=` | Podman secret as a file or env var (same syntax as `--secret`) |
| `HealthCmd=`, `HealthInterval=`, `HealthOnFailure=kill` | `kill` lets systemd restart an unhealthy container |
| `Notify=healthy` | Unit becomes active only once the healthcheck passes |
| `ReadOnly=true`, `NoNewPrivileges=true`, `DropCapability=all` | Hardening |
| `Memory=`, `PidsLimit=` | Limits |
| `UserNS=keep-id` | Map your UID into the container (rootless bind mounts) |
| `AutoUpdate=registry` | Pull and restart when the registry image changes |

Dependencies between Quadlet units are written in `[Unit]` with the Quadlet file name (`Requires=db.container`, `After=db.container`) and translated automatically.

---

## Secrets and auto-update

```bash
printf '%s' "$DB_PASSWORD" | podman secret create db_password -     # from stdin, value not on disk
podman auto-update --dry-run --format "{{.Image}} {{.Updated}}"     # preview
sudo systemctl enable --now podman-auto-update.timer                 # shipped timer, daily at midnight
```

`podman auto-update` rolls back to the previous image if the restarted unit fails (`--rollback`, default true). Sources: `podman-secret-create.1.md`, `podman-auto-update.1.md.in` at the v6.1.4 tag.

---

## Debugging generated units

```bash
/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun   # shows generated units/errors
systemd-analyze --user --generators=true verify app.service                  # errors only
systemctl --user daemon-reload && systemctl --user start app.service
journalctl --user -u app.service -e
```

"Unit app.service not found" after daemon-reload = syntax error or a key from a newer Podman: run the generator dry run.

---

## Destructive commands

`podman system reset` removes **all** pods, containers, images, networks, volumes and machines and deletes `graphRoot`/`runRoot`. Never run it without the user's explicit go; see [safe-ops.md](safe-ops.md).

## Verification

```bash
podman info --format '{{.Host.CgroupsVersion}} rootless={{.Host.Security.Rootless}}'
systemctl --user status app.service
podman healthcheck run app && podman ps --format '{{.Names}} {{.Status}}'
```

## Not verified

- The template path `{{.Host.Security.Rootless}}` is derived from the `host.security.rootless` key in the `podman info` man page example; confirm with `podman info --format json`.
- Enabling the auto-update timer as a rootless user (`systemctl --user`) is not stated in the man page read today.
- The generator path `/usr/lib/systemd/system-generators/` may differ per distribution (doc shows this path).
- Docker Compose compatibility of Podman (`podman compose`) was not researched.

→ Template: [quadlet-units.md](templates/quadlet-units.md)
