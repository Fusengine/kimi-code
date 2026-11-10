---
name: image-build-ci
description: Building container images in CI - BuildKit cache backends, multi-platform builds, push by digest, tags, provenance and SBOM attestations, signing pointers; GitHub Actions and GitLab flavours
when-to-use: A pipeline builds and pushes an image, a build is slow, a multi-arch image is needed, or SBOM/provenance/signing is requested
keywords: buildx, build-push-action, cache-from, cache-to, type=gha, type=registry, multi-platform, qemu, digest, provenance, SBOM, cosign, attest, dind
priority: high
related: pipeline-design.md, deploy-strategies-release.md, pipeline-secrets.md, templates/github-image-build-push.yml, templates/gitlab-component.yml
---

# Container Image Build in CI

**Load when:** the pipeline produces an image. Dockerfile craft, registries, SBOM tooling and signing policy live in `devops-docker`; this file is the CI wiring. Template: [github-image-build-push.yml](templates/github-image-build-push.yml) (GitLab: [gitlab-component.yml](templates/gitlab-component.yml)).

## Principles

1. **Build once.** The image built from a commit is the artifact promoted through environments; never rebuild per environment ([pipeline-design.md](pipeline-design.md)).
2. **Reference by digest.** Tags move; the digest output of the push step (`steps.push.outputs.digest` in `docker/build-push-action`, outputs `imageid`, `digest`, `metadata`) is what deploy jobs receive.
3. **PRs build but do not push or sign** (`push: ${{ github.event_name != 'pull_request' }}`); credentials for pushing exist only on trusted refs.
4. **Secrets never via `ARG`/`COPY`**: use build secret mounts (`--secret`). Provenance on public repos records build-arg values, so a secret passed as build arg leaks into the attestation.

## Cache

External cache is "almost essential" in CI because runners keep nothing between runs. Backends: `inline` (min mode only), `registry` (separate cache image, supports `mode=max`), `local`, `gha` (GitHub Actions cache; beta per docs; only valid inside a workflow; only cache service API v2 since 2025-04-15), `s3`/`azblob` (marked unreleased in the backends page).

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
# or, runner-independent:
# cache-from: type=registry,ref=registry.example.com/app:buildcache
# cache-to:   type=registry,ref=registry.example.com/app:buildcache,mode=max
```

Each cache location is overwritten by the next write: use a distinct `ref`/`scope` per branch when you want per-branch caches. With a GitHub cache, mind the repo cache-size and eviction limits ([github-actions-workflows.md](github-actions-workflows.md)).

## Multi-platform

- `platforms: linux/amd64,linux/arm64` with `docker/setup-qemu-action` (emulation, slow) and `docker/setup-buildx-action`. The default runner Docker setup can push multi-platform images but cannot `load` them locally (needs the containerd image store).
- Faster: native runners per platform (`ubuntu-24.04-arm` exists as a GitHub-hosted label) merging manifests, or Docker's "GitHub Builder" reusable workflows that compute the matrix and create the manifest.

## Tags

`docker/metadata-action` turns refs into tags and OCI labels (`type=ref,event=branch|pr`, `type=semver,pattern={{version}}`, `type=sha`, `type=raw`). Avoid deploying by `latest`; the deploy input is the digest.

## Provenance, SBOM, signing (pointers)

- `docker/build-push-action` v4+: `provenance` (public repos get `mode=max` by default, private `mode=min`; set `mode=max` explicitly) and `sbom: true`. Attestations require pushing to a registry (no `load`).
- GitHub artifact attestations: `actions/attest` with `permissions: id-token: write, attestations: write, artifact-metadata: write`; inputs `subject-name`, `subject-digest`, `push-to-registry`. `actions/attest-build-provenance` v4 is only a wrapper; new work uses `actions/attest`. Available for public repos, and private/internal on plans that include it; not on GHES.
- Keyless signing with `sigstore/cosign-installer` + `cosign sign --yes <repo>@<digest>` signs by OIDC identity. Verification policy at deploy time (admission control, `cosign verify` with identity and issuer) belongs to `devops-docker` / `devops-kubernetes`.
- GitLab: attach the same flags to `docker buildx build`; sign with cosign using the job's ID token (`id_tokens`). Not verified here.

## Runner and daemon constraints

- Docker-in-Docker needs a privileged container; prefer buildx with a remote/containerised BuildKit builder or daemonless builders on isolated runners. A mounted host Docker socket gives the job root on the host: never on shared or untrusted-PR runners.
- Registry login in CI uses the platform token (`GITHUB_TOKEN` with `packages: write`, `CI_REGISTRY_USER`/`CI_REGISTRY_PASSWORD`), not a personal access token.

## Sources (read 2026-11-10)

- https://docs.docker.com/build/ci/github-actions/cache/ , .../multi-platform/ , .../attestations/ ; https://docs.docker.com/build/cache/backends/
- README of docker/build-push-action, docker/metadata-action, actions/attest, sigstore/cosign-installer (via `gh api .../readme`)
- Versions via `gh api repos/<r>/releases/latest` on 2026-11-10: build-push-action v7.4.0, setup-buildx-action v4.4.1, setup-qemu-action v4.4.0, login-action v4.8.0, metadata-action v6.2.0, actions/attest v4.2.2, cosign-installer v4.1.3

## Not verified

- Which cosign major `sigstore/cosign-installer` v4.1.3 installs by default and whether `cosign sign --yes` is unchanged in it.
- GitLab-side cosign keyless signing and `docker:cli` shipping buildx.
- Current GHCR retention/storage limits and GitHub cache size limit.
