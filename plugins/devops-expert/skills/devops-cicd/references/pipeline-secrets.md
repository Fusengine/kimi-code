---
name: pipeline-secrets
description: Handling credentials inside CI/CD pipelines - what never goes in YAML, scoping and masking, environment-bound secrets, OIDC instead of stored keys, leak response; pointer to devops-secrets for the stores themselves
when-to-use: A pipeline needs a token, key, certificate or password, or a secret may have leaked into logs, caches, artifacts or image layers
keywords: secrets, masked, protected variable, environment secret, OIDC, add-mask, leaked secret, rotate, build secret, artifact leak
priority: high
related: github-actions-security.md, gitlab-ci.md, image-build-ci.md, destructive-pipeline-actions.md
---

# Secrets in Pipelines

**Load when:** a pipeline needs a credential. Secret stores (SOPS, Vault/OpenBao, External Secrets), rotation design and Kubernetes Secrets belong to `devops-secrets`; scanning a repo for leaks belongs to `security-expert`. This file covers the CI side only. Never print a secret value in output or chat: names and keys only.

## Order of preference

1. **No secret**: OIDC federation. GitHub: `permissions: id-token: write` and a trust rule on the target bound to repository + environment claims. GitLab: `id_tokens:` with a custom `aud`. The job gets a short-lived credential valid for that job.
2. **Secret manager fetch at run time** (OpenBao/Vault via JWT login after OIDC), scoped to a role per environment.
3. **Platform secret**, scoped as narrowly as possible: GitHub environment secret (behind required reviewers) over repository secret over organization secret; GitLab project/group variable that is **masked** (or masked and hidden), **protected**, and **environment-scoped**.

## Rules

- Never put secrets in the pipeline file, in `.env` files in the repo, in `docker build --build-arg`, in the cache, or in artifacts (anyone with read access can read caches and artifacts; provenance records build args on public repos).
- Any user with write access to a GitHub repo can read its repository secrets via a workflow they can push: protect branches and use environments with reviewers for anything sensitive.
- Redaction is best effort: transformed values (Base64, URL-encoded, JWTs derived from a secret) are not masked unless registered (`::add-mask::` on GitHub). Do not store structured JSON/YAML as one secret.
- Secrets are exposed only to the steps that need them: set `env:` on the one step, not the job. Avoid passing secrets as command-line arguments (visible in process lists); use stdin or files with restrictive permissions.
- Fork and external PRs get no secrets (GitHub `pull_request` from forks; GitLab fork pipelines cannot read parent variables). Do not "fix" this with `pull_request_target` + PR checkout.
- GitLab YAML values: quote them; `.gitlab-ci.yml` variables are readable by everyone with repo access.
- Production deploy credentials exist only in the production environment/role, never in a repository-wide variable.
- Self-hosted runners: credentials must not sit on the host; use ephemeral runners ([github-actions-security.md](github-actions-security.md)).

## If a secret leaked (pipeline log, artifact, cache, image layer)

```
ACTION   rotate the credential at its issuer FIRST, then purge the copies (log, artifact, cache, image tag)
EFFECT   everything using the old credential breaks until updated; purging logs/artifacts removes audit evidence
PROOF    old credential rejected by the issuer; new one stored in the secret store; pipeline green with the new one
WAIT-FOR-GO
```

Deleting the log does not make the secret safe; the provider's guidance is to delete the log **and** rotate. For deleting runs/artifacts/caches see [destructive-pipeline-actions.md](destructive-pipeline-actions.md).

## Sources (read 2026-11-10)

- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/concepts/security/openid-connect
- https://docs.gitlab.com/ci/variables/ , https://docs.gitlab.com/ci/secrets/id_token_authentication/
- https://docs.docker.com/build/ci/github-actions/attestations/ (build-arg exposure in provenance)

## Not verified

- GitLab "Masked and hidden" visibility details and GitLab Secrets Manager / `secrets:` keyword providers were not read beyond the variables and ID-token pages.
- "Avoid secrets on the command line" is general hardening advice, not from the pages above.
