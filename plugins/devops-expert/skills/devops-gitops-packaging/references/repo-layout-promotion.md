---
name: repo-layout-promotion
description: GitOps repository layout, environment promotion, drift handling, rollback and the pointer to secrets
when-to-use: Designing a GitOps repo, promoting a version from staging to production, reverting a bad release, or handling drift
keywords: monorepo, repo per environment, promotion, pull request, drift, rollback, revert, secrets in git, SOPS, ExternalSecret
priority: high
related: argocd-applications.md, flux.md, helm-release-ops.md, kustomize.md
---

# Repository Layout, Promotion, Drift, Rollback

**Load when:** you decide where manifests live, how a change moves between environments, or how to undo it. Tree and flow: [gitops-repo-layout.md](templates/gitops-repo-layout.md).

## Layout decision

| Option | Use when | Cost |
|--------|----------|------|
| **Monorepo**, folders per environment (`apps/base`, `apps/staging`, `apps/production`, `infrastructure/...`, `clusters/<name>`) | One team, trunk-based, few clusters (Flux guide's default) | Everyone can read production config; access control only through the Git host |
| **Repo per environment** | Production config needs restricted access and a small review scope | Promotion is a cross-repo PR, slower for infra changes |
| **Repo per team** (platform repo + dev team repos referenced by `GitRepository`/`Application`) | Platform team owns cluster add-ons, dev teams own app definitions | More objects; needs multi-tenancy lockdown (service accounts, AppProject limits) |
| **Repo per app** (manifests next to code, config repo holds a pointer) | App team owns deployment manifests | Two repos per change; pin the pointer to a tag |

Separate `infrastructure/` (controllers, CRDs, then shared config) from `apps/` so the controller reconciles them in order (Flux `dependsOn`; Argo CD sync waves or separate Applications). Branches are short-lived; do not model environments as long-lived branches.

## Promotion

| Step | Rule |
|------|------|
| Build once | CI produces one image (tag plus digest) and one chart version; environments differ only in config (devops-cicd, devops-docker) |
| Staging | Automatic: Flux image automation or a CI commit to `staging` overlay |
| Production | A pull request that changes only the version or digest in the production overlay/values; reviewer sees the rendered diff (`helm diff`, `kustomize build` diff, `argocd app diff`, `flux diff`) attached by CI |
| Gate | Staging healthy (controller `Healthy`/`Ready`, smoke test passes) before the PR merges; progressive delivery (Flagger, Argo Rollouts) is out of scope here |
| Pin | `targetRevision`, chart `version`, image digest: tag or SHA, never `HEAD`/`latest` |
| Record | PR description lists previous version (rollback target), digest and evidence |

## Drift

| Source of drift | Handling |
|-----------------|----------|
| Manual `kubectl edit`/`patch` | Controller reverts (Argo CD `selfHeal`, Flux interval); decide per environment whether to auto-correct or alert only |
| Controller-written fields (HPA replicas, webhook `caBundle`) | Declare it: Argo CD `ignoreDifferences`, Flux HelmRelease `driftDetection.ignore` |
| Helm release modified with the CLI | A second owner; stop it, reconcile from Git |
| Suspended reconciliation | Drift accumulates silently; list suspended objects (`flux get all -A` shows SUSPENDED) in every review |

## Rollback

| Layer | Rollback | Note |
|-------|----------|------|
| Git (preferred) | `git revert <sha>` through a PR; controller applies the old state | Works for every tool; the audit trail stays; propose, the commit agent commits |
| Argo CD | `argocd app rollback` needs auto-sync off, and Git still holds the new version | Use for an emergency, then revert in Git |
| Flux | Revert in Git; `flux suspend` to freeze while deciding | HelmRelease `upgrade.remediation` can roll back automatically on failure |
| Helm CLI | `helm rollback` (see helm-release-ops.md) | Only for releases not owned by a controller |
| Data | Not rolled back by any of the above | Migrations and PVC contents need backups (devops-storage-backup) |

## Secrets pointer

No secret value in a manifest, values file, Application parameter or Kustomize literal. Git holds either encrypted files (SOPS with age: Flux decrypts with `spec.decryption`; Argo CD needs a plugin or the repo-server setup) or references (`ExternalSecret`, existing `secretName` in a chart). Encryption, key custody and rotation: **devops-secrets**. Flux guides exist for SOPS and Sealed Secrets (https://fluxcd.io/flux/guides/mozilla-sops/ , .../sealed-secrets/).

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Promotion by rebuilding the image per environment | Production runs something never tested |
| Environment branches that diverge | Merge conflicts and forgotten fixes; use folders |
| Auto-merge of version bumps to production | Removes the human gate that the layout exists for |
| App and infra in one Kustomization/Application | CRD not ready when the CR applies; split and order |
| Renovate/automation PR without rendered diff | Hidden default changes in a chart upgrade |

## Verification

For a promotion: PR shows a rendered diff limited to the intended version; after merge the controller reports the expected revision (`argocd app get`, `flux get kustomizations`), workloads roll out (`kubectl rollout status`), and the user-facing check passes.

## Sources (read 2026-11-10)

- https://fluxcd.io/flux/guides/repository-structure/
- https://fluxcd.io/flux/guides/image-update/ (staging automatic, production through a pull request)
- https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/ , .../user-guide/diffing/ , .../user-guide/auto_sync/
- https://raw.githubusercontent.com/fluxcd/flux2-kustomize-helm-example/main/clusters/staging/infrastructure.yaml

## Not verified

- How to ignore controller-written fields in a Flux Kustomization (only HelmRelease `driftDetection.ignore` was read).
- Argo CD SOPS integration specifics, Flux `spec.decryption` field body (listed in the Kustomization index only), the two Flux secrets guides (not opened).
- Flagger and Argo Rollouts (named only as out of scope).
