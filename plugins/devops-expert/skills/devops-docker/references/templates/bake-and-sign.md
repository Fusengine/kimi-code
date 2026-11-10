---
name: bake-and-sign
description: docker-bake.hcl for a multi-arch release with SBOM/provenance and registry cache, then cosign sign and verify by digest
keywords: docker buildx bake, docker-bake.hcl, platforms, attest, cache-to, metadata-file, containerimage.digest, cosign sign, cosign verify, cosign attest
---

# Template: Bake Release + cosign Sign/Verify

## Usage

One command builds `linux/amd64` and `linux/arm64`, attaches SBOM and max-mode provenance, pushes, and writes the pushed digest to a metadata file; cosign then signs that **digest** (never the tag) and the result is verified. Works on a workstation or inside any CI job; wiring it into a pipeline (OIDC permissions, runners) is `devops-cicd`.

Verified 2026-11-10: Bake attributes and `--metadata-file` output at https://docs.docker.com/build/bake/reference/ and https://docs.docker.com/reference/cli/docker/buildx/bake/ ; cosign v3.1.4 CLI docs at https://github.com/sigstore/cosign/tree/v3.1.4/doc .

---

## `docker-bake.hcl`

```hcl
variable "REGISTRY" {
  default = "registry.example.internal/team"
}

variable "VERSION" {
  default = "0.0.0-dev"
}

group "default" {
  targets = ["app"]
}

target "app" {
  context    = "."
  dockerfile = "Dockerfile"
  target     = "runtime"
  platforms  = ["linux/amd64", "linux/arm64"]
  tags       = ["${REGISTRY}/app:${VERSION}"]
  args = {
    VERSION = "${VERSION}"
  }
  attest = [
    { type = "provenance", mode = "max" },   # records build args: never pass secrets as args
    { type = "sbom" }
  ]
  cache-from = [{ type = "registry", ref = "${REGISTRY}/app:buildcache" }]
  cache-to   = [{ type = "registry", ref = "${REGISTRY}/app:buildcache", mode = "max" }]
}
```

Variable defaults are overridden by environment variables of the same name: `VERSION=1.4.0 docker buildx bake` (Bake reference, "variable").

---

## Release sequence

```bash
set -euo pipefail
export VERSION=1.4.0
export REGISTRY=registry.example.internal/team

docker buildx bake --print app                       # 1. review the resolved plan (builds nothing)
docker buildx bake --check app                       # 2. Dockerfile build checks only
docker buildx bake --push --metadata-file meta.json app   # 3. build all platforms, push, record result

DIGEST=$(jq -r '.app["containerimage.digest"]' meta.json)  # 4. digest of the pushed index
IMAGE="${REGISTRY}/app@${DIGEST}"
docker buildx imagetools inspect "$IMAGE"            # 5. both platforms + attestation manifests present
```

Multi-platform push needs the containerd image store or a `docker-container` builder ([buildkit-dockerfile.md](../buildkit-dockerfile.md)).

---

## Sign: option A - key pair (air-gapped or self-hosted)

```bash
cosign generate-key-pair                             # once; prompts for a password (or COSIGN_PASSWORD); writes cosign.key + cosign.pub
cosign sign --yes --key cosign.key --recursive "$IMAGE"   # index + every platform manifest
cosign verify --key cosign.pub "$IMAGE"
```

Keep `cosign.key` out of the repository; store it in Vault/OpenBao or a KMS and sign with `--key hashivault://KEY` / `--key openbao://KEY` (custody: `devops-secrets`).

## Sign: option B - keyless (OIDC identity, public Sigstore)

```bash
cosign sign --yes --recursive "$IMAGE"               # opens an OIDC flow, or uses the CI's OIDC token
cosign verify "$IMAGE" \
  --certificate-identity-regexp '^https://github.com/ORG/REPO/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

Keyless binds a short-lived Fulcio certificate carrying the OIDC identity to the signature and logs the signing event in Rekor, the transparency log (public-good instance by default, https://docs.sigstore.dev/cosign/signing/overview/): do not use it when the identity or image name must stay private.

---

## Optional: sign the SBOM as a cosign attestation

BuildKit already attached an SBOM (step 3). To also bind a separately generated SBOM to the signer:

```bash
cosign attest --yes --key cosign.key --type spdxjson --predicate sbom.spdx.json "$IMAGE"
cosign verify-attestation --key cosign.pub --type spdxjson "$IMAGE" > /dev/null && echo "attestation OK"
```

---

## Verify (what "done" means)

```bash
cosign verify --key cosign.pub "$IMAGE"              # exit 0
cosign tree "$IMAGE"                                 # signatures/attestations attached as OCI referrers
docker buildx imagetools inspect "$IMAGE" --format '{{ json .SBOM.SPDX }}' | head -c 300
```

Deploy with the digest (`image: REG/app@sha256:...` in Compose, `Image=` in Quadlet) so what runs is what was signed.

## Not verified

- Behaviour of `cosign sign --recursive` with the attestation manifests BuildKit adds to the index was not tested; check `cosign tree` output after signing.
- The exact GitHub Actions identity URI format (`https://github.com/ORG/REPO/.github/workflows/...@refs/...`) was not read today; the regexp above only anchors on the repository.
- `jq` is assumed installed.
