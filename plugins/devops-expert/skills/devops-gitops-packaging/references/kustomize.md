---
name: kustomize
description: Kustomize - bases and overlays, patches, images, generators, components, build and diff
when-to-use: Customizing your own plain manifests per environment, writing or reviewing a kustomization.yaml
keywords: kustomization.yaml, base, overlay, patches, images, configMapGenerator, components, kustomize build, kubectl apply -k
priority: high
related: helm-vs-kustomize.md, repo-layout-promotion.md, flux.md
---

# Kustomize

**Load when:** manifests are plain YAML with per-environment differences. Kustomize is template-free: a `kustomization.yaml` lists resources and transformations; the output is plain manifests.

## Model (kubectl.docs.kubernetes.io)

`apiVersion: kustomize.config.k8s.io/v1beta1`, `kind: Kustomization`. Build order: `resources` first, then `generators` (add objects), then `transformers` (change them), then `validators`. A directory in `resources` is an **base**; the kustomization that refers to it is an **overlay**. Convenience fields (`patches`, `images`, `namePrefix`, `configMapGenerator`) are shorthand for built-in generators and transformers.

Runnable layout: [templates/kustomize/](templates/kustomize/base/kustomization.yaml).

## Decision rules

| Need | Use |
|------|-----|
| Change one field per environment | `patches` with `target` (strategic merge or JSON6902, inline or `path`); `target` is required for JSON6902 |
| Change image tag or registry | `images:` (`name`, `newName`, `newTag`, `digest`); `kustomize edit set image app=registry/app:1.4.2` rewrites the file |
| Config from files or literals | `configMapGenerator` / `secretGenerator`: the name gets a content-hash suffix, so a config change rolls the pods; `behavior: create\|replace\|merge` lets an overlay change the base's map |
| Optional feature across overlays | `Component` (`apiVersion: kustomize.config.k8s.io/v1alpha1`, `kind: Component`) referenced from overlays under `components:` |
| Replica count, labels, namespace | `replicas`, `labels`, `namespace`, `namePrefix` |
| Inflate a Helm chart | `helmCharts` + `kustomize build --enable-helm`; limited support, see [helm-vs-kustomize.md](helm-vs-kustomize.md) |
| Patch a custom resource with a list merge key other than `name` | add an `openapi` field, or use JSON6902 |

Patch `target` selects by `group`, `version`, `kind`, `name`, `namespace` (anchored regex), `labelSelector`, `annotationSelector`. Patches apply in the order listed. By default a patch cannot rename or change the kind of a resource (`allowNameChange`, `allowKindChange` options).

## Commands

```bash
kustomize build apps/web/overlays/prod                          # render only, no cluster
kubectl kustomize apps/web/overlays/prod                        # same, built into kubectl
kustomize build apps/web/overlays/prod | kubectl --context prod-eu diff -f -           # exit 1 = differences
kustomize build apps/web/overlays/prod | kubectl --context prod-eu apply --dry-run=server -f -
kustomize build apps/web/overlays/prod | kubectl --context prod-eu apply --server-side -f -   # after the user's go
```

`kubectl apply -k <dir>` and `kubectl diff -k <dir>` exist; `apply -k` is not verified today, prefer the explicit pipe. With a GitOps controller, never apply by hand: commit.

## Destructive: propose, then the user's go

| Command | Exact effect | Before proposing |
|---------|--------------|------------------|
| `kustomize build <dir> \| kubectl delete -f -` | Deletes **every** object the build renders (Namespaces, PVCs and CRDs included if they are in the build); generated ConfigMap names include the hash, so deleting a different revision's output leaves the real ones | `kustomize build <dir> \| kubectl get -f -` to list exactly what exists; backups; check shared bases |
| `kubectl apply --prune` with a kustomize build | Alpha in kubectl; do not use | Use the GitOps tool's reviewed prune |

```
ACTION   kustomize build apps/web/overlays/staging | kubectl --context staging delete -f -
EFFECT   deletes 9 objects in ns web-staging: Deployment, Service, ConfigMap web-config-7kd2t9, PVC data-web-0 (data lost if reclaimPolicy Delete)
PROOF    build | kubectl get -f - output attached; snapshot id <id>
WAIT-FOR-GO  yes
```

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Two overlays patch the same field | Last patch listed wins silently; render and read the output |
| Remote bases (`github.com/org/repo//path?ref=...`) without a pinned ref | Moving base; pin `ref` to a tag or SHA |
| Hash-suffixed ConfigMap referenced by a literal name outside the build | Dangling reference; let kustomize rewrite references inside the build |
| `commonLabels`/selectors changed on an existing Deployment | `spec.selector` is immutable: the apply fails |
| Env-specific copies of the whole manifest instead of patches | Drift between environments |

## Verification

`kustomize build` exits 0 and the output contains the expected image, replicas and namespace (`| grep -E 'image:|replicas:'`); `kubectl diff` shows only intended changes; for components, build each overlay and compare.

## Sources (read 2026-11-10)

- https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/
- https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/configmapgenerator/
- https://kubectl.docs.kubernetes.io/guides/config_management/components/
- https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/helmcharts/
- Context7 `/kubernetes-sigs/kustomize` (images field, `kustomize edit set image`)
- Version 5.8.3: https://github.com/kubernetes-sigs/kustomize/releases

## Not verified

- `kubectl apply -k`, `kubectl diff -k` flags; `replicas`, `labels`, `namespace` field details (used from general knowledge, also seen in the Argo CD application sample).
- The components page still shows `patchesStrategicMerge`/`patchesJson6902` in its example; the current docs use `patches`. Use `patches`.
- Pinning remote bases with `?ref=` is general Kustomize practice, not read at the source today.
