---
name: pipeline-design
description: CI/CD pipeline design principles - build once promote many, trunk-based flow, quality gates, test stage layout, pipeline speed (parallelism, caching, DAG, path filters), flaky tests, pipeline-as-code hygiene
when-to-use: Designing a new pipeline, reviewing a slow or flaky one, deciding what runs on PR vs main vs tag
keywords: build once, promote, trunk-based, quality gate, test pyramid, parallel, needs, path filter, flaky, pipeline speed, immutable artifact
priority: high
related: github-actions-workflows.md, gitlab-ci.md, image-build-ci.md, deploy-strategies-release.md
---

# Pipeline Design

**Load when:** shaping what a pipeline does and in what order, independent of the CI product.

## Core rules

1. **Build once, promote many.** One commit -> one immutable artifact (image digest, package version, binary checksum). Every environment receives that exact artifact; only configuration differs. A rebuild for production means production runs something nobody tested.
2. **Pipeline as code, reviewed like code.** Pipeline files change through PRs; the deploy job on the default branch is protected by the same review rules as the application.
3. **Fast feedback first.** Cheap checks (format, lint, type check, unit tests) run first and in parallel; slow checks (integration, end-to-end, image scan) after them; deploy last.
4. **Fail closed, name the gate.** Each gate has an owner and an exit condition: lint clean, tests green, image built and scanned, staging smoke test green, human approval for production.
5. **Idempotent deploy jobs.** Running the same deploy twice yields the same state (a re-run after a partial failure must be safe).
6. **No pipeline-only knowledge.** Every CI step is a script or make target that works locally (`make test`), CI only orchestrates.

## Branching and triggers

| Event | Runs | Never |
|-------|------|-------|
| Pull / merge request | lint, tests, build (no push), preview deploy if any | production secrets, signing, publish |
| Push to default branch | full CI, build+push image, deploy to staging | direct production deploy without gate |
| Version tag | release build/promote, GitHub/GitLab release, production deploy behind approval | tags created by CI without review |
| Schedule | dependency/image rescans, nightly slow tests | deploys |

Trunk-based: short-lived branches (days), merge to the default branch often, feature flags instead of long branches; release from a tag on the default branch. Keep release branches only when you must patch old versions.

## Stage layout

```
lint/format ─┐
unit tests ──┼─> build artifact ─> image scan ─> deploy staging ─> smoke/e2e ─> [approval] ─> deploy production ─> smoke
type check ──┘
```

- Unit and static checks do not need the artifact: run them in parallel with the build (GitLab `needs: []`; GitHub jobs without `needs`).
- Integration/e2e run against the deployed staging artifact, not a rebuilt one.
- Quality gates: coverage thresholds only if the team owns them; static analysis and secret scanning on every PR (pointer: `security-expert`, `devops-secrets`); dependency/image vulnerability scan with an explicit policy for severities.

## Speed

- **Parallelise** independent work (matrix, `parallel:matrix`, test sharding); **use the DAG** (`needs`) instead of stage barriers.
- **Skip irrelevant work**: path filters (`on.push.paths`, GitLab `rules:changes`), but never skip required status checks in a way that leaves a required check forever "pending".
- **Cache dependencies by lockfile hash**; cache is best effort, correctness must not depend on it. Use external BuildKit cache for images ([image-build-ci.md](image-build-ci.md)).
- **Cancel redundant runs** on PRs (`concurrency` / `interruptible`), but never cancel deploys.
- **Right-size runners**; measure queue time separately from run time. A slow pipeline is first measured (job durations, critical path), then fixed.
- **Small images for CI** (pinned, slim tool images) cut pull time; pre-bake tools into a runner image rather than installing on every run.

## Flaky tests

Quarantine a flaky test with a ticket and an owner; automatic retries (`retry:` in GitLab, rerun-failed) hide the problem and lengthen the pipeline, so cap them and report the retry rate. Retries are for infrastructure faults (runner lost, network), not for assertions.

## Environments and configuration

One definition of the deploy, parametrised per environment (variables, values files); environment-specific secrets scoped to that environment. Promotion = same artifact + next environment's config. Pointer: GitOps promotion by pull request belongs to `devops-gitops-packaging`.

## Anti-patterns

- Rebuilding the artifact in the deploy job.
- Deploy steps that `ssh`/`kubectl` into production with a long-lived key stored as a CI secret (use OIDC or a GitOps pull model).
- `latest` as a deployment reference.
- A pipeline that only works on one runner because of leftover state (non-ephemeral self-hosted runners).
- One giant job: no parallelism, no partial reruns, unreadable failures.
- Required checks that are skipped by path filters and block merges.

## Sources (read 2026-11-10)

- https://docs.gitlab.com/ci/pipelines/pipeline_efficiency/ , https://docs.gitlab.com/ci/yaml/needs/
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency

## Not verified

- The principles (build once promote many, trunk-based, quality gates, flaky-test handling) are established practice, not claims from the pages above; only the platform behaviours cited in the speed section were read.
- GitHub path-filter interaction with required status checks was not re-read today.
