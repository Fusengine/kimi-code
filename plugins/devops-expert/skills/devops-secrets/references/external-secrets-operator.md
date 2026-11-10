---
name: external-secrets-operator
description: External Secrets Operator - SecretStore, ClusterSecretStore, ExternalSecret, refresh and deletion behaviour, Vault/OpenBao provider, multi-tenancy limits, release and support policy
when-to-use: Syncing secrets from Vault/OpenBao or a cloud secret manager into Kubernetes Secrets, reviewing who can read which store, upgrading ESO
keywords: external secrets, ESO, ExternalSecret, SecretStore, ClusterSecretStore, external-secrets.io/v1, refreshInterval, refreshPolicy, creationPolicy, deletionPolicy, ClusterExternalSecret, PushSecret
priority: high
related: vault-openbao-access.md, kubernetes-secrets-at-rest.md, sealed-secrets.md
---

# External Secrets Operator (ESO)

**Load when:** a cluster must consume secrets from an external store. ESO fetches from an external API and creates ordinary Kubernetes Secrets; it does not manage the lifecycle of the secret itself ("out of scope of ESO").

## Release and support (checked 2026-11-10)

- Latest release **v2.15.0**, listed as released Nov 10, 2026 for Kubernetes 1.37. **Only the newest minor is supported**; older minors are deprecated as soon as a new minor ships. Minors have been shipping every one to three weeks, so a pinned version ages in weeks.
- Plan: pin the chart/image version, read the release notes before each bump, upgrade **one minor at a time**, test outside production first (the project's own upgrade advice).
- Helm charts are "as-is"; hardened charts are not a project deliverable: review the default values.
- Provider stability (ESO table): HashiCorp Vault **stable**, Kubernetes **beta**, OpenBao **alpha** (maintained by an individual contributor in the table), AWS/GCP/Azure secret managers stable. The OpenBao provider's "alpha" status matters when OpenBao is chosen.
- API group `external-secrets.io/v1` for `SecretStore`, `ExternalSecret`, `ClusterSecretStore`, `ClusterExternalSecret`.

## Resources

| Kind | Role |
|------|------|
| `SecretStore` (namespaced) | How to authenticate to a backend; credentials via referenced Secret or ServiceAccount |
| `ClusterSecretStore` | Cluster-wide store, usable from any namespace unless limited by `spec.conditions` (`namespaceSelector`, `namespaces`, `namespaceRegexes`; any one match is enough) |
| `ExternalSecret` | What to fetch: `spec.secretStoreRef`, `spec.data[].remoteRef` (`key`, `property`, `version`), `spec.dataFrom` (`extract`, `find`), `spec.target` (`name`, `creationPolicy`, `deletionPolicy`, `template`) |
| `ClusterExternalSecret` | Creates ExternalSecrets in namespaces matched by `namespaceSelectors` |
| `PushSecret` | Writes Kubernetes Secret data to a provider (provider-dependent) |

- `spec.refreshInterval` (units s, m, h): how often the controller re-syncs; `spec.refreshPolicy`: `Periodic` (default), `CreatedOnce`, `OnChange`.
- `target.creationPolicy`: `Owner` (ESO owns the Secret) or `Merge` (merge into an existing Secret). `target.deletionPolicy: Delete` removes the Secret when the source disappears; the default retains it (documented on a provider page; confirm per version).
- `spec.target.template` builds the final Secret (type, labels, templated data) from fetched values.

Examples: [templates/external-secrets.yaml](templates/external-secrets.yaml).

## Vault/OpenBao provider

- KV engine only; for other engines use the Vault generator (docs link). `version: v2` default for KV.
- Auth modes: token, appRole, kubernetes, ldap, userPass, jwt/oidc, awsAuth, tlsCert. Prefer **kubernetes** or **jwt** (no stored token); `tokenSecretRef` stores a long-lived Vault token in a Secret, which defeats the point.
- Kubernetes auth: SecretStore `auth.kubernetes` with `mountPath`, `role`, `serviceAccountRef`; the ServiceAccount needs the `system:auth-delegator` ClusterRole binding for the TokenReview path described in the docs.
- `dataFrom.find` lists by regexp or `custom_metadata` tags; a deleted Vault secret whose metadata remains breaks `find`.
- `metadataPolicy: Fetch` reads custom metadata, KV v2 only.

## Access control and multi-tenancy

- ESO runs with **elevated privileges**: it creates/reads/updates Secrets in all namespaces and can reach the external store. Give its backend identity least privilege; narrow `ClusterSecretStore.conditions`; scope the Vault role to the paths a namespace needs (one Vault role and policy per tenant).
- Any developer who may create an `ExternalSecret` referencing a broad store can pull any key that store can read. Restrict by RBAC on `externalsecrets`, by store design, and with admission control (OPA or Kyverno are recommended by the docs).
- Multiple controllers can run, each limited by the store's `spec.controller` field (docs call this not widely tested).
- The produced Secret is a regular Secret: encryption at rest and workload RBAC apply ([kubernetes-secrets-at-rest.md](kubernetes-secrets-at-rest.md)).

## Operate

```bash
kubectl --context "$CTX" -n "$NS" get secretstore,externalsecret         # READY / STATUS columns
kubectl --context "$CTX" -n "$NS" describe externalsecret <name>          # events: auth, key not found, template errors
kubectl --context "$CTX" get clustersecretstore
```

Never `kubectl get secret -o yaml` on the generated Secret. Deleting an `ExternalSecret` with `creationPolicy: Owner` removes the Secret it owns; mounted pods keep running until restart, then fail: propose, do not run, ([kubectl-safe-ops](../../devops-kubernetes/references/kubectl-safe-ops.md) rules apply).

## Sources (read 2026-11-10)

- https://external-secrets.io/latest/introduction/overview/ ; https://external-secrets.io/latest/introduction/stability-support/
- https://external-secrets.io/latest/provider/hashicorp-vault/
- Context7 `/websites/external-secrets_io` (ClusterExternalSecret, ClusterSecretStore conditions, Vault Kubernetes auth, refreshPolicy)
- https://github.com/external-secrets/external-secrets/releases/latest (tag v2.15.0)

## Not verified

- The OpenBao provider page: the fetch returned navigation only; auth options and the `server`/`path` fields for OpenBao are unverified. Do not copy the Vault SecretStore for OpenBao without reading that page.
- Exact default of `deletionPolicy` and `creationPolicy` for v2.15: seen on provider/API example pages, not on the ExternalSecret API reference.
- ESO Vault generator, PushSecret behaviour per provider, `esoctl`: not read.
- v1 to v2 migration notes (ESO went from 0.x to 1.0 in Nov 2025 and 2.0 in Feb 2026 per the support table): not read.
