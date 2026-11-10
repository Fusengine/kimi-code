---
name: gitlab-ci
description: GitLab CI/CD pipeline design - stages, rules and workflow, needs/DAG, include and components with inputs, environments and resource_group, variables (masked, protected), ID tokens, runners and executors
when-to-use: Writing or reviewing .gitlab-ci.yml, building a CI component, wiring deploy environments, choosing a runner executor
keywords: .gitlab-ci.yml, rules, workflow, needs, include, component, spec inputs, environment, resource_group, protected variable, id_tokens, runner, executor, dind, cache, artifacts
priority: high
related: pipeline-design.md, pipeline-secrets.md, destructive-pipeline-actions.md, templates/gitlab-ci.yml, templates/gitlab-component.yml
---

# GitLab CI/CD

**Load when:** the repo has (or should have) a `.gitlab-ci.yml`. Templates: [gitlab-ci.yml](templates/gitlab-ci.yml), [gitlab-component.yml](templates/gitlab-component.yml). Validate any edit with CI Lint (UI "Pipeline editor", or the lint API) before pushing.

## Versions (checked 2026-11-10)

GitLab 19.5 is the latest released minor in the release-notes index (19.6 listed as upcoming); GitLab Runner 19.5.3 (released 2026-11-06, GitLab.com releases API). Keyword history in this file: CI/CD inputs GA in 17.0; `manual_confirmation` 17.1 (support for environment stop jobs 18.3); `sub` claim configurable fields in ID tokens 18.7.

## Pipeline shape

- `stages:` give coarse order; `needs:` turns the pipeline into a DAG so a job starts when its dependencies finish. `needs: []` starts a job immediately (lint, scanners). Mix staged jobs and `needs` freely.
- `workflow:rules` decides which pipeline types exist; use it to avoid duplicate branch + merge-request pipelines (template). `workflow:auto_cancel:on_new_commit` (`conservative` default, `interruptible`, `none`) plus per-job `interruptible: true` cancels redundant runs; deploy jobs set `interruptible: false`.
- `default:` sets image, tags, timeout, retry, cache defaults per job; a job keyword replaces the default entirely (no merge).

## `rules`

- Rules are evaluated in order; first match wins; no match = job not created. `when: never` excludes. A final bare `when:` rule can create both a branch and a merge-request pipeline: add the `workflow:rules` guard.
- Useful predicates: `$CI_PIPELINE_SOURCE == "merge_request_event"`, `$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH`, `$CI_COMMIT_TAG`, `changes:` (with `compare_to:` to compare against another ref), `exists:`.
- Rules run before any job: variables created in job scripts (dotenv) cannot be used in them.

## Reuse: include, components, inputs

- `include:` types: `local`, `project` (+ `ref`, `file`), `remote`, `template`, `component`. Included files merge into the pipeline; same-named keys in the main file override.
- **Components**: a project with `templates/<name>.yml` (or `templates/<name>/template.yml`), a `README.md`, released with a version tag; max 100 components per project. Consume with `include: - component: $CI_SERVER_FQDN/<path>/<name>@<version>` and `inputs:`. Only components on the same GitLab instance can be referenced. Pin a version; never track a moving ref for production pipelines.
- **Inputs**: `spec: inputs:` header (then `---`), interpolated as `$[[ inputs.<id> ]]`; typed, with `default`, `description`, `options`, `regex`. Inputs are fixed at pipeline creation; use CI/CD variables for runtime values. Inputs are only visible in the file that defines them.

## Environments and deploy safety

- `environment: { name, url, on_stop, auto_stop_in, action }`: `action: start` (default), `prepare`, `stop`. Static (`staging`) vs dynamic (`review/$CI_COMMIT_REF_SLUG`) environments; stopping runs the `on_stop` job.
- `resource_group: <name>` serialises deploy jobs across pipelines (modes `unordered`, `oldest_first`, ...). Project setting "Prevent outdated deployment jobs" fails an older deploy that would overwrite a newer one. Rollback = re-run an earlier deploy job from the Environments page; job retries for rollback deployments are on by default.
- **Protected environments** (Premium/Ultimate): only roles/users/groups in "Allowed to deploy" may run the job; optional approvers. Environments are otherwise writable by any Developer.
- Manual gate: `when: manual` in rules plus job-level `manual_confirmation:` message. A manual job in `rules:` with `allow_failure: true` does not block the pipeline.

