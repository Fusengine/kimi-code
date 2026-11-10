---
name: flux-image-automation
description: Flux image automation - ImageRepository, ImagePolicy, ImageUpdateAutomation, markers and commit-back to Git
when-to-use: Deploying new image tags automatically to staging, or proposing production bumps through a branch
keywords: ImageRepository, ImagePolicy, ImageUpdateAutomation, $imagepolicy marker, image-reflector-controller, image-automation-controller, semver
priority: medium
related: flux.md, repo-layout-promotion.md
---

# Flux Image Automation

**Load when:** a new image tag should reach a cluster without a human editing a manifest. Template: [image-automation.yaml](templates/flux/image-automation.yaml). CI builds and pushes the image (devops-cicd); Flux scans the registry and writes the tag to Git.

## Flow

1. `ImageRepository` (`image.toolkit.fluxcd.io/v1`) scans a registry image; private images use `spec.secretRef`.
2. `ImagePolicy` selects a tag: `policy.semver.range`, or CalVer, regex, alphabetical.
3. A marker comment in the manifest names the policy: `image: ghcr.io/org/app:1.4.0 # {"$imagepolicy": "flux-system:app"}`. Variants: `:tag`, `:name`, `:digest` suffix (digest only when the policy sets `spec.digestReflectionPolicy` to `IfNotPresent` or `Always`; default `Never`). It also patches `HelmRelease.spec.values` and custom resources.
4. `ImageUpdateAutomation` checks out a branch, rewrites marked fields (`update.strategy: Setters`), commits and pushes.

The controllers are **not installed by default**: bootstrap with `--components-extra=image-reflector-controller,image-automation-controller`, and give the deploy key write access (`--read-write-key`). An `ImageUpdateAutomation` applies all policies in its namespace.

## Decision rules

| Question | Rule |
|----------|------|
| Staging | Policy on a branch-SHA-timestamp tag or `>=1.0.0-0`; push to the same branch; fast loop |
| Production | Policy on stable semver only (`1.4.x`); push to a **separate branch** and open a PR so a human approves (repository-structure guide) |
| Tag filter | Exclude signatures and `latest`; the default excludes `^.*\.sig$` |
| Registry credentials in Git | Encrypted only (SOPS, Sealed Secrets), see devops-secrets |
| Commit author | A bot identity and a message template with `{{ .Changed.Summary }}` so history shows what moved |
| Rollback | Revert the bot's commit in Git; the automation will re-advance unless the policy range is tightened or the automation is suspended (`flux suspend image update <name>`) |

## Commands

```bash
flux get image repository app ; flux get image policy app ; flux get images all -A
flux create image policy app --image-ref=app --select-semver='1.4.x' --export > policy.yaml   # generates the manifest
flux suspend image update flux-system        # stop commits; resume with flux resume image update flux-system
```

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Policy `latest` or a broad range in production | Untested images deployed by a bot |
| Automation pushes to `main` that other Kustomizations watch with `interval: 1m` | Deploys on every scan; separate environments by branch or path |
| Marker omitted or malformed | No update, no error in the app; check `flux get image update` |
| Image pinned by digest elsewhere (Kustomize `images`) | Two writers for the same field |

## Verification

`flux get image policy app` shows the expected latest tag; after a scan the bot commit appears in Git; the Kustomization applies it (`flux get kustomizations`); the pod runs that tag (`kubectl get deploy -o jsonpath` on the image).

## Sources (read 2026-11-10)

- https://fluxcd.io/flux/guides/image-update/
- https://fluxcd.io/flux/guides/repository-structure/ (production approval through a pull request)

## Not verified

- ImagePolicy alternatives (CalVer, regex) and `sortable image tags` guide not read; only semver is shown.
- `flux suspend image update` exists in the CLI index; its page was not read.
- Behaviour when two automations target the same file.
- Nesting of `git.commit.author` in the template: the guide's rendered manifest showed `email`/`name` directly under `commit` in the fetched text (likely a rendering loss of `author:`); the Image update automation API reference v1 must be checked before applying.
