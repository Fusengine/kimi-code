---
name: helm-4-changes
description: What changed between Helm 3 and Helm 4 - flags, server-side apply, wait strategies, plugins, OCI, charts v3
when-to-use: Upgrading a pipeline or workstation from Helm 3, reading an old tutorial, or writing a flag in CI
keywords: helm 4, server-side apply, rollback-on-failure, force-replace, wait watcher, post-renderer plugin, registry login, chart v3
priority: high
related: helm-release-ops.md, helm-chart-authoring.md
---

# Helm 4 versus Helm 3

**Load when:** a command, flag or doc page may date from Helm 3. Helm 4 keeps charts working ("maintaining backwards compatibility for charts") but breaks CLI and SDK details.

## Version

Helm docs show `Version: 4.3.1` (https://helm.sh/docs/overview/). Several docs pages still carry the banner "This page has not yet been updated for Helm 4" (charts, registries): treat their prose as Helm 3 text and confirm flags with `helm <cmd> --help` on the installed binary.

## Decision table

| Area | Helm 4 behaviour | Action |
|------|------------------|--------|
| Apply method | New installs default to **server-side apply**; upgrade and rollback follow the previous release's method; Helm 3 releases stay client-side apply after the upgrade to 4. Override with `--server-side=true\|false\|auto` | Keep `auto`; set `--force-conflicts` only on purpose (it takes fields from other managers) |
| `--atomic` | Renamed `--rollback-on-failure` (old flag still works, prints a deprecation warning); it defaults `--wait` to `watcher` | Rename in CI scripts |
| `--force` | Renamed `--force-replace` (replacement of resources) | Rename; same risk as `kubectl replace --force` |
| `--wait` | Strategies `watcher` (kstatus), `hookOnly` (default when the flag is omitted), `legacy`; bare `--wait` = `watcher` | Use bare `--wait` or `--wait=watcher` in pipelines; add `--wait-for-jobs` if Jobs gate readiness |
| `--dry-run` | Takes a value: `none`, `client`, `server` | `--dry-run=server` validates against the API server and needs cluster access |
| Post-renderer | Implemented as a **plugin**; `--post-renderer` takes a plugin name, no longer an executable path | Wrap old scripts as a plugin |
| `helm registry login` | Takes a registry host only (`ghcr.io`, `localhost:5000`); a scheme or a path is rejected | Fix login steps (`ghcr.io/org` fails) |
| OCI install by digest | `oci://registry/charts/app@sha256:...`; a digest mismatch is not installed | Pin production installs by digest |
| Values | Multi-document values files; `--set-json`, `--set-literal`, `--set-file` | Prefer `-f` files in Git over `--set` |
| Schema | JSON Schema 2020 support listed in the v4 changelog (PR #13283) | Test schemas on Helm 4 before relying on 2020-only keywords |
| Plugins | New plugin system with optional Wasm runtime; three types: CLI, getter, post-renderer; existing plugins keep working | Re-test `helm-diff`, `helm-secrets`; `helm-diff` needs Helm 3.18+ per its README |
| `helm rollback` | New `--description` flag (max 256 chars) and a rollback-revision column in `helm history` (changelog) | Record the reason |
| `helm template` | `--hide-notes` and `--render-subchart-notes` are deprecated and removed in Helm 5 | Stop using them |
| Cache | Content-based chart cache at `~/.cache/helm/content` | Clear it when a pulled chart looks stale |
| Charts v3 | Experimental (`HELM_EXPERIMENTAL_CHART_V3=1`, `helm create --chart-api-version=v3`) | Do not use for production; v2 charts are unchanged |

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Old CI uses `--atomic` or `--force` | Works with a warning today; the aliases can go in a later major |
| SSA on a release already managed by another controller | Field-ownership conflicts; resolve ownership, do not force |
| `--wait` omitted | Default `hookOnly`: the command can return before workloads are ready |
| Argo CD renders Helm itself | Its `helm.version` field accepts `v2` or `v3` in the application spec sample; whether Argo CD 3.6.1 renders with Helm 4 is not verified, so test chart rendering through the controller |

## Verification

`helm version` (client), `helm template` on a real chart with the production values file, then `helm upgrade --dry-run=server` against a non-production context. A passing `helm lint` is not proof of a valid upgrade.

## Sources (read 2026-11-10)

- https://helm.sh/docs/overview/
- https://helm.sh/docs/changelog/
- https://helm.sh/docs/helm/helm_upgrade/ , https://helm.sh/docs/helm/helm_rollback/ , https://helm.sh/docs/helm/helm_template/
- https://helm.sh/docs/topics/registries/
- https://helm.sh/blog/path-to-helm-v4/ (planned release at KubeCon North America 2025, 6 years after Helm 3)
- https://helm.sh/community/release_policy/ (patch monthly, minor every 4 months)

## Not verified

- Helm 3 end-of-life date and its security-fix window (no page found in this session).
- Helm 4.3.1 release date (2026-10-15 comes from a GitHub release lookup in the research doc, not re-read here).
- Whether Argo CD 3.6.1 and Flux 2.10.0 bundle Helm 4 or Helm 3 internally.
