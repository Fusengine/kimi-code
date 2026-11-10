# GitOps repository layout and promotion flow

Based on the Flux monorepo structure (https://fluxcd.io/flux/guides/repository-structure/), usable with Argo CD by pointing Applications at the same folders.

```
gitops/
├── clusters/
│   ├── staging/            # cluster entry point: Flux Kustomizations, or Argo CD Applications/ApplicationSets
│   │   ├── infrastructure.yaml
│   │   └── apps.yaml
│   └── production/
│       ├── infrastructure.yaml
│       └── apps.yaml
├── infrastructure/         # controllers and shared config, reconciled FIRST
│   ├── base/
│   ├── staging/
│   └── production/
├── apps/
│   └── web/
│       ├── base/           # kustomization.yaml + plain manifests (or a HelmRelease)
│       └── overlays/
│           ├── staging/    # version, replicas, hostnames of staging
│           └── prod/       # version/digest pinned by pull request
├── charts/                 # charts you own (published to an OCI registry by CI)
│   └── web/
└── README.md               # who owns what, how to promote, how to roll back
```

Rules:

- Infrastructure is reconciled before apps (`dependsOn` in Flux, sync waves or separate Applications in Argo CD).
- Environments are folders, not long-lived branches.
- `clusters/<name>` is the only place that knows which cluster gets which overlay.
- Secrets are encrypted files or references only (devops-secrets).

Promotion flow:

```
CI (devops-cicd)  builds image app:1.4.2 + digest, publishes chart web 1.4.2 to OCI
        |
        v   automatic (Flux image automation or CI commit)
apps/web/overlays/staging   -> controller applies -> smoke test passes
        |
        v   pull request: only the version/digest line changes, CI attaches the rendered diff
apps/web/overlays/prod      -> reviewer approves -> merge -> controller applies -> verify
        |
        v   rollback = git revert of that pull request's commit (data is not rolled back)
```
