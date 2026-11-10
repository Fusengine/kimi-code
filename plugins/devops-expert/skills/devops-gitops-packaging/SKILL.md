---
name: devops-gitops-packaging
description: Use when packaging or delivering workloads to Kubernetes - Helm 4 charts (values, values.schema.json, dependencies, OCI registries, upgrade/rollback/test), Kustomize bases, overlays, patches and components, choosing Helm vs Kustomize vs both, Argo CD (Application, ApplicationSet, AppProject, sync policy, waves, hooks, app-of-apps), Flux (GitRepository, OCIRepository, Kustomization, HelmRelease, image automation), GitOps repository layout, promotion between environments, drift and rollback. Not for the Kubernetes resources themselves (devops-kubernetes), cluster install or upgrade (devops-k8s-cluster), CI pipelines that build images (devops-cicd) or secret stores (devops-secrets).
versions:
  helm: "4.3.1 (helm.sh docs 'Version: 4.3.1')"
  kustomize: "5.8.3"
  argo-cd: "3.6.1 (released 2026-11-04)"
  flux: "2.10.0 (released 2026-10-26)"
references:
  - references/helm-4-changes.md
  - references/helm-chart-authoring.md
  - references/helm-release-ops.md
  - references/kustomize.md
  - references/helm-vs-kustomize.md
  - references/argocd-applications.md
  - references/argocd-applicationset-appofapps.md
  - references/flux.md
  - references/flux-image-automation.md
  - references/repo-layout-promotion.md
  - references/templates/chart/Chart.yaml
  - references/templates/chart/values.yaml
  - references/templates/chart/values.schema.json
  - references/templates/chart/templates/_helpers.tpl
  - references/templates/chart/templates/deployment.yaml
  - references/templates/kustomize/base/kustomization.yaml
  - references/templates/kustomize/base/deployment.yaml
  - references/templates/kustomize/overlays/prod/kustomization.yaml
  - references/templates/kustomize/components/ingress-tls/kustomization.yaml
  - references/templates/argocd/appproject.yaml
  - references/templates/argocd/application.yaml
  - references/templates/argocd/applicationset.yaml
  - references/templates/flux/gitrepository.yaml
  - references/templates/flux/kustomization.yaml
  - references/templates/flux/helmrelease.yaml
  - references/templates/flux/image-automation.yaml
  - references/templates/gitops-repo-layout.md
related-skills:
  - devops-kubernetes
  - devops-k8s-cluster
  - devops-secrets
  - devops-cicd
  - devops-docker
  - devops-observability
  - devops-sre-ops
---

<objective>
Covers turning manifests into a versioned, reviewable, reversible delivery:
Helm 4 charts and releases, Kustomize overlays, the Helm vs Kustomize choice,
Argo CD and Flux controllers, repository layout, promotion, drift and rollback.
Does not cover the Kubernetes objects themselves (devops-kubernetes), cluster
build and upgrade (devops-k8s-cluster), the CI that builds and signs images
(devops-cicd, devops-docker) or secret stores (devops-secrets).
</objective>

# DevOps GitOps and Packaging

## Agent Workflow (MANDATORY)

Before ANY chart, overlay, Application or Flux object, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find existing `Chart.yaml`, `kustomization.yaml`, Argo CD or Flux manifests and the repo layout
2. **research-expert** - verify fields and flags for the installed tool version at helm.sh, kubectl.docs.kubernetes.io, argo-cd.readthedocs.io, fluxcd.io
3. **mcp__context7__query-docs** - `/websites/helm_sh`, `/helm/helm`, `/kubernetes-sigs/kustomize`, `/websites/argo-cd_readthedocs_io_en_stable`, `/websites/fluxcd_io_flux`

Then read the target read-only (`helm version`, `helm list -A`, `argocd version`, `flux check`, `kubectl get crd | grep -E 'argoproj|fluxcd'`). After changes, run **sniper**.

## Versions (checked 2026-11-10)

