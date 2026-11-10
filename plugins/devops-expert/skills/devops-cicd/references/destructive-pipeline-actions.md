---
name: destructive-pipeline-actions
description: Catalogue of CI/CD actions that change or destroy real state (production deploy, forced re-run of a deploy, rollback, deleting environments/releases/tags/artifacts, runner unregistration) in ACTION / EFFECT / PROOF / WAIT-FOR-GO format
when-to-use: Before writing a pipeline step that touches production, and before running ANY gh/glab/API command that deploys, re-runs, deletes or unregisters
keywords: deploy, production, rerun, rollback, delete environment, delete release, delete tag, delete artifact, unregister runner, gh run, glab, WAIT-FOR-GO
priority: critical
related: deploy-strategies-release.md, github-actions-security.md, gitlab-ci.md, troubleshooting.md
---

# Destructive Pipeline Actions

**Load when:** a step or command in this file's list is on the table. Reading state (`gh run list`, `gh run view`, `glab ci status`, environment pages) needs no go. Every block below is proposed to the user with the real object names filled in, and runs only after an explicit go naming the object (repo, environment, tag, runner).

Pipeline-side rule: a job that deploys production is gated by a protected environment (GitHub: required reviewers; GitLab: protected environment + `when: manual`) and a concurrency lock (`concurrency` with `cancel-in-progress: false`; `resource_group`). The gate is configuration in the platform, not a comment in YAML.

## Production deploy (first run of a new deploy job, or any run)

```
ACTION   gh workflow run deploy.yml --repo <owner>/<repo> -f image-digest=sha256:<digest>
EFFECT   starts the production deploy job; with required reviewers it pauses at the environment gate, then
         changes the live service to <digest>; GitHub records a deployment on environment `production`
PROOF    digest was built by CI on the commit being released and already ran on staging; `gh run view <id>` after;
         health endpoint and the rollout status of the platform (not exit code 0) confirm it
ROLLBACK redeploy the previous digest (see Rollback below); the digest of the previous release is written down first
WAIT-FOR-GO
```

```
ACTION   GitLab: play the manual job `deploy_production` on pipeline <id> (UI Play, or `glab ci run` / API play)
EFFECT   same as above on environment `production`; resource_group `production` serialises concurrent deploys
PROOF    protected environment limits who may play it; the pipeline ran on the tag being released; staging job green
ROLLBACK re-run the previous successful deploy job from the Environments page (rollback deployment)
WAIT-FOR-GO
```

## Forced re-run of a deploy job

```
ACTION   gh run rerun <run-id> [--failed]        |   GitLab: retry the deploy job
EFFECT   executes the deploy again with the SAME commit and inputs of the original run, even if main moved on;
         a half-applied deploy may be applied twice; secrets/variables are read as they are now, not as they were
PROOF    `gh run view <run-id> --log-failed` shows why it failed; deploy step is idempotent (verified, not assumed);
         no newer deploy has run since (an old run overwriting a newer release is the main hazard)
WAIT-FOR-GO
```

GitLab can block this: the project setting "Prevent outdated deployment jobs" fails an older deployment job when a newer deployment exists; job retries for rollback deployments stay allowed by default (deployment_safety page).

## Rollback

```
ACTION   redeploy the previous immutable artifact (image digest / tag) through the SAME pipeline and gates
EFFECT   replaces the running release; schema migrations that already ran are NOT undone by redeploying old code
PROOF    previous digest recorded before the deploy; migrations in the failed release are backward compatible
         (expand/contract), or a tested down-migration exists; smoke test after
WAIT-FOR-GO
```

Never "fix forward" by editing the running system by hand; the next pipeline run will overwrite it.

## Deleting environments, releases, tags, artifacts, caches

```
ACTION   gh release delete <tag> [--cleanup-tag]     |   git push origin --delete <tag>
EFFECT   removes the published release (and with --cleanup-tag the git tag); consumers pinned to the tag break;
         an image/package published from that tag is NOT removed by this
PROOF    `gh release view <tag>` read first; nothing deploys from the tag (grep workflows and GitOps repo); release assets copied
WAIT-FOR-GO
```

```
ACTION   gh api -X DELETE repos/<owner>/<repo>/environments/<name>
EFFECT   deletes the environment with its protection rules, secrets and variables; the deploy gate for it disappears
PROOF    environment settings screenshotted/exported (reviewers, branch policy, secret NAMES); no workflow still references it
WAIT-FOR-GO
```

```
ACTION   gh run delete <run-id>   |   gh cache delete <key|--all>   |   delete artifact via API
EFFECT   run logs / caches / artifacts are gone; a deploy that consumed the artifact can no longer be audited or re-promoted
PROOF    artifact is not the release candidate of an unreleased version; retention policy already covers the case
WAIT-FOR-GO
```

GitLab equivalents (stop or delete an environment, delete a release or tag, delete job artifacts) follow the same card: an environment stop runs its `on_stop` job, which may tear the deployment down.

## Runner unregistration and removal

```
ACTION   GitHub: ./config.sh remove --token <removal-token>   (on the runner host)
         GitLab:  gitlab-runner unregister --name <runner>   |   delete the runner in the UI/API
EFFECT   the runner stops receiving jobs; jobs queued only for its labels/tags wait forever; a GitLab runner authentication
         token is revoked and cannot be reused
PROOF    no job currently running on it (`gh api` runners list shows `busy`; GitLab runner page); another runner carries the same
         labels/tags; token never printed in logs
WAIT-FOR-GO
```

## Changing who can deploy

Changing environment reviewers, branch policies, protected environment allow-lists, or the default `GITHUB_TOKEN` permissions changes the security boundary of every future deploy. Propose the exact diff of the setting and wait for the go.

## Sources (read 2026-11-10)

- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- https://docs.gitlab.com/ci/environments/deployment_safety/
- https://docs.gitlab.com/ci/environments/protected_environments/
- https://docs.gitlab.com/ci/resource_groups/
- `gh run rerun|delete|view`, `gh release create|delete`, `gh cache delete`, `gh workflow run --help` (gh 2.103.3, run locally 2026-11-10)

## Not verified

- `gh api -X DELETE .../environments/<name>`, GitHub `config.sh remove`, `gitlab-runner unregister` and any `glab` command (glab is not installed here) were not checked today; confirm with `--help` or the docs before running.
- Whether deleting an environment also removes past deployment records was not checked.
