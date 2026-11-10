---
name: buildkit-dockerfile
description: BuildKit and Buildx - multi-stage Dockerfiles, cache and secret mounts, build checks, multi-platform, SBOM/provenance, Bake
when-to-use: Writing a Dockerfile, speeding up builds, building arm64+amd64 images, adding attestations, defining a docker-bake.hcl
keywords: BuildKit, buildx, Dockerfile, multi-stage, RUN --mount, cache, secret, --check, multi-platform, BUILDPLATFORM, SBOM, provenance, bake
priority: high
related: registries-supply-chain.md, templates/dockerfile-hardened.md, templates/bake-and-sign.md
---

# BuildKit, Dockerfile and Buildx

**Load when:** writing or reviewing a Dockerfile, a build is slow or leaks a secret, or images must ship for several CPU architectures.

Verified 2026-11-10: BuildKit **v0.34.2** (2026-11-03, shipped in Engine 29.9.3, https://github.com/moby/buildkit/releases/tag/v0.34.2) and Buildx **v0.38.2** (2026-11-03, https://github.com/docker/buildx/releases/tag/v0.38.2). Buildx is GitHub-only as a source.

---

## Dockerfile rules

1. Start with `# syntax=docker/dockerfile:1` to get the current stable frontend.
2. **Multi-stage**: compile in a full image, copy only the artifact into a minimal final stage; `docker build --target <stage>` builds one stage (https://docs.docker.com/build/building/multi-stage/).
3. **Order for cache**: copy dependency manifests and install dependencies before copying the source tree; keep a `.dockerignore` (https://docs.docker.com/build/cache/optimize/).
4. **Cache mounts** keep package caches across builds without putting them in a layer:

```dockerfile
RUN --mount=type=cache,target=/root/.cache/go-build go build ./...
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get --no-install-recommends install -y gcc
```

`sharing=locked` serialises parallel builds on apt's cache. `docker system prune` also deletes cache mounts ([safe-ops.md](safe-ops.md)).

5. **Secrets** never go through `ARG`/`ENV`; mount them for one `RUN`:

```dockerfile
RUN --mount=type=secret,id=API_KEY,env=API_KEY ./fetch-private-deps.sh
```

```bash
docker build --secret id=API_KEY .                         # from the env var of the same name
docker build --secret id=aws,src=$HOME/.aws/credentials .  # from a file
```

Source: https://docs.docker.com/build/building/secrets/ , https://docs.docker.com/reference/dockerfile/#run---mounttypesecret

6. `RUN --mount=type=ssh` forwards an SSH agent for private Git; `RUN --network=none` proves a step is offline.
7. `COPY --link` puts copied files on an independent layer that survives changes to earlier layers.
8. `HEALTHCHECK` options: `--interval` (30s), `--timeout` (30s), `--start-period` (0s), `--start-interval` (5s, Engine 25.0+), `--retries` (3). A distroless image has no shell or curl: the check must call your binary.

---

## Build checks (lint)

```bash
docker build --check .                      # run checks only, no build
```

Add `# check=error=true` under the syntax line to fail the build on any violation; `# check=skip=JSONArgsRecommended` skips a rule (https://docs.docker.com/build/checks/).

---

## Multi-platform

- One invocation builds several platforms: `docker buildx build --platform linux/amd64,linux/arm64 .`
- Requires the **containerd image store** (default on fresh Engine 29 installs) or a `docker-container` builder: `docker buildx create --name container-builder --driver docker-container --bootstrap --use`. Results of a `docker-container` builder are not loaded into the local image store automatically: push them (`--push`).
- Three strategies, fastest first: native nodes per architecture, **cross-compilation** (`FROM --platform=$BUILDPLATFORM ...` then use `TARGETOS`/`TARGETARCH`), QEMU emulation (bundled with BuildKit; much slower). If emulation fails: `docker run --privileged --rm tonistiigi/binfmt --install all`.

Source: https://docs.docker.com/build/building/multi-platform/

---

## Attestations (SBOM and provenance)

| Flag | Effect |
|------|--------|
| default | **min-mode provenance** attached to images |
| `--provenance=mode=max` | Full provenance; **exposes build-arg values** |
| `--provenance=false` or `BUILDX_NO_DEFAULT_ATTESTATIONS=1` | No provenance |
| `--sbom=true` (= `--attest type=sbom`) | SPDX SBOM of the final stage |
| `ARG BUILDKIT_SBOM_SCAN_STAGE=true` / `BUILDKIT_SBOM_SCAN_CONTEXT=true` | Scan build stages / build context too |

Inspect what was attached:

```bash
docker buildx imagetools inspect REG/IMG:TAG --format '{{ json .SBOM.SPDX }}'
docker buildx imagetools inspect REG/IMG:TAG --format '{{ json .Provenance.SLSA }}'
```

Sources: https://docs.docker.com/build/metadata/attestations/ , https://docs.docker.com/build/metadata/attestations/sbom/ , https://docs.docker.com/build/metadata/attestations/slsa-provenance/

---

## Bake

`docker-bake.hcl` declares `target`, `group` and `variable` blocks with `platforms`, `tags`, `attest`, `cache-from`/`cache-to`, `secret`, `output`, `inherits`. `docker buildx bake --print <target>` shows the resolved plan without building. A target can also read `compose.yaml` build sections (https://docs.docker.com/build/bake/reference/). Compose v5 delegates its builds to Bake.

Remote cache example: `--cache-to type=registry,ref=REG/app:buildcache,mode=max` and `--cache-from type=registry,ref=REG/app:buildcache`.

---

## Verification

```bash
docker build --check .
docker buildx bake --print
docker buildx imagetools inspect REG/IMG:TAG        # platforms + attestation manifests
```

## Not verified

- Dockerfile frontend minor version behind `docker/dockerfile:1` was not read today.

→ Templates: [dockerfile-hardened.md](templates/dockerfile-hardened.md), [bake-and-sign.md](templates/bake-and-sign.md)
