---
name: github-actions-workflows
description: GitHub Actions workflow design - triggers, jobs, matrix, concurrency, timeouts, reusable workflows, composite actions, artifacts, caching and cache-mode, environments and required reviewers
when-to-use: Writing or reviewing a .github/workflows file, splitting shared CI into reusable workflows or composite actions, tuning cache/artifact/concurrency behaviour
keywords: workflow_call, workflow_dispatch, matrix, fail-fast, concurrency, cancel-in-progress, timeout-minutes, composite, artifacts, actions/cache, cache-mode, environment, required reviewers
priority: high
related: github-actions-security.md, pipeline-design.md, destructive-pipeline-actions.md, templates/github-ci.yml
---

# GitHub Actions Workflows

**Load when:** authoring or reviewing `.github/workflows/*.yml`. Security settings (permissions, pinning, OIDC, runners) are in [github-actions-security.md](github-actions-security.md).

## Skeleton rules

- Workflow files live in `.github/workflows/` (subdirectories are not supported for reusable workflows); extension `.yml` or `.yaml`.
- `on:` events: list each event with its filters; once any event has filters, give all events a trailing colon (`page_build:`). `branches` and `branches-ignore` cannot both be used for the same event.
- Top of every workflow: `permissions: {}` or `contents: read`, then widen per job ([github-actions-security.md](github-actions-security.md)).
- Every job gets `timeout-minutes` (maximum 360 on GitHub-hosted and self-hosted runners; integers only).
- A workflow run holds at most 256 jobs from a matrix.
- Template: [templates/github-ci.yml](templates/github-ci.yml).

## Matrix

```yaml
strategy:
  fail-fast: false          # one failing cell must not hide the others
  max-parallel: 4           # optional cap for shared self-hosted runners
  matrix:
    os: [ubuntu-24.04, ubuntu-24.04-arm]
    node: ["22", "24"]
```

Use `fail-fast: false` for compatibility matrices and the default (true) only when any failure makes the rest worthless.

## Concurrency

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}   # expression allowed
```

- At most one running and one pending run per group; a new pending run replaces the old pending one. `cancel-in-progress: true` also cancels the running one.
- Group names are case insensitive. Optional `queue: max` (up to 100 pending) cannot be combined with `cancel-in-progress: true` (validation error).
- Deploys: `cancel-in-progress: false`, one group per environment, so a deploy is never killed halfway ([templates/github-oidc-deploy.yml](templates/github-oidc-deploy.yml)).

## Reusable workflows vs composite actions

| Need | Use |
|------|-----|
| Share whole jobs (own runner, own permissions, own environment) | Reusable workflow: `on: workflow_call`, called by `jobs.<id>.uses` |
| Share a few steps inside a job | Composite action: `runs: using: composite` ([template](templates/github-composite-action.yml)) |

- Caller syntax: `owner/repo/.github/workflows/file.yml@<ref>`; `ref` can be SHA, tag or branch; a full commit SHA is the safe choice for workflows you do not own. Same repo: `./.github/workflows/file.yml` (runs from the caller's commit).
- Inputs are typed (`string`, `number`, `boolean`); secrets are passed with `secrets:` or `secrets: inherit` (same organization or enterprise only).
- A job that calls a reusable workflow cannot use `environment:`; put `environment` on the job inside the callee. If the caller does not pass an environment secret, it resolves to an **empty string without error**: mark it `required: true` in `workflow_call.secrets`.
- Template: [templates/github-reusable-workflow.yml](templates/github-reusable-workflow.yml). Every `run` step in a composite action needs an explicit `shell`.

## Artifacts vs cache

| | Artifact (`upload-artifact` / `download-artifact`) | Cache (`actions/cache`) |
|---|---|---|
| Purpose | pass a build result between jobs; keep a release candidate | speed up dependency download |
| Contract | exact content you uploaded | best effort, may be evicted |
| Key | name | `key` (max 512 chars) + `restore-keys` fallbacks |

- Cache entries are immutable: to change content, change the key (`hashFiles('**/package-lock.json')`). An exact `key` match is a hit; otherwise `restore-keys` are tried in order, and a new cache is saved only when the job succeeds.
- **Never put credentials in a cache path**: anyone with read access can open a PR and read a cache; forks can read base-branch caches.
- Cache access control (new, see [Not verified](#not-verified)): `cache-mode` at workflow or job level takes `read`, `write`, `write-only`, `none`; unset, it defaults by trigger. Only `push`, `workflow_dispatch`, `repository_dispatch`, `delete`, `registry_package`, `page_build` and `schedule` may create or overwrite caches in the default branch scope; other triggers that resolve to the default branch get read-only access. Do not set `cache-mode: write` on low-trust triggers (cache poisoning).

## Environments

`environment:` on a job ties it to protection rules and environment secrets; the job does not start, and cannot read the environment's secrets, until the rules pass.

- Required reviewers: up to 6 people or teams, any one approval suffices; optionally prevent self-review. Wait timer, branch/tag deployment policy, custom protection rules (GitHub Apps).
- Environments on private repositories need GitHub Team or Pro (Free: public repos only); protection rules silently stop applying when a repo goes from public to private on Free.
- `environment: { name, deployment: false }` uses an environment's secrets and approval without creating a deployment record.
- Configure reviewers in repository settings (needs admin); the YAML only names the environment. Disable "Allow administrators to bypass configured protection rules" for production.

## Triggers worth knowing

- `workflow_dispatch` with typed `inputs` for manual runs (deploy, rollback).
- `pull_request` (no secrets for forks, safe) vs `pull_request_target` and `workflow_run` (privileged; never check out untrusted PR code there, see [github-actions-security.md](github-actions-security.md)).
- `schedule` (cron, UTC, default branch only), `push` with `tags:` filters for releases.

## Sources (read 2026-11-10)

- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
- https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments

## Not verified

- `cache-mode` is documented on the pages above but its rollout (hosted vs GHES, plan limits) was not checked; test on a throwaway workflow before relying on the default.
- `schedule` UTC/default-branch rule and the `max-parallel` semantics are standard behaviour but were not re-read today.
- The actions/cache major version in current docs examples is `v4` while the latest release is `v6.1.0`; the pinned SHAs in templates are the latest releases read via `gh api` on 2026-11-10.
