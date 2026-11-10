---
name: quadlet-units
description: Rootless Podman Quadlet units - network, volume, database and app containers with healthcheck-gated startup, secrets and auto-update
keywords: quadlet, .container, .network, .volume, Notify=healthy, HealthOnFailure, Secret, AutoUpdate, loginctl enable-linger, rootless
---

# Template: Rootless Quadlet Service

## Usage

Runs an app and PostgreSQL as a dedicated unprivileged user, as plain systemd user services: the database unit becomes "started" only when healthy, the app starts after it, an unhealthy container is killed and restarted by systemd, and images auto-update from the registry. All keys come from `podman-systemd.unit.5.md` and `options/secret.md` at Podman **v6.1.4** (read 2026-11-10, https://github.com/podman-container-tools/podman/tree/v6.1.4/docs/source/markdown).

Requirements: cgroup v2, Podman 6.x, a user with subordinate UIDs/GIDs.

---

## 0. One-time host setup (as root)

```bash
sudo useradd --create-home --shell /usr/sbin/nologin svc-shop
sudo loginctl enable-linger svc-shop            # user services start at boot without a login
podman info --format '{{.Host.CgroupsVersion}}' # must print v2
```

Run the following as `svc-shop` (e.g. `sudo machinectl shell svc-shop@` so `systemctl --user` has a session bus).

```bash
mkdir -p ~/.config/containers/systemd
openssl rand -base64 32 | podman secret create db_password -
```

---

## 1. `~/.config/containers/systemd/shop.network`

```ini
[Network]
NetworkName=shop
Internal=false
```

## 2. `~/.config/containers/systemd/db.volume`

```ini
[Volume]
VolumeName=shop-db
```

## 3. `~/.config/containers/systemd/db.container`

```ini
[Unit]
Description=Shop PostgreSQL

[Container]
ContainerName=shop-db
Image=docker.io/library/postgres:18
AutoUpdate=registry
Network=shop.network
NetworkAlias=db
# PostgreSQL 18+ image keeps data under /var/lib/postgresql (VOLUME moved in 18)
Volume=db.volume:/var/lib/postgresql
Environment=POSTGRES_USER=shop POSTGRES_DB=shop POSTGRES_PASSWORD_FILE=/run/secrets/db_password
Secret=db_password,type=mount
HealthCmd=pg_isready -U shop -d shop
HealthInterval=10s
HealthStartPeriod=30s
HealthOnFailure=kill
Notify=healthy
Memory=1g
PidsLimit=512
NoNewPrivileges=true

[Service]
Restart=always
TimeoutStartSec=900

[Install]
WantedBy=default.target
```

## 4. `~/.config/containers/systemd/app.container`

```ini
[Unit]
Description=Shop app
Requires=db.container
After=db.container

[Container]
ContainerName=shop-app
Image=registry.example.internal/team/app@sha256:REPLACE_WITH_DIGEST
Network=shop.network
PublishPort=127.0.0.1:8080:8080
Environment=APP_ENV=production DATABASE_HOST=db DATABASE_PASSWORD_FILE=/run/secrets/db_password
Secret=db_password,type=mount
ReadOnly=true
DropCapability=all
NoNewPrivileges=true
Memory=512m
PidsLimit=256
HealthCmd=/app healthcheck
HealthInterval=30s
HealthStartPeriod=20s
HealthOnFailure=kill
Notify=healthy

[Service]
Restart=always
TimeoutStartSec=900

[Install]
WantedBy=default.target
```

A digest-pinned `Image=` cannot be auto-updated; use a fully-qualified tag with `AutoUpdate=registry` instead if you want automatic updates for the app too.

---

## 5. Generate, start, verify

```bash
/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun   # syntax check, shows generated units
systemctl --user daemon-reload
systemctl --user start app.service          # pulls in db.service, network and volume services
systemctl --user status db.service app.service
podman ps --format '{{.Names}} {{.Status}}' # both "(healthy)"
curl -fsS http://127.0.0.1:8080/
journalctl --user -u app.service -e
```

Do not run `systemctl --user enable`: Quadlet services are generated (transient); the `[Install]` section is applied by the generator.

## 6. Auto-update

```bash
podman auto-update --dry-run --format "{{.Image}} {{.Updated}}"
```

Updates roll back to the previous image if the restarted unit fails (`--rollback`, default true). The shipped `podman-auto-update.timer` runs daily at midnight.

---

## Changing or removing

Edit the file, then `systemctl --user daemon-reload && systemctl --user restart app.service`. Removing the unit file stops managing the container but keeps the `shop-db` volume. Deleting the volume (`podman volume rm shop-db`) or `podman system reset` destroys data: propose with its effect and wait for the user's go ([safe-ops.md](../safe-ops.md)).

## Not verified

- `machinectl shell` as the way to reach the user's systemd instance is a systemd convention, not read in the Podman docs today; any method giving the user a session bus works.
- Whether `Notify=healthy` on `db.container` delays `After=db.container` until healthy is inferred from systemd ordering semantics plus the `Notify=healthy` description; check with `systemctl --user show app.service -p ExecMainStartTimestamp` versus the db health transition.
- Space-separated multiple assignments on one `Environment=` line follow systemd syntax; not re-read in the Podman page.
