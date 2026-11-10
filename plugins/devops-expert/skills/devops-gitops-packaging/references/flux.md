---
name: flux
description: Flux v2 - sources, Kustomization, HelmRelease, ordering, drift detection, diff, suspend, delete and bootstrap
when-to-use: Writing or changing GitRepository, OCIRepository, Kustomization or HelmRelease, or running flux suspend, resume, reconcile, delete
keywords: GitRepository, OCIRepository, Kustomization, HelmRelease, dependsOn, prune, deletionPolicy, driftDetection, flux diff, flux suspend, flux bootstrap
priority: critical
related: flux-image-automation.md, repo-layout-promotion.md, helm-vs-kustomize.md
---

# Flux

**Load when:** Flux objects or the `flux` CLI are involved. Version 2.10.0 (released 2026-10-26); API versions: `source.toolkit.fluxcd.io/v1`, `kustomize.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, `notification.toolkit.fluxcd.io/v1`, `image.toolkit.fluxcd.io/v1`. Templates: [gitrepository.yaml](templates/flux/gitrepository.yaml), [kustomization.yaml](templates/flux/kustomization.yaml), [helmrelease.yaml](templates/flux/helmrelease.yaml). Flux objects live in `flux-system` by default and the CLI uses that namespace unless `-n` or `--ns-follows-kube-context` is set.

## Model

Source (`GitRepository`, `OCIRepository`, `Bucket`, `HelmRepository`, `HelmChart`, `ExternalArtifact` behind a feature gate) produces an Artifact. `Kustomization` builds and applies it; `HelmRelease` installs a chart from an Artifact. Controllers re-apply every `.spec.interval` (Kustomization: server-side apply dry-run to detect and correct drift).

## Decision rules

| Question | Rule |
|----------|------|
| Git or OCI as the delivery artifact? | OCI (`flux push artifact`, `OCIRepository`) when CI builds an immutable bundle; Git when humans review manifests in PRs |
| `prune` | Required boolean on `Kustomization`. `true` deletes objects missing from the source and, with the default `deletionPolicy: MirrorPrune`, deletes everything when the Kustomization is deleted. Protect single objects with label or annotation `kustomize.toolkit.fluxcd.io/prune: disabled` |
| `deletionPolicy` | `MirrorPrune` (default), `Delete`, `WaitForTermination`, `Orphan`; set `Orphan` when the namespace is removed by other means |
| Ordering | `spec.dependsOn: [{name: ...}]` between Kustomizations plus `wait: true` or `healthChecks`; split `infrastructure` (controllers, then configs) from `apps` |
| Health | `healthChecks` (Deployments, HelmReleases, kstatus CRs) or `healthCheckExprs` (CEL); `timeout` bounds them |
| Intervals | `interval` min 60 s; `retryInterval` for failures; Git source 1-5 min, apps 10 min-1 h, with webhook Receivers for instant updates |
| `HelmRelease` chart source | `spec.chart` (template creating an `OCIRepository` or `HelmChart`) atomically changes values and chart version; `spec.chartRef` reuses one source across releases but values and version can land out of order |
| Remediation | `install.remediation.retries`, `upgrade.remediation.retries`; failed releases retry up to N times, then stop |
| Drift detection | `spec.driftDetection.mode: enabled` (corrects drift) with `ignore` paths per target kind (e.g. `/spec/replicas` for HPA) |
| Helm tests | `spec.test.enable: true` runs `helm test` after install/upgrade |
| Changing the chart name | helm-controller uninstalls the previous release before installing, unless `.spec.upgrade.chartNameChangeStrategy: InPlaceUpdate`: data loss risk |
| Multi-tenancy | `serviceAccountName` per Kustomization/HelmRelease, controllers started with `--no-cross-namespace-refs=true` |

## Commands

```bash
flux check                                                    # controllers and CRDs healthy
flux get all -A                                               # sources, kustomizations, helmreleases
flux build kustomization web --path ./apps/web/overlays/prod  # render as the controller would
flux diff kustomization web --path ./apps/web/overlays/prod   # server-side dry-run diff; exit 0 none, 1 diff, >1 error
flux reconcile source git flux-system ; flux reconcile kustomization web --with-source   # after the user's go
flux events --for Kustomization/web ; flux logs --kind=Kustomization --name=web          # evidence
flux bootstrap github --owner=ORG --repository=fleet --branch=main --path=clusters/prod --personal   # needs GITHUB_TOKEN env; user-run
```

## Destructive: propose, then the user's go

| Command | Exact effect | Before proposing |
|---------|--------------|------------------|
| `flux suspend kustomization <n>` / `helmrelease` / `source` | Stops reconciliation: new revisions are not applied **and drift is not corrected** until `flux resume`; `--all` suspends every resource of that kind in the namespace | State why and until when; a forgotten suspend is silent drift |
| `flux resume kustomization <n>` | Reconciles immediately: everything pending in Git (and every manual change reverted) lands at once | `flux diff kustomization` first |
| `flux delete kustomization <n>` | Deletes the Kustomization; with `prune: true` and `MirrorPrune` it **deletes all objects it applied** (asks for confirmation unless `--silent`) | `deletionPolicy`, `flux tree kustomization <n>` inventory, data objects, backups; consider `Orphan` |
| `flux delete helmrelease <n>` | Triggers uninstall of the Helm release | Same as `helm uninstall` effects |
| `flux uninstall` | Removes Flux from the cluster (the uninstall page was not read: effect on managed workloads and CRs is not verified; the Flux uninstall guide is at fluxcd.io/flux/installation/uninstall/) | Read that guide, then propose with the exact flags |

```
ACTION   flux -n flux-system delete kustomization shop-prod   (cluster prod-eu)
EFFECT   prune=true, deletionPolicy default: 14 objects deleted incl. PVC data-web (reclaimPolicy Delete)
PROOF    flux tree kustomization shop-prod output attached; set deletionPolicy: Orphan first to keep objects
WAIT-FOR-GO  yes
```

## Pitfalls

| Trap | Consequence |
|------|-------------|
| `HelmRelease` `chartRef` + values changed in the same commit | helm-controller may apply new values to the old chart first; use `spec.chart` for lockstep |
| `targetNamespace` that does not exist | Not created by Flux; ship the Namespace in the same Kustomization or an earlier one |
| `kubectl edit` on a Flux-owned object | Reverted at the next interval; suspend first only for a controlled experiment |
| Kustomization `path` points to a folder without `kustomization.yaml` | Flux generates one from all YAML there, including files you did not mean |
| Helm drift detection on a chart that writes status fields | Constant corrections; add `ignore` paths |

## Verification

`flux get kustomizations` / `helmreleases` show `Ready=True` at the expected revision; `kubectl get` of the workloads and the user-facing check. `Ready` is the controller's view: confirm the workload.

## Sources (read 2026-11-10)

- https://fluxcd.io/flux/components/kustomize/kustomizations/ , https://fluxcd.io/flux/components/helm/helmreleases/
- https://fluxcd.io/flux/components/source/gitrepositories/ , .../ocirepositories/ (index only)
- https://fluxcd.io/flux/cmd/flux_suspend_kustomization/ , .../flux_delete_kustomization/ , .../flux_diff_kustomization/
- https://fluxcd.io/flux/guides/repository-structure/
- https://raw.githubusercontent.com/fluxcd/flux2-kustomize-helm-example/main/clusters/staging/infrastructure.yaml
- https://github.com/fluxcd/flux2/releases/tag/v2.10.0

## Not verified

- `flux uninstall` flags and effects, `flux tree`, `flux events`, `flux logs`, `flux build kustomization` flags (only listed in the CLI index).
- `GitRepository` and `OCIRepository` field bodies beyond the examples (`interval`, `url`, `ref.branch`, `ref.semver`, `layerSelector`); spec index only.
- The example repo currently uses `ExternalArtifact` sources (feature-gated); this skill uses `GitRepository`.
- Exact `HelmRelease` remediation strategy fields (`strategy: rollback|uninstall`, `remediateLastFailure`): index names "Configuring failure handling", body not read.
- Flux 2.10 upgrade notes (breaking changes from 2.9) not read.
