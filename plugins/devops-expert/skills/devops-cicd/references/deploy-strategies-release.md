---
name: deploy-strategies-release
description: Deployment strategies driven from CI (rolling, blue-green, canary, progressive delivery pointer), GitOps handoff, release automation and versioning, rollback design and database migration compatibility
when-to-use: Designing the deploy/promote stage of a pipeline, choosing how to ship a risky change, automating releases and version tags, or planning rollback
keywords: rolling update, blue-green, canary, progressive delivery, feature flag, semver, release notes, tag, rollback, expand contract, migration, GitOps handoff
priority: high
related: destructive-pipeline-actions.md, pipeline-design.md, image-build-ci.md, github-actions-workflows.md, gitlab-ci.md
---

# Deployment Strategies and Releases

**Load when:** the pipeline's last stages are being designed or a release process is being automated. Every command here that changes production is carded in [destructive-pipeline-actions.md](destructive-pipeline-actions.md).

## Who performs the deploy

| Model | How | When |
|-------|-----|------|
| **Push from CI** | job runs the platform command (`kubectl`, `helm`, `docker compose`, SSH, Ansible) with a short-lived credential (OIDC) | VMs, Compose hosts, small clusters without a GitOps controller |
| **GitOps handoff** | CI builds the artifact, then commits the new digest/version to the config repo (or opens a PR); the in-cluster controller applies it | Kubernetes with Argo CD or Flux. Mechanics: `devops-gitops-packaging`; do not also `kubectl apply` from CI against a GitOps-managed namespace |

CI should hold no standing production credentials. Prefer OIDC federation ([github-actions-security.md](github-actions-security.md), [gitlab-ci.md](gitlab-ci.md)) or the pull model.

## Strategies

| Strategy | Mechanism | Rollback | Costs |
|----------|-----------|----------|-------|
| **Rolling** | replace instances gradually (Kubernetes Deployment `RollingUpdate`, Compose/Ansible batches) | roll back to previous revision/artifact | old and new versions run together: API and schema must be compatible |
| **Blue-green** | two full environments, switch traffic (router, Gateway weight, DNS) after checks | switch back (fast) | double capacity; data/migration coordination |
| **Canary** | send a small traffic share to the new version, widen on healthy metrics | send weight back to 0 | needs traffic splitting and automated metric checks |
| **Recreate** | stop old, start new | redeploy old | downtime; only for singletons |
| **Feature flag** | ship dark, enable per cohort | disable the flag | flag debt; flag service as dependency |

Kubernetes specifics (Deployment `strategy`, probes, PDB) live in `devops-kubernetes`; weighted routing with Gateway API HTTPRoute `backendRefs` weights is in its `services-gateway-api.md`. Progressive delivery controllers (Argo Rollouts, Flagger) automate canary/blue-green with metric analysis: pointer only, see `devops-gitops-packaging` and `devops-observability`; not evaluated here.

Gate every strategy with: readiness/health endpoint, a smoke test, and a metric check (error rate, latency) over a defined window; a failed gate triggers rollback automatically for canary and by decision for the rest.

## Release automation and versioning

- **Semantic Versioning** (`MAJOR.MINOR.PATCH`) for anything with consumers; tags `vX.Y.Z` on the default branch commit that CI already built. The tag is created by a human or by the project's commit/release agent after review; the tag push triggers the release workflow ([templates/github-release.yml](templates/github-release.yml): `gh release create <tag> --verify-tag --generate-notes --draft`, human publishes).
- Version is derived from the tag at build time and stamped into the artifact (image label `org.opencontainers.image.version` from `docker/metadata-action`), never edited into code by the pipeline.
- Changelog: conventional-commit history or GitHub generated release notes (`--generate-notes`, `--notes-start-tag`). GitLab: the `release:` job keyword (`tag_name`, `name`, `description`; runs after `script`, image `registry.gitlab.com/gitlab-org/cli`) creates a release on tag push.
- Release candidates: pre-release tags (`v1.4.0-rc.1`) deploy to staging/pre-production only.
- Draft first, publish after smoke test; publishing is the gated step.

## Rollback design

1. Write down the previous artifact reference (digest) before every production deploy; pipelines should print it and store it with the deployment record.
2. Rollback = deploy the previous artifact through the **same** pipeline and gates; never hand-edit production.
3. **Database changes are the rollback killer.** Use expand/contract: release N adds nullable columns/tables (backward compatible), release N+1 starts using them, release N+2 drops the old ones. Then code can roll back without a down-migration. Run migrations as a separate, reviewed step with a backup first (`devops-databases`, `devops-storage-backup`).
4. GitLab: rollback by re-running an earlier deploy job from the Environments page; "Prevent outdated deployment jobs" otherwise blocks old deploy jobs, with retries for rollback deployments allowed by default.
5. Time-box: if a deploy does not pass its gate within the window, roll back first, diagnose second.

## Sources (read 2026-11-10)

- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- https://docs.gitlab.com/ci/environments/deployment_safety/ , https://docs.gitlab.com/ci/yaml/ (`release`, `environment`)
- `gh release create --help` (gh 2.103.3); README of docker/metadata-action

## Not verified

- Strategy mechanics (rolling, blue-green, canary, expand/contract, SemVer) are general practice, not read from vendor pages today.
- Argo Rollouts / Flagger capabilities and versions, release-automation tools (release-please, semantic-release and similar) were not evaluated.
- Whether the `release:` keyword still requires `registry.gitlab.com/gitlab-org/cli` in every GitLab version (read from the 19.x docs example only).
