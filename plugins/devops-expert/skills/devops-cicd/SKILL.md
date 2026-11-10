---
name: devops-cicd
description: Use when writing, reviewing or debugging CI/CD pipelines for self-hosted infrastructure - GitHub Actions (workflows, reusable workflows, composite actions, matrix, concurrency, caching, environments with required reviewers, OIDC instead of stored secrets, pinning actions by SHA or lockfile, permissions least privilege, self-hosted runners), GitLab CI (rules, needs, includes and components, environments, resource_group, protected variables, runners and executors), pointers for Jenkins / Forgejo-Gitea Actions / Woodpecker, pipeline design (build once promote many, quality gates, speed), image builds in CI (BuildKit cache, multi-arch, provenance/SBOM/signing), deploy strategies and rollback, release automation and pipeline troubleshooting. Not for GitOps controllers, Helm or Kustomize (devops-gitops-packaging), Dockerfile and registry craft (devops-docker), secret stores (devops-secrets), language-specific CI gates (framework experts), repo commit/release flow (commit agent) or a supply-chain audit (security-expert).
versions:
  github-actions-runner: "2.338.2 (actions/runner release 2026-10-26)"
  github-hosted-runner-labels: "ubuntu-latest = ubuntu-24.04; ubuntu-26.04 and ubuntu-24.04-arm available"
  gitlab: "19.5 released (19.6 upcoming); GitLab Runner 19.5.3 (2026-11-06)"
  actions-pinned-in-templates: "checkout v7.0.1, upload-artifact v7.0.2, setup-node v7.1.0, docker/build-push-action v7.4.0, actions/attest v4.2.2"
references:
  - references/github-actions-workflows.md
  - references/github-actions-security.md
  - references/gitlab-ci.md
  - references/other-ci-systems.md
  - references/pipeline-design.md
  - references/image-build-ci.md
  - references/deploy-strategies-release.md
  - references/pipeline-secrets.md
  - references/destructive-pipeline-actions.md
  - references/troubleshooting.md
  - references/templates/github-ci.yml
  - references/templates/github-reusable-workflow.yml
  - references/templates/github-composite-action.yml
  - references/templates/github-oidc-deploy.yml
  - references/templates/github-image-build-push.yml
  - references/templates/github-release.yml
  - references/templates/gitlab-ci.yml
  - references/templates/gitlab-component.yml
related-skills:
  - devops-gitops-packaging
  - devops-docker
  - devops-secrets
  - devops-kubernetes
  - devops-iac
  - devops-ansible
  - devops-observability
  - devops-sre-ops
---

<objective>
Covers designing, writing and troubleshooting CI/CD pipelines: GitHub Actions and
GitLab CI in depth, pointers for Jenkins, Forgejo/Gitea Actions and Woodpecker,
build-once-promote-many design, container image builds in CI, deployment
strategies, release automation, rollback and pipeline secrets. Does not cover
GitOps controllers and packaging (devops-gitops-packaging), Dockerfile and
registry practice (devops-docker), secret stores (devops-secrets), language CI
gates (framework experts) or supply-chain audits (security-expert).
</objective>

# DevOps CI/CD

## Agent Workflow (MANDATORY)

Before ANY pipeline change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find existing workflows (`.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`, `.woodpecker`), scripts they call, runners/labels in use, environments, how deploys reach the target
2. **research-expert** - verify the keyword, action version and runner image for the platform version in use at docs.github.com / docs.gitlab.com
3. **mcp__context7__query-docs** - confirm action inputs and CLI flags

Then read the platform state read-only (`gh run list`, `gh workflow list`, `gh api .../environments`, CI Lint, runner status). After writing files, run **sniper**; run `actionlint` on GitHub workflows when installed.

## Versions (checked 2026-11-10)

| Item | Version | Source |
|------|---------|--------|
| actions/runner | 2.338.2 (2026-10-26) | `gh api repos/actions/runner/releases/latest` |
| GitHub-hosted labels | `ubuntu-latest` = 24.04; `ubuntu-24.04`, `ubuntu-22.04`, `ubuntu-26.04`, `ubuntu-slim`, `*-arm` | https://docs.github.com/en/actions/reference/runners/github-hosted-runners |
| actions/checkout | v7.0.1 (2026-07-20) | `gh api` |
| upload / download-artifact | v7.0.2 / v8.0.2 (2026-10-07) | `gh api` |
| actions/cache | v6.1.0 (2026-06-26) | `gh api` |
| actions/setup-node | v7.1.0 (2026-10-08) | `gh api` |
| docker/{setup-buildx, build-push, login, metadata, setup-qemu} | v4.4.1 / v7.4.0 / v4.8.0 / v6.2.0 / v4.4.0 | `gh api` |
| actions/attest | v4.2.2 (2026-08-04); `attest-build-provenance` v4 is a wrapper | `gh api`, README |
| sigstore/cosign-installer | v4.1.3 (2026-11-04) | `gh api` |
| actionlint | v1.7.12 (2026-03-30), not installed locally | `gh api` |
| GitLab | 19.5 (19.6 upcoming); Runner 19.5.3 | docs release notes, GitLab.com releases API |
| Jenkins / Forgejo / Woodpecker | 2.590 (LTS 2.580.2) / 17.0.1 (LTS 15.0.11) / 3.20.1 | [other-ci-systems.md](references/other-ci-systems.md) |

Docs examples often lag the latest action majors: use the SHA/tag from the release, and re-check with `gh api repos/<owner>/<action>/releases/latest` and `gh api repos/<owner>/<action>/commits/<tag> --jq .sha` before pinning.

## Overview

