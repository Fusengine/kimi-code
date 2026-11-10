---
name: registries-supply-chain
description: Private registries (distribution registry:3, Harbor), Docker Hub pull-through mirror, digest pinning, cosign v3 signing and verification
when-to-use: Running a self-hosted registry, mirroring Docker Hub, pinning images, signing or verifying images and attestations
keywords: registry:3, distribution, htpasswd, TLS, garbage-collect, registry-mirrors, Harbor, digest, cosign, sign, verify, attest, keyless, OCI referrers
priority: high
related: buildkit-dockerfile.md, safe-ops.md, templates/bake-and-sign.md
---

# Registries and Image Supply Chain

**Load when:** standing up a private registry, adding a Docker Hub mirror, or enforcing that only signed images run.

Verified 2026-11-10 (GitHub releases): distribution **v3.1.2** (image `registry:3`, Docker Hub tags `3`, `3.1`, `3.1.2`), Harbor **v2.14.6**, cosign **v3.1.4**. Docker Content Trust was **removed from the CLI in Engine 29.0**: use cosign instead of `DOCKER_CONTENT_TRUST`.

Dependency/CVE scanning of image contents is `dependency-audit`, not this file.

---

## Choose a registry

| Need | Choice |
|------|--------|
| Single team, simple push/pull | `registry:3` (CNCF distribution) behind TLS + htpasswd |
| UI, RBAC, projects, replication, scanning, quotas | Harbor |
| Cut Docker Hub pulls on many hosts | `registry:3` in proxy (pull-through) mode + `registry-mirrors` |

---

## registry:3 essentials

Source: https://distribution.github.io/distribution/about/deploying/ (read from the v3.1.2 docs source)

- The plain `docker run -p 5000:5000 registry:3` is **test only**. Production needs TLS and access control.
- TLS: `REGISTRY_HTTP_ADDR=0.0.0.0:443`, `REGISTRY_HTTP_TLS_CERTIFICATE`, `REGISTRY_HTTP_TLS_KEY`.
- Auth: `REGISTRY_AUTH=htpasswd`, `REGISTRY_AUTH_HTPASSWD_REALM`, `REGISTRY_AUTH_HTPASSWD_PATH`; only **bcrypt** entries work (`htpasswd -B`), otherwise every login fails.
- Data in `/var/lib/registry`; config in v3 at `/etc/distribution/config.yml`.
- The default config sends OpenTelemetry traces to `localhost:4318`; add `-e OTEL_TRACES_EXPORTER=none` if you do not run a collector.

**Garbage collection** is stop-the-world: run it with the registry stopped or read-only, otherwise layers of an image pushed during GC can be deleted (https://distribution.github.io/distribution/about/garbage-collection/):

```bash
# the registry:3 image ships /bin/registry with ENTRYPOINT ["registry"] (v3.1.2 Dockerfile)
docker run --rm -v /srv/registry:/var/lib/registry registry:3 \
  garbage-collect --dry-run /etc/distribution/config.yml           # read-only preview, registry stopped
```

The real run (without `--dry-run`, optionally `--delete-untagged`) deletes blobs: propose it, wait for the user's go ([safe-ops.md](safe-ops.md)).

---

## Docker Hub pull-through mirror

Set `proxy.remoteurl: https://registry-1.docker.io` in the mirror's config, then on each host:

```json
{ "registry-mirrors": ["https://mirror.example.internal"] }
```

The Docker daemon only supports **mirrors of Docker Hub** through this key (https://distribution.github.io/distribution/recipes/mirror/).

---

## Pin by digest

Tags are mutable. Resolve the digest, then reference `image@sha256:...` in Dockerfiles, Compose and Quadlet:

```bash
docker buildx imagetools inspect postgres:18          # shows the index digest and per-platform manifests
```

Compose accepts `image: name@sha256:<digest>` (https://docs.docker.com/reference/compose-file/services/#image).

---

## cosign v3

v3.0 turned on by default: the **protobuf bundle format**, service URLs from the TUF signing config, and signatures stored as **OCI 1.1 referring artifacts** (https://github.com/sigstore/cosign/blob/main/CHANGELOG.md, v3.0.0). Always sign **by digest**.

| Mode | Sign | Verify |
|------|------|--------|
| Key pair | `cosign generate-key-pair` then `cosign sign --key cosign.key IMG@sha256:...` | `cosign verify --key cosign.pub IMG@sha256:...` |
| KMS / Vault / OpenBao | `--key hashivault://KEY`, `--key openbao://KEY`, `--key awskms://...` | `cosign public-key --key <uri> > kms.pub` then verify with it |
| Keyless (OIDC, Fulcio + Rekor) | `cosign sign IMG@sha256:...` | `cosign verify IMG --certificate-identity=... --certificate-oidc-issuer=...` |

Keyless verification **must** pin both identity (`--certificate-identity` or `--certificate-identity-regexp`) and issuer (`--certificate-oidc-issuer[-regexp]`); for GitHub Actions the issuer is `https://token.actions.githubusercontent.com`. Multi-arch: `cosign sign --recursive` signs the index and each platform manifest.

Attestations: `cosign attest --predicate sbom.spdx.json --type spdxjson --key cosign.key IMG@sha256:...`, checked with `cosign verify-attestation --type spdxjson --key cosign.pub IMG`. Accepted `--type` values: `slsaprovenance`, `slsaprovenance02`, `slsaprovenance1`, `link`, `spdx`, `spdxjson`, `cyclonedx`, `vuln`, `openvex`, `custom` or a URI.

`cosign tree IMG` lists attached signatures/attestations. `cosign clean IMG` **deletes** them (registry permitting): destructive, propose first.

Sources: https://docs.sigstore.dev/cosign/signing/signing_with_containers/ , https://docs.sigstore.dev/cosign/verifying/verify/ , CLI docs at https://github.com/sigstore/cosign/tree/v3.1.4/doc (`cosign_sign.md`, `cosign_verify.md`, `cosign_attest.md`, `cosign_verify-attestation.md`).

Admission enforcement in Kubernetes (policy-controller, Kyverno) is `devops-kubernetes`; key custody is `devops-secrets`.

---

## Verification

```bash
curl -fsS -u USER https://registry.example.internal/v2/_catalog   # auth + TLS work (https://distribution.github.io/distribution/spec/api/)
cosign verify --key cosign.pub REG/app@sha256:<digest>            # exit 0 = valid signature
cosign tree REG/app@sha256:<digest>
```

## Not verified

- Harbor v2.14.6: single source (GitHub releases); Harbor install/config was not read today.
- cosign 3.1.x release notes after 3.0.5 were not read (the main CHANGELOG stops at 3.0.5); flags above come from the v3.1.4 tagged CLI docs.
- Notation (Notary Project) as an alternative signer: not researched.
- The GC example assumes the data volume is mounted at `/var/lib/registry` and the default config path; adapt to your deployment.