## Variables and secrets

- Values in `.gitlab-ci.yml` are readable by everyone with repo access: non-sensitive config only. Sensitive values go in Settings > CI/CD > Variables: **Masked** or **Masked and hidden** visibility, **Protect variable** (only pipelines on protected branches/tags), environment scope, type `File` for certificates. Always quote variable values in YAML (an unquoted `012345` parses as octal).
- Fork pipelines cannot read the parent's variables unless a merge request pipeline runs in the parent project.
- `id_tokens:` (OIDC JWT per job, custom `aud`, claims include `project_path`, `ref`, and for jobs with an environment `environment_protected` / `deployment_tier` in the `sub`) replace stored cloud/secret-store credentials; the `secrets:` keyword uses ID tokens. Bind the receiving role to claims. Pointer: `devops-secrets`.

## Cache vs artifacts

Cache = dependencies, best effort, per runner (or S3 for distributed runners), not shared across projects, branches do not share by default; `cache:key:files` ties the key to a lockfile; up to four caches per job; `fallback_keys`. Artifacts = results passed between stages, stored in GitLab, expire after 30 days by default; `dependencies:` limits which jobs' artifacts are fetched.

## Runners and executors

| Executor | Fit | Note |
|----------|-----|------|
| Docker | clean container per job on a host | most common self-hosted choice; also works with Podman |
| Kubernetes | one pod per job in an existing cluster | cloud-native, scales with the cluster |
| Docker Autoscaler / Instance | on-demand VMs via fleeting plugins | the actively developed autoscaling executors |
| Shell, SSH, VirtualBox, Parallels, Custom | maintenance mode (security fixes only) | Shell has no isolation: avoid for untrusted code |

- Runner scope: instance, group, project. Register with a **runner authentication token** (created in the UI/API); the registration-token flow is legacy. Tag runners and tag jobs to steer sensitive deploy jobs to a dedicated, protected runner.
- Docker-in-Docker (`docker:dind`) needs privileged mode: that is host-root-equivalent; keep it on isolated runners, or build with rootless/daemonless tooling (pointer: `devops-docker`).
- Unregistering a runner: [destructive-pipeline-actions.md](destructive-pipeline-actions.md).

## Sources (read 2026-11-10)

- https://docs.gitlab.com/ci/yaml/ , https://docs.gitlab.com/ci/yaml/needs/ , https://docs.gitlab.com/ci/yaml/includes/
- https://docs.gitlab.com/ci/jobs/job_rules/ , https://docs.gitlab.com/ci/inputs/ , https://docs.gitlab.com/ci/components/
- https://docs.gitlab.com/ci/environments/ , .../environments/deployment_safety/ , .../environments/protected_environments/ , https://docs.gitlab.com/ci/resource_groups/
- https://docs.gitlab.com/ci/variables/ , https://docs.gitlab.com/ci/secrets/id_token_authentication/ , https://docs.gitlab.com/ci/caching/
- https://docs.gitlab.com/runner/executors/ , https://docs.gitlab.com/ci/runners/runners_scope/
- https://docs.gitlab.com/releases/19/ ; https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab-runner/releases

## Not verified

- The latest GitLab self-managed patch within 19.5 (only the minor and the runner version were confirmed).
- `docker:cli` image shipping the `buildx` plugin (used in the component template) and dind TLS variable details.
- Merge-train / merge-request-pipeline behaviour, child/parent pipelines, `trigger:` and `parallel:matrix` limits were not read in depth.
- Exact `include:rules` and `include:inputs` syntax beyond the inputs page summary.
