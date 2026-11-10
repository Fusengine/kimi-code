---
name: other-ci-systems
description: Pointer-level notes on Jenkins, Forgejo/Gitea Actions and Woodpecker CI for self-hosted shops - what each is, current versions, when it fits, how its concepts map to GitHub Actions/GitLab CI
when-to-use: The repo or the user runs Jenkins (Jenkinsfile), Forgejo/Gitea Actions (.forgejo/workflows) or Woodpecker (.woodpecker/), or a team is choosing a self-hosted CI
keywords: Jenkins, Jenkinsfile, Forgejo Actions, forgejo-runner, Gitea act_runner, Woodpecker, .woodpecker, self-hosted CI
priority: medium
related: github-actions-workflows.md, gitlab-ci.md, pipeline-design.md
---

# Other CI Systems (pointers only)

**Load when:** the CI is not GitHub Actions or GitLab CI. This file does not teach the products; it says what they are, where the docs are, and which rules from the sibling references still apply. Read the official docs for the installed version before writing config.

## Versions (checked 2026-11-10)

| System | Version | Source |
|--------|---------|--------|
| Jenkins | 2.590 weekly, 2.580.2 LTS (LTS baseline every 12 weeks, stable updates every 4) | https://www.jenkins.io/download/ |
| Forgejo | v17.0.1 latest, v15.0.11 LTS | https://forgejo.org/docs/latest/ (nav header) |
| Forgejo Runner | v17.0.1 tag (Codeberg releases API, 2026-10-26) | https://codeberg.org/forgejo/runner |
| Woodpecker CI | v3.20.1 (GitHub release 2026-10-29); docs 3.20.x | https://woodpecker-ci.org/docs/intro |

## Jenkins

- Pipeline as code in a `Jenkinsfile` checked into the repo (Declarative or Scripted); controller + agents; shared libraries for reuse; credentials are handled through the credentials store, not string interpolation.
- The Jenkinsfile handbook has sections on "Interpolation of sensitive environment variables" and "Injection via interpolation": read them before passing credentials or user input into `sh` steps (page body beyond its table of contents was not read).
- Fit: existing estates, heavy plugin dependence. Costs: controller and plugin patching is yours; treat the controller as a high-value target (it holds credentials). New greenfield self-hosted work usually lands on GitLab CI, Forgejo/Gitea Actions or Woodpecker.
- Same rules still apply (pipeline-design.md): build once, immutable artifacts, no deploy from a developer laptop, human gate before production.

## Forgejo / Gitea Actions

- Forgejo Actions: workflow files are YAML modelled on GitHub Actions and executed by `forgejo-runner` registered against the instance. Admin guide pages: Runner Configuration, Runner Registration, "Securing Forgejo Actions Deployments", "Utilizing Docker within Actions".
- Syntax and the action ecosystem are similar to, but not identical with, GitHub Actions: test every workflow you copy from GitHub, and do not assume `permissions`, OIDC, environments, reusable-workflow or cache features exist (not verified).
- Runner security is the GitHub self-hosted-runner story again: untrusted PRs + a runner with Docker access = host compromise. Keep runners isolated, ephemeral where possible, and read the "Securing" page before enabling Actions for outside contributors.

## Woodpecker CI

- Container-native: each step runs in an image, steps share a workspace volume and run serially unless `depends_on` is used; `[CI SKIP]` or `[SKIP CI]` in a commit message skips a pipeline.
- Plugins are container images; secrets and registries are configured per project/org; a local `exec`-style run and a linter exist (see the docs index).
- Fit: small teams on Gitea/Forgejo wanting simple, container-only pipelines. Review its "Security boundaries" doc page before giving it privileged runners.

## Concept map

| Concept | GitHub Actions | GitLab CI | Woodpecker | Jenkins |
|---------|----------------|-----------|------------|---------|
| Pipeline file | `.github/workflows/*.yml` | `.gitlab-ci.yml` | `.woodpecker/*.yaml` | `Jenkinsfile` |
| Unit of work | job + steps | job (+ stage) | workflow + step | stage + step |
| Reuse | reusable workflow, composite action | include, component | plugins, shared YAML | shared library |
| Prod gate | environment reviewers | protected environment + manual | project settings (not verified) | `input` step / folder permissions |

## Sources (read 2026-11-10)

- https://www.jenkins.io/download/ , https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- https://forgejo.org/docs/latest/ (navigation and version header only; the Actions overview page body did not extract)
- https://woodpecker-ci.org/docs/intro , https://woodpecker-ci.org/docs/usage/workflow-syntax
- `gh api repos/woodpecker-ci/woodpecker/releases/latest`, `gh api repos/jenkinsci/jenkins/releases/latest`, https://codeberg.org/api/v1/repos/forgejo/runner/releases

## Not verified

- Forgejo Actions feature parity with GitHub Actions (permissions, OIDC, environments, reusable workflows, cache) and the workflow directory name: the overview page body was not readable.
- Gitea `act_runner` version and status were not checked.
- Woodpecker workflow file location (`.woodpecker/` directory vs single file; the concept-map cell is from memory), secrets/promotion gating details, and Jenkins LTS line beyond the download page.