| Area | Decision in one line |
|------|----------------------|
| **Artifact** | Build once, promote the same immutable artifact (image digest) through every environment |
| **Permissions** | `permissions: {}` at the top, widen per job; `GITHUB_TOKEN` read-only by default |
| **Actions** | Pin third-party actions by full SHA or lockfile; Dependabot raises bumps |
| **Credentials** | OIDC federation, bound to repo + environment claims; no long-lived cloud/SSH keys in CI |
| **Production** | Environment with required reviewers (GitHub) / protected environment + manual job (GitLab), serialised, never auto-cancelled |
| **Runners** | Ephemeral or private-only; never self-hosted on public repos; separate runner group for deploys |
| **Speed** | Parallel jobs, DAG (`needs`), lockfile-keyed cache, external BuildKit cache, cancel redundant PR runs |
| **Deploy model** | CI hands off to GitOps when a controller owns the cluster; otherwise push with a short-lived credential |

## Critical Rules

1. **Read before writing** - inspect existing workflows, runners, environments and what the deploy step actually touches
2. **Pin and constrain** - SHA/lockfile pins, `permissions`, `timeout-minutes` on every job
3. **No untrusted `${{ }}` in `run:`** - pass through `env:`; never check out PR code under `pull_request_target`/`workflow_run`
4. **Production and destructive pipeline actions are proposed, not run** - deploy, forced re-run, rollback, deleting environments/releases/tags/artifacts, unregistering runners: ACTION / EFFECT / PROOF / WAIT-FOR-GO in [destructive-pipeline-actions.md](references/destructive-pipeline-actions.md)
5. **Never print a secret value** - names only; stores and rotation are `devops-secrets`
6. **Never invent a keyword, input or version** - cite the docs page or release; unknown = "not verified"
7. **Troubleshoot in order** - run, class, log, reproduce, one change, prove ([troubleshooting.md](references/troubleshooting.md))

## Architecture

```
repo/
├── .github/
│   ├── workflows/ci.yml          # PR + main: lint, test matrix, build, upload artifact
│   ├── workflows/image.yml       # build/push by digest, SBOM, provenance, sign
│   ├── workflows/deploy.yml      # workflow_dispatch, environment gate, OIDC
│   ├── workflows/release.yml     # tag -> draft release
│   └── actions/setup-project/    # composite action
└── .gitlab-ci.yml                # or: stages, rules, needs, environments, components
```

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **GitHub workflows** | [github-actions-workflows.md](references/github-actions-workflows.md) | Triggers, matrix, concurrency, reusable workflows, cache, environments |
| **GitHub security** | [github-actions-security.md](references/github-actions-security.md) | permissions, pinning, OIDC, injection, self-hosted runners |
| **GitLab CI** | [gitlab-ci.md](references/gitlab-ci.md) | rules, needs, components/inputs, environments, runners |
| **Other CI** | [other-ci-systems.md](references/other-ci-systems.md) | Jenkins, Forgejo/Gitea Actions, Woodpecker |
| **Pipeline design** | [pipeline-design.md](references/pipeline-design.md) | Stages, gates, branching, speed, flaky tests |
| **Image build** | [image-build-ci.md](references/image-build-ci.md) | BuildKit cache, multi-arch, provenance, SBOM, signing |
| **Deploy and release** | [deploy-strategies-release.md](references/deploy-strategies-release.md) | Rolling/blue-green/canary, versioning, rollback, migrations |
| **Pipeline secrets** | [pipeline-secrets.md](references/pipeline-secrets.md) | Scoping, masking, leaks |
| **Destructive actions** | [destructive-pipeline-actions.md](references/destructive-pipeline-actions.md) | Any prod deploy, re-run, rollback, delete, unregister |
| **Troubleshooting** | [troubleshooting.md](references/troubleshooting.md) | Red, queued, skipped or slow pipelines |

### Templates

| Template | When to Use |
|----------|-------------|
| [github-ci.yml](references/templates/github-ci.yml) | PR/main CI: lint, matrix tests, artifact |
| [github-reusable-workflow.yml](references/templates/github-reusable-workflow.yml) | Shared `workflow_call` job with typed inputs and secrets |
| [github-composite-action.yml](references/templates/github-composite-action.yml) | Shared steps as `action.yml` |
| [github-oidc-deploy.yml](references/templates/github-oidc-deploy.yml) | Gated production deploy with OIDC to OpenBao/Vault |
| [github-image-build-push.yml](references/templates/github-image-build-push.yml) | Multi-arch build, GHCR push, attestation, cosign |
| [github-release.yml](references/templates/github-release.yml) | Tag push to draft GitHub Release |
| [gitlab-ci.yml](references/templates/gitlab-ci.yml) | rules + needs + environments + protected prod job |
| [gitlab-component.yml](references/templates/gitlab-component.yml) | Versioned component with `spec:inputs` |

## Quick Reference

```bash
gh workflow list; gh run list --limit 10                 # read-only state
gh run view <id> --log-failed                            # why it failed
gh api repos/<o>/<r>/environments --jq '.environments[].name'
gh api repos/actions/checkout/commits/v7.0.1 --jq .sha   # SHA to pin
actionlint .github/workflows/*.yml                       # when installed
gh workflow run deploy.yml -f image-digest=sha256:...    # PRODUCTION: only after the user's go
```

## Best Practices

### DO
- Give every workflow `permissions`, `concurrency` and a `timeout-minutes` per job
- Hand deploys to GitOps (`devops-gitops-packaging`) where a controller exists
- Keep CI steps as scripts/make targets that run locally
- Record the previous artifact digest before each production deploy

### DON'T
- Rebuild per environment, deploy `latest`, or store cloud/SSH keys as long-lived CI secrets
- Run self-hosted persistent runners on public repositories
- Use `pull_request_target` with a PR checkout
- Set `cancel-in-progress: true` on deploy jobs