Helm 4.3.1 (https://helm.sh/docs/overview/), Kustomize 5.8.3 (https://github.com/kubernetes-sigs/kustomize/releases), Argo CD 3.6.1 (https://github.com/argoproj/argo-cd/releases/tag/v3.6.1), Flux 2.10.0 (https://github.com/fluxcd/flux2/releases/tag/v2.10.0). API versions used here: `argoproj.io/v1alpha1`, `source.toolkit.fluxcd.io/v1`, `kustomize.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, `image.toolkit.fluxcd.io/v1`, `kustomize.config.k8s.io/v1beta1`. Read the installed version first (`helm version`, `argocd version`, `flux version`); the CRDs on the cluster win over this file.

## Overview

| Area | Decision in one line |
|------|----------------------|
| **Packaging** | Helm for third-party or parameterised apps; Kustomize for your own plain manifests; both only with a stated reason ([helm-vs-kustomize.md](references/helm-vs-kustomize.md)) |
| **Helm 4** | Server-side apply default for new releases, `--atomic` renamed `--rollback-on-failure`, `--force` renamed `--force-replace`, post-renderers are plugins ([helm-4-changes.md](references/helm-4-changes.md)) |
| **Controller** | Argo CD when a UI, multi-cluster and per-app RBAC matter; Flux when everything should be CRDs reconciled in-cluster; one controller per cluster, never both on the same objects |
| **Delivery** | Git is the source of truth; change Git, not the cluster; pin charts and images by version or digest |
| **Pruning** | Off by default or `confirm`; a prune is a delete (see Critical Rules) |
| **Promotion** | One artifact, environment-specific config only; promote by PR, not by rebuilding ([repo-layout-promotion.md](references/repo-layout-promotion.md)) |

## Critical Rules

1. **Version first** - read the tool versions and the CRDs on the cluster before writing a field; an apiVersion not in the cluster is not usable
2. **Render, then diff, then apply** - `helm template` / `kustomize build`, then `helm diff upgrade` or `kubectl diff`, `argocd app diff`, `flux diff kustomization`; never sync blind
3. **Destructive verbs are proposed, not run** - `helm uninstall`, `helm rollback`, Argo CD sync with prune, `argocd app delete --cascade`, `flux delete`, `flux suspend`, `kustomize build | kubectl delete -f -`: exact ACTION / EFFECT / PROOF, then WAIT-FOR-GO ([helm-release-ops.md](references/helm-release-ops.md))
4. **Never hand-edit a GitOps-owned object** - the controller reverts it; the fix is a commit
5. **No secret value in Git or in output** - names and keys only, values via devops-secrets (SOPS, External Secrets); `helm template`/`--dry-run` print Secrets, so use `--hide-secret`
6. **Pin everything** - chart version, `targetRevision` as tag or SHA, image tag plus digest; no `HEAD`, `latest` or floating range in production
7. **Never invent a field or flag** - cite the official page; unknown = "not verified"

## Architecture

```
gitops/
├── charts/<app>/            # Helm chart (Chart.yaml, values.yaml, values.schema.json, templates/)
├── apps/<app>/base/         # Kustomize base
├── apps/<app>/overlays/{staging,prod}/
├── clusters/{staging,prod}/ # per-cluster entry: Flux Kustomizations or Argo CD Applications
└── infrastructure/          # controllers and shared config, reconciled before apps
```

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Helm 4 changes** | [helm-4-changes.md](references/helm-4-changes.md) | Moving from Helm 3, CI flags, SSA, plugins |
| **Chart authoring** | [helm-chart-authoring.md](references/helm-chart-authoring.md) | Structure, values, schema, dependencies, hooks, tests |
| **Release operations** | [helm-release-ops.md](references/helm-release-ops.md) | OCI push/pull, diff, upgrade, rollback, uninstall |
| **Kustomize** | [kustomize.md](references/kustomize.md) | Bases, overlays, patches, generators, components |
| **Helm vs Kustomize** | [helm-vs-kustomize.md](references/helm-vs-kustomize.md) | Choosing, combining, `helmCharts` limits |
| **Argo CD** | [argocd-applications.md](references/argocd-applications.md) | Application, AppProject, sync policy, waves, hooks, deletion |
| **ApplicationSet** | [argocd-applicationset-appofapps.md](references/argocd-applicationset-appofapps.md) | Many apps or clusters, app-of-apps |
| **Flux** | [flux.md](references/flux.md) | Sources, Kustomization, HelmRelease, suspend/delete |
| **Flux image automation** | [flux-image-automation.md](references/flux-image-automation.md) | Tag scanning and commits back to Git |
| **Layout and promotion** | [repo-layout-promotion.md](references/repo-layout-promotion.md) | Environments, promotion, drift, rollback, secrets pointer |

### Templates

| Template | When to Use |
|----------|-------------|
| [chart/](references/templates/chart/Chart.yaml) | Minimal chart with `values.schema.json` (Helm templates are not parseable YAML) |
| [kustomize/](references/templates/kustomize/base/kustomization.yaml) | Base + prod overlay + component |
| [argocd/appproject.yaml](references/templates/argocd/appproject.yaml) | Project limiting repos, destinations, resource kinds |
| [argocd/application.yaml](references/templates/argocd/application.yaml) | Application with manual-prune safe sync policy |
| [argocd/applicationset.yaml](references/templates/argocd/applicationset.yaml) | One app per environment directory |
| [flux/gitrepository.yaml](references/templates/flux/gitrepository.yaml) | Git source |
| [flux/kustomization.yaml](references/templates/flux/kustomization.yaml) | Reconcile a path with ordering and health checks |
| [flux/helmrelease.yaml](references/templates/flux/helmrelease.yaml) | OCI chart, remediation, drift detection |
| [flux/image-automation.yaml](references/templates/flux/image-automation.yaml) | ImageRepository, ImagePolicy, ImageUpdateAutomation |
| [gitops-repo-layout.md](references/templates/gitops-repo-layout.md) | Repository tree and promotion flow |

## Quick Reference

```bash
CTX=prod-eu; NS=shop                                              # always explicit
helm template web ./charts/web -f values-prod.yaml --hide-secret >/dev/null   # render only
helm --kube-context "$CTX" -n "$NS" diff upgrade web ./charts/web -f values-prod.yaml   # helm-diff plugin
helm --kube-context "$CTX" -n "$NS" upgrade web ./charts/web -f values-prod.yaml --dry-run=server --hide-secret
kustomize build apps/web/overlays/prod | kubectl --context "$CTX" diff -f -   # exit 1 = differences
argocd app diff web --refresh                                     # exit 1 = differences
flux diff kustomization web --path ./apps/web/overlays/prod       # exit 1 = differences
flux reconcile kustomization web --with-source                    # after the user's go
```

## Best Practices

### DO
- Add `values.schema.json` to every chart you own so bad values fail at render time
- Keep one Application or Kustomization per deployable unit, with `dependsOn` or sync waves for ordering
- Give Argo CD `AppProject` or Flux service accounts the narrowest repos, namespaces and kinds
- Record the rollback target (chart version, Git SHA, Helm revision) in the change proposal

### DON'T
- Enable automated prune or `selfHeal` on a production Application without the owner's go
- Run `helm upgrade --reuse-values` across chart versions (stale values hide new defaults)
- Let Argo CD and Flux, or Helm CLI and a controller, manage the same release
- Template secrets into values files committed in clear text
