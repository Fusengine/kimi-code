---
name: helm-vs-kustomize
description: Choosing Helm, Kustomize or both - decision rules, combination patterns, limits of helmCharts and of controller rendering
when-to-use: Starting a new app delivery, adopting a third-party chart, or an overlay fight with a chart
keywords: helm vs kustomize, helmCharts, post-render, HelmRelease patches, Argo CD kustomize helm, wrapper chart
priority: high
related: kustomize.md, helm-chart-authoring.md, argocd-applications.md, flux.md
---

# Helm vs Kustomize vs both

**Load when:** you must decide how an app is packaged and customized per environment.

## Decision table

| Situation | Choice | Why |
|-----------|--------|-----|
| Third-party app with a maintained chart (ingress controller, database operator, monitoring) | Helm chart + values per environment | You consume upstream versions; values are the supported interface |
| Your own service, few environment differences | Kustomize base + overlays | Plain YAML stays reviewable; no templating language |
| Your own service distributed to others, or many parameters, conditional blocks, tests | Helm chart with `values.schema.json` | Parameters, validation, `helm test`, versioned artifact in OCI |
| Chart lacks one field you need | Patch the rendered output instead of forking | See combination patterns below |
| Same app in 20 clusters with small differences | Helm chart (values) or Kustomize overlays, driven by ApplicationSet or Flux Kustomization per cluster | Controller generates the per-cluster object |
| Need ordering, hooks, rollback history inside the release | Helm | Release object with revisions and hooks |
| Need to avoid a release object and Helm state | Kustomize, or render Helm to YAML and commit it | Git holds the final manifests |

Rule of thumb: one packaging tool per app; add the second only to patch what the first cannot express.

## Combination patterns

| Pattern | How | Watch out |
|---------|-----|-----------|
| Flux `HelmRelease` + Kustomize overlay | Overlay patches the `HelmRelease` object (values) per environment: `patches` with `target.kind: HelmRelease` (pattern used by the Flux `flux2-kustomize-helm-example` repo) | You patch values, not chart output |
| Flux `HelmRelease` post-render | `.spec.postRenderers` supports Kustomize patches on the rendered chart (listed in the HelmRelease spec index; exact fields not read today) | Last resort; keeps drift between chart and patch |
| Argo CD Application with `source.kustomize` | Kustomize options in the Application (`images`, `patches`, `components`, `namePrefix`) | Overrides live in the Application, not in Git folders: keep them small |
| Argo CD Application with `source.helm` | `valueFiles` (relative to `source.path`), `valuesObject`, `parameters`, `releaseName`, `skipCrds`, `skipSchemaValidation` | Argo CD renders with `helm template`: Helm hooks map to Argo CD hooks, `lookup` and release history do not exist |
| Kustomize `helmCharts` | `kustomize build --enable-helm` inflates a chart inside a kustomization | Intentionally limited: no private repository or registry authentication, no post-renderer; a KRM function is planned (kustomize issue 4401) |
| Wrapper chart | Your chart depends on the upstream chart and sets values | Another chart version to maintain; use when you also add your own templates |

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Helm release and Argo CD both think they own the release | Argo CD deploys with `helm template`; `helm list` shows nothing. Pick one |
| Chart upgraded through Renovate/Dependabot without a render diff | Silent default changes; CI must run `helm template` before and after and diff |
| Overlay patches a generated name that changes between chart versions | Patch breaks on upgrade; patch by `kind` and labels |
| Values duplicated across overlays | Keep a shared `values-common.yaml` and small per-environment files (`-f` order: last wins) |

## Verification

Render both before and after the change (`helm template` or `kustomize build`), diff the outputs, and run `kubectl apply --dry-run=server` on the final manifests.

## Sources (read 2026-11-10)

- https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/helmcharts/
- https://argo-cd.readthedocs.io/en/stable/operator-manual/application.yaml
- https://fluxcd.io/flux/components/helm/helmreleases/ , https://fluxcd.io/flux/guides/repository-structure/
- https://raw.githubusercontent.com/fluxcd/flux2-kustomize-helm-example/main/apps/staging/kustomization.yaml

## Not verified

- `HelmRelease.spec.postRenderers` field shape (named in the page index, body not read).
- The claim that Argo CD maps Helm hooks and has no `lookup` is general Argo CD behaviour; the sync-waves page confirms hook mapping only in passing.
- Wrapper chart pattern is general practice, not sourced.
