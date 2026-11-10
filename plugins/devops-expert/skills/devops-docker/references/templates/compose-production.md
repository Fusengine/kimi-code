---
name: compose-production
description: Production compose.yaml - healthchecks, ordered startup with a migration job, limits, secrets, internal network, localhost-only publishing
keywords: compose.yaml, healthcheck, depends_on, service_healthy, service_completed_successfully, secrets, mem_limit, pids_limit, read_only, internal network, postgres 18
---

# Template: Production `compose.yaml`

## Usage

A web service behind a host reverse proxy, a one-shot migration job and PostgreSQL. Shows: readiness-gated startup, a migration that must succeed before the app starts, Compose secrets with `*_FILE` variables, memory/PID limits, read-only root filesystem, dropped capabilities, an internal-only database network and a port published on localhost only. Keys verified 2026-11-10 against https://docs.docker.com/reference/compose-file/services/ , https://docs.docker.com/reference/compose-file/networks/ and https://docs.docker.com/compose/how-tos/startup-order/.

Replace `REG/app@sha256:...` with your image digest and adapt `healthcheck.test` to your app's real endpoint.

---

## `compose.yaml`

```yaml
name: shop

x-hardening: &hardening
  read_only: true
  cap_drop: [ALL]
  security_opt: [no-new-privileges:true]
  init: true
  logging:
    driver: local
    options: { max-size: "20m", max-file: "5" }

services:
  db:
    image: postgres:18
    restart: unless-stopped
    environment:
      POSTGRES_USER: shop
      POSTGRES_DB: shop
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    volumes:
      - db_data:/var/lib/postgresql        # PostgreSQL 18+ image: VOLUME moved here (was .../data up to 17)
    networks: [backend]
    shm_size: 256m
    mem_limit: 1g
    pids_limit: 512
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
      start_interval: 2s
    stop_grace_period: 60s

  migrate:
    <<: *hardening
    image: REG/app@sha256:REPLACE_WITH_DIGEST
    command: ["/app", "migrate"]
    environment:
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    networks: [backend]
    depends_on:
      db:
        condition: service_healthy
    restart: "no"

  app:
    <<: *hardening
    image: REG/app@sha256:REPLACE_WITH_DIGEST
    restart: unless-stopped
    environment:
      APP_ENV: production
      APP_BASE_URL: ${APP_BASE_URL:?set APP_BASE_URL in .env}
      DATABASE_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    ports:
      - "127.0.0.1:8080:8080"              # reverse proxy on the host; not reachable from the LAN
    networks: [backend, frontend]
    tmpfs: [/tmp]
    mem_limit: 512m
    pids_limit: 256
    cpus: 1.0
    depends_on:
      db:
        condition: service_healthy
        restart: true
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "/app", "healthcheck"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
      start_interval: 2s

  adminer:
    image: adminer
    profiles: [debug]                       # only with: docker compose --profile debug up
    ports: ["127.0.0.1:8081:8080"]
    networks: [backend]

networks:
  backend:
    internal: true                          # no external connectivity for db/migrate
  frontend: {}

volumes:
  db_data: {}

secrets:
  db_password:
    file: ./secrets/db_password.txt         # chmod 600, never committed
```

The app is also on `frontend` so it keeps external connectivity (and a normal bridge for its published port); `db` and `migrate` stay on the externally isolated `backend` only.

---

## Operate

```bash
install -m 600 /dev/null secrets/db_password.txt && openssl rand -base64 32 > secrets/db_password.txt
docker compose config -q                     # validate (also fails if APP_BASE_URL is unset)
docker compose up -d --wait --wait-timeout 180
docker compose ps                            # db, app (healthy); migrate Exited (0)
docker compose logs --since 10m app
```

Upgrade: change the digest, then `docker compose up -d --wait` (only changed services are recreated). Stop: `docker compose down` keeps `db_data`. **`docker compose down -v` deletes `db_data`**: propose it with its effect and wait for the user's go ([safe-ops.md](../safe-ops.md)).

## Verify

- `docker compose ps` shows `(healthy)` for `db` and `app`, `migrate` exited 0.
- `curl -fsS http://127.0.0.1:8080/` answers on the host; the same port is refused from another machine.
- `docker inspect shop-db-1 --format '{{range .Mounts}}{{.Destination}} {{end}}'` lists `/var/lib/postgresql` and no anonymous volume.

## Not verified

- Whether an `internal` network alone prevents port publishing was inferred from the doc's "externally isolated" wording, not tested; the template avoids the case by attaching `app` to `frontend`.
- The default container name pattern `shop-db-1` was not re-read today; use `docker compose ps -q db`.
- `adminer` tag not pinned; pin it if you keep the debug profile.
