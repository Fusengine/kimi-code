---
name: dockerfile-hardened
description: Multi-stage, cross-compiling, cache-mounted, non-root Dockerfile with build checks, plus .dockerignore
keywords: Dockerfile, multi-stage, BUILDPLATFORM, TARGETOS, TARGETARCH, cache mount, secret mount, distroless, nonroot, check=error=true
---

# Template: Hardened Multi-Stage Dockerfile

## Usage

Shown for a statically linked Go service because it exercises every pattern (cross-compilation, cache mounts, a minimal non-root runtime). For other stacks keep the structure - `deps` stage, `build` stage, minimal `runtime` stage - and swap the toolchain image and commands; the stack's own expert owns the build commands.

Images checked 2026-11-10: `golang:1.27-alpine` (Docker Hub tag list) and `gcr.io/distroless/static-debian13` with tag `nonroot` (distroless README and registry tag list). In production **pin each `FROM` by digest** (`image:tag@sha256:...`, get it with `docker buildx imagetools inspect image:tag`).

Patterns and flags: https://docs.docker.com/reference/dockerfile/ , https://docs.docker.com/build/building/multi-platform/ , https://docs.docker.com/build/checks/ , https://docs.docker.com/build/building/secrets/

---

## `Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1
# check=error=true

ARG GO_IMAGE=golang:1.27-alpine
ARG RUNTIME_IMAGE=gcr.io/distroless/static-debian13:nonroot

# ---- deps: download modules once, cached across builds -----------------
FROM --platform=$BUILDPLATFORM ${GO_IMAGE} AS deps
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# ---- build: cross-compile natively for each target platform -------------
FROM deps AS build
ARG TARGETOS
ARG TARGETARCH
COPY . .
# Private modules: pass a token as a build secret, never as ARG/ENV.
#   docker build --secret id=GIT_AUTH_TOKEN .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=secret,id=GIT_AUTH_TOKEN,env=GIT_AUTH_TOKEN,required=false \
    CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w" -o /out/app ./cmd/app

# ---- runtime: no shell, no package manager, non-root --------------------
FROM ${RUNTIME_IMAGE} AS runtime
COPY --link --from=build /out/app /app
EXPOSE 8080
# distroless has no shell or curl: the binary must implement its own probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --start-interval=2s --retries=3 \
  CMD ["/app", "healthcheck"]
ENTRYPOINT ["/app"]
```

---

## `.dockerignore`

```gitignore
.git
.github
**/*_test.go
**/testdata
*.md
compose*.yaml
docker-bake.hcl
.env
secrets/
```

Keeping `.env` and `secrets/` out of the context prevents them from landing in a layer through `COPY . .`.

---

## Build and check

```bash
docker build --check .                                             # lint only
docker build -t app:dev .                                          # local, current platform
docker buildx build --platform linux/amd64,linux/arm64 \
  --sbom=true --provenance=mode=max -t REG/app:1.0.0 --push .      # multi-arch + attestations
```

`--provenance=mode=max` records build-arg values: nothing secret may travel as `--build-arg`. Multi-arch output needs the containerd image store or a `docker-container` builder ([buildkit-dockerfile.md](../buildkit-dockerfile.md)).

## Verify

```bash
docker run --rm --read-only --cap-drop ALL --security-opt no-new-privileges -p 127.0.0.1:8080:8080 app:dev
docker image inspect app:dev --format '{{.Config.User}} {{.Size}}'   # non-empty user expected
docker buildx imagetools inspect REG/app:1.0.0                      # both platforms + attestation manifests
```

## Adapting

| Stack | Change |
|-------|--------|
| Needs libc (CGO, Python wheels) | runtime `gcr.io/distroless/cc-debian13:nonroot` or a slim distro image with a created user |
| Interpreted language | copy the venv / `node_modules` built in a `deps` stage; never install compilers in `runtime` |
| Needs a shell for debugging | use the `debug-nonroot` distroless tag only in a separate debug target, never in production |

## Not verified

- The user set by the distroless `nonroot` tag was not read in its README today; check it with `docker image inspect` before relying on a specific UID for volume permissions. (`required=false` is the documented default for secret mounts; it is written out for clarity.)
- The `/app healthcheck` sub-command is an application contract, not a Docker feature: implement it or remove the `HEALTHCHECK`.
