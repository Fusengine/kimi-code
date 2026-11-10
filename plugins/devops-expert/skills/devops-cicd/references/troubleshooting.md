---
name: troubleshooting
description: Fixed-order troubleshooting for failing CI/CD pipelines on GitHub Actions and GitLab CI - find the failing step, classify the failure, read the right log, reproduce locally, then change
when-to-use: A pipeline is red, stuck queued, unexpectedly skipped, slow, or a deploy job behaves differently from last time
keywords: failed run, queued, skipped, no runner, permission denied, 403, OIDC failure, cache miss, flaky, gh run view, log-failed, CI Lint, rules not matching
priority: high
related: destructive-pipeline-actions.md, github-actions-workflows.md, gitlab-ci.md, pipeline-design.md
---

# Pipeline Troubleshooting

**Load when:** a pipeline fails, hangs or behaves unexpectedly. Evidence before fixes; reading is free, re-running a deploy is not ([destructive-pipeline-actions.md](destructive-pipeline-actions.md)).

## Order

1. **Which run, which commit, which job.** `gh run list --workflow <file> --limit 10`, `gh run view <id>` (jobs and steps), `gh run view <id> --log-failed`. GitLab: pipeline page, failed job log, "Job dependencies" graph.
2. **Classify** the failure:

| Class | Signal | Next |
|-------|--------|------|
| Config invalid | run never started / "invalid workflow file" / pipeline "yaml invalid" | GitHub: the Actions tab error and `actionlint` locally; GitLab: CI Lint |
| Not scheduled | no run, no pipeline | trigger filters (`on:` branches/paths), `workflow:rules`, `[CI SKIP]`, disabled workflow, wrong default branch |
| Waiting | job `queued` / "pending" / "stuck" | no runner with the labels/tags; runner offline/busy; concurrency group or `resource_group` held; environment awaiting approval |
| Script failure | non-zero exit in a step | reproduce locally with the same command and image |
| Permission | 403/401, "Resource not accessible by integration" | job `permissions:`, protected variable on unprotected ref, fork PR without secrets, environment scope |
| Identity (OIDC) | token exchange refused | claims vs trust rule: `sub`, `aud`, environment name, ref; `id-token: write` missing |
| Environment drift | "worked yesterday" | runner image/`-latest` label moved, unpinned action or base image, expired cache, changed variable |
| Infra | timeouts, runner lost, 5xx from registry | retry once (infra only), check runner/registry health |

3. **Reproduce** outside CI with the exact command, image and env; GitHub debug logging via the "Enable debug logging" re-run option; GitLab: run the job's image locally with the same script.
4. **Change one thing**, push to a branch (not the default), compare. Never stack a second fix on an unexplained first one.
5. **Prove**: the previously failing job is green on a fresh run of the same commit class; for deploy jobs, the health check and the platform's rollout status, not the job's exit code alone.

## Frequent causes

- **Stuck "queued"**: `runs-on` label that no runner has (GitHub), job `tags:` with no matching online runner (GitLab), or the concurrency lock held by a hung older run.
- **Skipped job**: a `needs:` dependency was skipped or failed; GitLab `rules` matched nothing; GitHub `if:` evaluates false (`success()` default); path filters.
- **Different result on re-run**: a re-run reuses the original commit and event payload, but reads secrets/variables as they are now.
- **Cache not restored**: key changed (lockfile hash), entry evicted, or `cache-mode` read-only for the trigger (GitHub); GitLab cache is per runner unless distributed, and not shared between protected and unprotected branches by default.
- **OIDC 403 at the target**: trust rule expects `environment:production` in `sub` but the job has no `environment:`; custom `aud` mismatch; for repos created after 2026-07-15 the default `sub` format changed.
- **`secrets` empty in a reusable workflow**: caller did not pass it (empty string, no error) - mark `required: true`.
- **Duplicate pipelines in GitLab**: branch and merge-request pipelines both created; add `workflow:rules`.
- **Self-hosted runner flaky**: leftover files from earlier jobs (non-ephemeral), full disk, runner app auto-updated mid-job.
- **Slow**: look at queue time vs run time, then the critical path (GitLab "needs" view), then dependency/image download, then test duration.

## Local checks (read-only)

```bash
gh run list --limit 10
gh run view <run-id> --log-failed
actionlint .github/workflows/*.yml          # if installed; static check of workflow syntax and expressions
gh api repos/<owner>/<repo>/actions/runners --jq '.runners[] | {name,status,busy,labels:[.labels[].name]}'
```

GitLab: CI Lint in the Pipeline editor, the pipeline's "Jobs" and "Job dependencies" views, and the runner page for status and tags.

## Sources (read 2026-11-10)

- https://docs.github.com/en/actions/reference/security/oidc , .../workflows-and-actions/workflow-syntax , .../how-tos/reuse-automations/reuse-workflows
- https://docs.gitlab.com/ci/jobs/job_rules/ , https://docs.gitlab.com/ci/caching/ , https://docs.gitlab.com/ci/yaml/
- `gh run view|list --help` (gh 2.103.3)

## Not verified

- `actionlint` is not installed in this environment (latest release v1.7.12, 2026-03-30 via `gh api`); command shown from its standard usage.
- The GitHub debug-logging re-run option and the runners list API field names were not re-read today.
- GitLab "pending/stuck" job messages and the lint API endpoint were not read.
