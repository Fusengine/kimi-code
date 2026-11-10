---
name: helm-chart-authoring
description: Writing a Helm chart - structure, Chart.yaml, values and schema, dependencies, hooks, tests, CRDs
when-to-use: Creating or reviewing a chart you own, deciding where a setting lives, wiring subcharts
keywords: Chart.yaml, apiVersion v2, values.yaml, values.schema.json, dependencies, Chart.lock, hooks, helm test, crds
priority: high
related: helm-release-ops.md, helm-4-changes.md, templates/chart/Chart.yaml
---

# Helm Chart Authoring

**Load when:** you write or review a chart. Cluster-side objects (probes, limits, securityContext) come from devops-kubernetes; this file covers the packaging around them.

## Structure (helm.sh charts page)

```
web/
  Chart.yaml            # required: apiVersion, name, version
  values.yaml           # default values
  values.schema.json    # optional JSON Schema over values
  charts/               # dependencies (generated)
  crds/                 # CRDs (installed before templates, not templated)
  templates/            # templates + NOTES.txt
```

Helm reserves `charts/`, `crds/`, `templates/`. A runnable skeleton: [templates/chart/](templates/chart/Chart.yaml) (Helm templates contain `{{ }}` and are not parseable as plain YAML).

## Decision rules

| Question | Rule |
|----------|------|
| `apiVersion` | `v2` (needs Helm 3+); `v1` charts still install. `v3` is experimental in Helm 4 |
| `version` vs `appVersion` | `version` = chart SemVer (bump on every chart change, it names the `.tgz`); `appVersion` = the app, informational, **quote it** (`"1.4.2"`) |
| Extra `Chart.yaml` keys | Not allowed since Helm 3.3.2: put custom metadata under `annotations` |
| `kubeVersion` | Set a SemVer range (`">=1.35.0-0"`) so installs fail on unsupported clusters |
| Values naming | camelCase, lower-case first letter, flat over nested, maps over lists (easier `--set`), quote strings, one comment per key starting with the key name |
| Keys with dashes | Read with `index .Values "gitlab-runner"`; avoid dashes in your own keys |
| Validation | Ship `values.schema.json` (`required`, `type`, `enum`, `additionalProperties: false` on the root); it is checked by install, upgrade, lint and template; `--skip-schema-validation` disables it, so ban it in CI |
| Dependencies | Declare in `Chart.yaml` `dependencies` (name, version range, repository, optional `condition`, `alias`, `import-values`); `helm dependency update` writes `Chart.lock`; commit `Chart.lock`, use `helm dependency build` in CI to reproduce it |
| Subchart values | Parent `values.yaml` under the subchart name (or `alias`); toggle with `condition: sub.enabled` |
| CRDs | Put in `crds/`: installed if absent, **not** upgraded or removed by Helm; ship CRD upgrades separately (own chart or controller) |
| Hooks | Annotation `helm.sh/hook: pre-install,pre-upgrade`, `helm.sh/hook-weight`, `helm.sh/hook-delete-policy`; hook resources are not tracked by the release, so `helm uninstall` does not remove them |
| Tests | Pod or Job templates annotated `helm.sh/hook: test`; run with `helm test <release>` after install |
| Releases ordering | Helm applies resources in its own kind order; use hooks for ordering inside a release, controller features (sync waves, `dependsOn`) across releases |

## Chart.yaml dependency example

```yaml
dependencies:
  - name: postgresql
    version: "16.x.x"            # SemVer range, pinned by Chart.lock
    repository: oci://registry.example.com/charts
    condition: postgresql.enabled
```

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Unquoted `appVersion: 1.0` or a SHA like `1234e10` | Parsed as float or scientific notation |
| `randAlphaNum` in a template | A new value on every render: permanent drift in Argo CD and Flux diffs |
| Secrets generated in templates | Rotated on every upgrade, printed by `--dry-run`; reference an existing Secret instead (devops-secrets) |
| Dependency range `*` without `Chart.lock` | Different chart versions on two machines |
| Immutable fields (`Deployment.spec.selector`, Job template) changed in a template | Upgrade fails; plan a delete/recreate with the owner's go |

## Verification

```bash
helm lint ./web -f values-prod.yaml
helm template web ./web -f values-prod.yaml --hide-secret | kubectl apply --dry-run=server -f -
helm dependency build ./web          # reproduces Chart.lock
helm package ./web                   # produces web-<version>.tgz
```

Then a real `helm upgrade --install --dry-run=server` against a non-production context and `helm test` after the actual install.

## Sources (read 2026-11-10)

- https://helm.sh/docs/topics/charts/ (banner: not yet updated for Helm 4)
- https://helm.sh/docs/chart_best_practices/values/
- https://helm.sh/docs/topics/charts_hooks/
- https://helm.sh/docs/helm/helm_dependency_update/ , https://helm.sh/docs/helm/helm_test/ , https://helm.sh/docs/helm/helm_template/

## Not verified

- `helm lint`, `helm package`, `helm dependency build` flags were not read individually (`lint` and `--skip-schema-validation` appear in the Helm 4 changelog and the template page).
- Recommended `kubeVersion` pre-release suffix (`-0`) is general Helm practice, not read at the source today.
- `crds/` upgrade/removal behaviour is from the Helm CRD docs page, not re-read today.
