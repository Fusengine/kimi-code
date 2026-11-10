---
name: argocd-applicationset-appofapps
description: Argo CD ApplicationSet generators, app-of-apps bootstrapping, cascading deletion and their security implications
when-to-use: One definition must produce many Applications (clusters, environments, directories), or a cluster must be bootstrapped from one root app
keywords: ApplicationSet, generators, list, cluster, git, matrix, OCI, goTemplate, app of apps, bootstrapping, cluster labels
priority: high
related: argocd-applications.md, repo-layout-promotion.md
---

# ApplicationSet and app-of-apps

**Load when:** more than a handful of near-identical Applications exist, or you bootstrap a new cluster. Template: [applicationset.yaml](templates/argocd/applicationset.yaml).

## ApplicationSet

The controller ships with Argo CD since 2.3. A generator emits parameter sets; each set is substituted into `template` and becomes an `Application` in the Argo CD namespace.

| Generator | Emits parameters from | Use for |
|-----------|----------------------|---------|
| `list` | A fixed `elements` list | A handful of known targets |
| `clusters` | Clusters registered in Argo CD (filter with `selector.matchLabels` on the cluster Secret) | One app on every cluster with a label (`env`, `region`, `type`) |
| `git` (`directories` or `files`) | Folders or JSON/YAML files in a repo | One app per folder (`apps/*/overlays/prod`) |
| `oci` | OCI artifacts (pre-rendered manifests) | Immutable, versioned manifest bundles |
| `matrix` | Combination of two generators | Directories x clusters |

Always write `goTemplate: true` with `goTemplateOptions: ["missingkey=error"]` so a missing key fails instead of rendering an empty string. Templates then use `{{.cluster}}`, `{{.path.path}}`, `{{index .path.segments 1}}` and Sprig functions.

Decision rules:

| Question | Rule |
|----------|------|
| Environment per directory or per cluster label? | Directory generator when environments are folders in Git; cluster generator when the cluster Secret labels define the target |
| Who may create an ApplicationSet? | Admins only. Read https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Security/ first: a set can create Applications in any project it names |
| Auto-sync on generated apps? | Set it in the template's `syncPolicy`, not on the child (child edits have no effect) |
| Temporary stop of auto-sync | Follow "Controlling Resource Modification" (applicationset docs); not hand-editing children |

## App of apps

One parent `Application` whose source folder (a Helm chart or a directory) contains child `Application` manifests. Pros: simple, works with plain Argo CD. Cons: parent shows Synced while children are OutOfSync until synced; per-cluster variation needs templating in the parent. The cluster-bootstrapping guide recommends ApplicationSets and the cluster generator first, app-of-apps as the alternative.

Rules:
- App of Apps is an **admin-only** tool: whoever can push to the parent repo can create Applications in any project; require PR review, check each child's `project`.
- Child `Application`s get `finalizers: [resources-finalizer.argocd.argoproj.io]` when deleting the parent must delete the workloads; omit it when it must not.
- Pin the parent's children to a commit SHA (`targetRevision`) so the parent's own commit is the release.
- Sync children by label: `argocd app sync -l app.kubernetes.io/instance=apps` (parent app named `apps`).
- To bootstrap in waves, use health assessment of Applications (operator-manual `health` page).

## Destructive: propose, then the user's go

| Action | Exact effect | Before proposing |
|--------|--------------|------------------|
| Delete an ApplicationSet | Its generated Applications are removed; with the finalizer on them, their resources go too | Apps list from the set, finalizers on the template, `Delete=false` on data objects |
| Delete the app-of-apps parent with cascading finalizers | Children and **all their resources** are deleted | Same, per child; app-deletion page lists the three UI propagation policies (foreground, background, non-cascading) |
| Remove a directory/cluster that a generator tracked | The generated Application disappears (and cascades per its finalizer) | `kubectl get applications -n argocd -l ...` before merging the PR |

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Git generator on a branch HEAD | A merged folder deploys immediately everywhere |
| Missing `missingkey=error` | Empty `path`/`namespace` rendered, wrong target |
| Application names collide across sets | Names are unique per Argo CD installation |
| Cluster Secret labels edited | Apps appear or disappear on that cluster |

## Verification

`kubectl -n argocd get applicationset <name> -o yaml` (status conditions), `kubectl -n argocd get applications` shows the expected generated names, `argocd app list -l ...` and one `argocd app diff` per new app before enabling auto-sync.

## Sources (read 2026-11-10)

- https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/
- https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- https://argo-cd.readthedocs.io/en/stable/user-guide/app_deletion/
- https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/

## Not verified

- Individual generator pages (`Generators-Git`, `Generators-Cluster`) and the ApplicationSet `Security` and `Controlling-Resource-Modification` pages were not read; no field of them is asserted beyond the index page and the bootstrapping example.
- ApplicationSet deletion behaviour (which policy preserves children) was not read; the effects above follow from the finalizer rules only.
