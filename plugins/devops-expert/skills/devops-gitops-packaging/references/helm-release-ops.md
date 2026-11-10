---
name: helm-release-ops
description: Operating Helm releases safely - OCI registries, digest pinning, diff and dry-run, upgrade, rollback, uninstall, test
when-to-use: Before any helm install, upgrade, rollback or uninstall, and when publishing or pulling a chart from a registry
keywords: helm push, oci, digest, helm diff, dry-run=server, upgrade, rollback, uninstall, keep-history, helm test, hide-secret
priority: critical
related: helm-4-changes.md, kustomize.md, repo-layout-promotion.md
---

# Helm Release Operations

**Load when:** a Helm command will touch a cluster or a registry. Read-only (`helm template`, `helm list`, `helm history`, `helm diff`, `--dry-run`) needs no go; the rest follows this file. If a controller (Argo CD, Flux HelmRelease) owns the release, do not use the Helm CLI to change it: change Git.

## OCI registry flow (Helm 4)

```bash
helm registry login ghcr.io -u "$USER"                 # host only; no scheme, no path; password prompt, never on the command line
helm package ./web                                      # web-<version>.tgz
helm push web-1.4.0.tgz oci://ghcr.io/org/charts        # no chart name, no tag: both come from the chart
helm pull oci://ghcr.io/org/charts/web --version 1.4.0
helm template web oci://ghcr.io/org/charts/web --version 1.4.0 -f values-prod.yaml --hide-secret
helm install web oci://ghcr.io/org/charts/web@sha256:<digest>   # immutable; a mismatch is refused
```

`push` takes only `.tgz` files made by `helm package`; a `.prov` file next to the chart is uploaded too. Some registries need the repository created first. Sign charts with cosign or the `helm-sigstore` plugin (supply chain details: devops-docker `registries-supply-chain.md`). Pin production to a digest recorded at publish time.

## Safe upgrade sequence

```bash
CTX=prod-eu; NS=shop; REL=web; CHART=oci://ghcr.io/org/charts/web; VER=1.4.0
helm --kube-context "$CTX" -n "$NS" history "$REL"                      # note the current revision (rollback target)
helm --kube-context "$CTX" -n "$NS" get values "$REL" -o yaml > "$(mktemp)"   # may hold secrets: keep it out of Git and out of the chat
helm --kube-context "$CTX" -n "$NS" diff upgrade "$REL" "$CHART" --version "$VER" -f values-prod.yaml   # helm-diff plugin
helm --kube-context "$CTX" -n "$NS" upgrade "$REL" "$CHART" --version "$VER" -f values-prod.yaml --dry-run=server --hide-secret
# after the user's go:
helm --kube-context "$CTX" -n "$NS" upgrade "$REL" "$CHART" --version "$VER" -f values-prod.yaml \
  --wait --timeout 10m --rollback-on-failure --history-max 10
helm --kube-context "$CTX" -n "$NS" test "$REL" --logs
```

- `--dry-run` prints rendered manifests **including Secrets**: add `--hide-secret`.
- `helm diff` is a plugin (`helm plugin install https://github.com/databus23/helm-diff`, Helm 3.18+ per its README). It diffs the deployed release against a `helm template` render.
- `--reuse-values` merges the previous values with new `--set`/`-f`; `--reset-then-reuse-values` resets to the chart defaults, applies the last release's values, then your overrides. For pipelines, pass the full values file every time and use neither.
- `--rollback-on-failure` rolls back to the last successful release when the upgrade fails; it is a rollback, so it carries the rollback effects below.

## Destructive commands: propose, then the user's go

| Command | Exact effect (helm docs) | Before proposing |
|---------|--------------------------|------------------|
| `helm rollback <rel> [rev]` | Re-applies the manifest of revision `rev` (default: the previous one) as a **new** revision; values and templates return, data and PVC contents do not; runs rollback hooks unless `--no-hooks`; `--force-replace` replaces resources; `--cleanup-on-fail` deletes resources created by a failed rollback | `helm history`, `helm diff rollback`, database migrations already run, GitOps controller will re-apply Git unless Git is reverted |
| `helm uninstall <rel>` | Removes all resources of the last release **and the release history**; `--keep-history` keeps history and marks it deleted; `--cascade foreground --wait` waits for finalizers; hook resources are not removed | `helm get manifest`, list PVCs and CRs, backups, annotation `helm.sh/resource-policy: keep` on data objects; `--dry-run` first |
| `helm upgrade --force-replace` | Replaces resources (delete and recreate behaviour): pods restart, generated fields reset | Prefer a normal upgrade |
| `helm upgrade --force-conflicts` | Server-side apply takes over fields owned by other managers | Name the other manager first |

Proposal format:

```
ACTION   helm --kube-context prod-eu -n shop rollback web 7 --wait --timeout 10m
EFFECT   web returns to the manifest of revision 7 (chart 1.3.2); revision 9 stays in history; DB migration of 1.4.0 is NOT reverted
PROOF    helm history web (rev 7 = deployed ok), helm diff rollback web 7 attached, backup id <id>
WAIT-FOR-GO  yes
```

## Pitfalls

| Trap | Consequence |
|------|-------------|
| `helm uninstall` without `--keep-history` | Rollback target is gone |
| `helm upgrade --install` in two pipelines | `another operation is in progress` / pending-upgrade release; inspect `helm history` before retrying |
| Same release name in two namespaces assumed identical | Releases are namespace-scoped; always pass `-n` and `--kube-context` |
| `helm repo add` with the same alias but different URL | Silent chart substitution; prefer OCI refs with a version or digest |
| Credentials in `--password` | Shell history leak; use `helm registry login` prompt or `--password-stdin` (flag not read today) |

## Verification

`helm status <rel>` and `helm history <rel>` show `deployed`; `kubectl rollout status` for each workload (devops-kubernetes); `helm test <rel> --logs` passes; a user-facing request succeeds.

## Sources (read 2026-11-10)

- https://helm.sh/docs/helm/helm_upgrade/ , https://helm.sh/docs/helm/helm_rollback/ , https://helm.sh/docs/helm/helm_uninstall/
- https://helm.sh/docs/topics/registries/ , https://helm.sh/docs/helm/helm_test/
- https://github.com/databus23/helm-diff

## Not verified

- `helm history`, `helm get values`, `helm status`, `helm get manifest`, `helm registry login --password-stdin` flags were not read as individual pages today.
- `helm diff rollback` subcommand exists in the plugin README (not read past the install section).
- "Rollback creates a new revision" is inferred from the `helm history` rollback column in the changelog and general Helm behaviour; the rollback page's synopsis does not say it.
- `--history-max` default 10 is from the upgrade page; rollback of CRs/hook Jobs side effects depend on the chart.
