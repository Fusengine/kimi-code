---
name: devops-secrets
description: Use when creating, distributing, rotating, revoking or auditing the operation of secrets on self-hosted infrastructure - choosing between SOPS+age, Sealed Secrets, External Secrets Operator, HashiCorp Vault or OpenBao; running a Vault/OpenBao cluster (seal/unseal, auto-unseal, raft snapshots, auth methods, policies, KV v2, dynamic database credentials, PKI, audit devices); Kubernetes Secret handling (base64 is not encryption, encryption at rest, KMS provider, RBAC); Docker/Compose/BuildKit secrets; CI secrets without static keys (OIDC); machine identity and short-lived credentials; certificates as secrets; pre-commit secret scanning (gitleaks, trufflehog); reacting to a leaked secret; writing a rotation runbook. Not for auditing an application or hardening a host (security-expert), the GitOps controller wiring itself (devops-gitops-packaging), pipeline design (devops-cicd), image builds (devops-docker), Ansible Vault usage (devops-ansible) or ACME/TLS termination (devops-networking).
versions:
  vault: "2.2.1 (BUSL 1.1 licence, IBM licensor)"
  openbao: "2.7.2 (docs 2.7.x, a Series of LF Projects)"
  sops: "3.13.3"
  age: "1.3.2"
  sealed-secrets: "0.41.2 (repo bitnami/sealed-secrets)"
  external-secrets: "2.15.0 (only the newest minor is supported)"
  gitleaks: "8.30.1 (feature complete, security patches only)"
  trufflehog: "3.99.8"
references:
  - references/secrets-lifecycle.md
  - references/vault-openbao-core.md
  - references/vault-openbao-access.md
  - references/sops-age.md
  - references/sealed-secrets.md
  - references/external-secrets-operator.md
  - references/kubernetes-secrets-at-rest.md
  - references/container-ci-ansible-secrets.md
  - references/machine-identity-certificates.md
  - references/leak-prevention-response.md
  - references/rotation-lifecycle.md
  - references/destructive-secret-ops.md
  - references/templates/sops.yaml
  - references/templates/external-secrets.yaml
  - references/templates/sealed-secret-workflow.md
  - references/templates/vault-policy.hcl
  - references/templates/vault-kubernetes-auth-role.sh
  - references/templates/encryption-configuration.yaml
  - references/templates/gitleaks.toml
  - references/templates/leaked-secret-response.md
  - references/templates/rotation-runbook.md
related-skills:
  - devops-kubernetes
  - devops-k8s-cluster
  - devops-gitops-packaging
  - devops-cicd
  - devops-docker
  - devops-ansible
  - devops-networking
  - devops-linux
  - devops-storage-backup
  - devops-sre-ops
---

<objective>
Covers secrets as an operations discipline: what kinds of secret exist, how each is
created, distributed, rotated, revoked and audited, which tool fits which context,
how to run Vault or OpenBao, how SOPS, Sealed Secrets and External Secrets Operator
deliver secrets to Git-driven clusters, what a Kubernetes Secret really protects,
how to keep secrets out of builds and pipelines, how to detect a leak and respond
to one. Does not cover auditing an application or hardening a host
(security-expert), the GitOps controller setup (devops-gitops-packaging),
pipeline authoring (devops-cicd), Dockerfile practice (devops-docker), Ansible Vault
usage (devops-ansible) or ACME and TLS termination (devops-networking).
</objective>

# DevOps Secrets

## Agent Workflow (MANDATORY)

Before ANY change to a secret store, a secret manifest or a rotation, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find `.sops.yaml`, SealedSecret/ExternalSecret manifests, Vault/OpenBao config and policies, CI secret references, `.gitleaks.toml`, existing rotation runbooks
2. **research-expert** - verify flags, API versions and licence/support status at the official source (developer.hashicorp.com/vault, openbao.org, getsops.io, external-secrets.io, github.com/bitnami/sealed-secrets)
3. **mcp__context7__query-docs** - `/websites/developer_hashicorp_vault`, `/getsops/sops`, `/websites/external-secrets_io`, `/bitnami/sealed-secrets`

Then inspect the target read-only (`vault status`, `kubectl get externalsecret -A`, `git diff --stat` on encrypted files; never a decrypt to stdout). After writing files in a repo, run **sniper**.

## Versions (checked 2026-11-10)

Vault v2.2.1, OpenBao v2.7.2, SOPS v3.13.3, age v1.3.2, Sealed Secrets v0.41.2, External Secrets Operator v2.15.0, gitleaks v8.30.1, trufflehog v3.99.8 (GitHub `releases/latest` redirects). Vault source licence: Business Source License 1.1 (licensor IBM, change licence MPL 2.0 after four years, internal use not a competitive offering); OpenBao is hosted by the Linux Foundation as "a Series of LF Projects" (its licence file was not read). ESO supports only the current minor release. gitleaks states it is feature complete with security patches only. Details and URLs: each reference's Sources.

## Critical Rules

1. **Never print a secret value.** Not in chat, logs, diffs, `describe`, `-o yaml` of a Secret, `sops -d` to stdout, `vault kv get` without `-field` into a pipe you cannot see, or a `vault read` of dynamic credentials. Show names, keys, paths, versions, fingerprints, lease IDs and timestamps only. Redact before quoting anything.
2. **Never put a secret value on a command line.** Arguments land in shell history, `ps` and CI logs. Read values from a file with mode 0600, stdin, a prompt or an environment variable set by the secret store.
3. **A leaked secret is revoked and rotated first.** Rewriting git history is cleanup, never remediation ([leak-prevention-response.md](references/leak-prevention-response.md)).
4. **Prefer short-lived and identity-based over static.** Dynamic credentials, OIDC federation and workload identity beat long-lived keys in Git, CI variables or Secrets.
5. **Destructive or irreversible secret operations are proposed, not run.** Use the ACTION / EFFECT / PROOF / WAIT-FOR-GO format and state what becomes unrecoverable ([destructive-secret-ops.md](references/destructive-secret-ops.md)).
6. **Key custody before anything else.** A key whose only copy sits where the data sits (unseal keys, age identity, Sealed Secrets controller key, encryption-at-rest key) is a lost-data incident waiting; confirm an offline copy exists before encrypting at scale.
7. **Never invent a flag, CRD field or API.** Cite the doc page; unknown = "not verified".

## Overview

| Need | Pick | Why in one line |
|------|------|-----------------|
| Few secrets, GitOps, no server to run | SOPS + age | Encrypted files in Git, one private key to guard |
| Kubernetes-only, write-only Git workflow, small team | Sealed Secrets | Public-key encryption, controller decrypts in-cluster |
| Many secrets, one source of truth, rotation, audit | Vault or OpenBao + ESO | Dynamic credentials, leases, policies, audit devices |
| Per-request database/PKI credentials | Vault/OpenBao engines | Unique short-lived credentials, automatic revocation |
| Public-cloud secret manager already in use | ESO provider | One-line pointer; deep dive out of scope |
| Build-time secret | BuildKit secret mount | Never `ARG`/`ENV` ([container-ci-ansible-secrets.md](references/container-ci-ansible-secrets.md)) |
| CI to infrastructure | OIDC federation | No static key to leak |

## Architecture

```
repo/
├── .sops.yaml                  # creation rules: path regex -> age recipients
├── secrets/                    # SOPS-encrypted files only (values ciphertext)
├── k8s/
│   ├── secretstore.yaml        # ESO SecretStore / ClusterSecretStore
│   ├── externalsecret.yaml     # what to fetch; the cluster builds the Secret
│   └── sealedsecret.yaml       # or: ciphertext sealed for one cluster
├── vault/policies/*.hcl        # least-privilege policies, reviewed like code
├── .gitleaks.toml              # extends the default rules
└── runbooks/rotation-<secret>.md
```

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Lifecycle and tool choice** | [secrets-lifecycle.md](references/secrets-lifecycle.md) | New secret, tool decision, bootstrap problem, agent output rules |
| **Vault/OpenBao core** | [vault-openbao-core.md](references/vault-openbao-core.md) | Status and licence, seal/unseal, auto-unseal, raft, audit devices |
| **Vault/OpenBao access** | [vault-openbao-access.md](references/vault-openbao-access.md) | Auth methods, policies, KV v2, dynamic DB credentials, PKI |
| **SOPS + age** | [sops-age.md](references/sops-age.md) | Encrypted files in Git, key custody, recipients |
| **Sealed Secrets** | [sealed-secrets.md](references/sealed-secrets.md) | Scopes, controller key backup/renewal |
| **External Secrets Operator** | [external-secrets-operator.md](references/external-secrets-operator.md) | SecretStore, ExternalSecret, multi-tenancy |
| **Kubernetes Secrets** | [kubernetes-secrets-at-rest.md](references/kubernetes-secrets-at-rest.md) | base64, EncryptionConfiguration, KMS, RBAC |
| **Docker, CI, Ansible** | [container-ci-ansible-secrets.md](references/container-ci-ansible-secrets.md) | Compose secrets, BuildKit, OIDC |
| **Machine identity and certs** | [machine-identity-certificates.md](references/machine-identity-certificates.md) | Workload identity, SPIFFE pointer, certificates |
| **Leaks** | [leak-prevention-response.md](references/leak-prevention-response.md) | Scanners, pre-commit, response order |
| **Rotation** | [rotation-lifecycle.md](references/rotation-lifecycle.md) | Rotation patterns per secret type |
| **Destructive operations** | [destructive-secret-ops.md](references/destructive-secret-ops.md) | Any irreversible secret command |

### Templates

| Template | When to Use |
|----------|-------------|
| [sops.yaml](references/templates/sops.yaml) | Copy as `.sops.yaml`; age recipients per path |
| [external-secrets.yaml](references/templates/external-secrets.yaml) | SecretStore (Vault, Kubernetes auth) + ExternalSecret + ClusterSecretStore |
| [sealed-secret-workflow.md](references/templates/sealed-secret-workflow.md) | Seal a Secret offline, back up the controller key |
| [vault-policy.hcl](references/templates/vault-policy.hcl) | Least-privilege KV v2 + dynamic DB policy |
| [vault-kubernetes-auth-role.sh](references/templates/vault-kubernetes-auth-role.sh) | Enable Kubernetes auth, define a role (reference only, not executable as is) |
| [encryption-configuration.yaml](references/templates/encryption-configuration.yaml) | kube-apiserver encryption at rest |
| [gitleaks.toml](references/templates/gitleaks.toml) | Extend default rules, scoped allowlist |
| [leaked-secret-response.md](references/templates/leaked-secret-response.md) | Incident checklist |
| [rotation-runbook.md](references/templates/rotation-runbook.md) | Per-secret runbook skeleton |

## Quick Reference

```bash
vault status                                    # sealed? HA? version (read-only, no auth needed)
vault kv metadata get -mount=secret app/db      # versions and timestamps, no value
vault lease lookup <lease-id>                   # lease TTL, no value
kubectl --context "$CTX" -n "$NS" get externalsecret   # READY / STATUS, no value
kubectl --context "$CTX" -n "$NS" get secret db-credentials -o jsonpath='{.data}' | jq 'keys'
gitleaks dir --redact --no-banner .             # scan working tree, secrets masked in output
gitleaks git --redact --no-banner .             # scan history, secrets masked
```

## Best Practices

### DO
- Write a rotation runbook before the first production use of any secret
- Keep the unseal/recovery keys, age identities and Sealed Secrets key backups in separate custody, tested by a restore
- Enable at least two Vault/OpenBao audit devices so one failing does not stop the service
- Scope ESO `ClusterSecretStore` access with `conditions` and give each store the least-privilege role

### DON'T
- Treat base64 or a private Git repo as protection
- Commit `.env`, kubeconfig, age identity files or Terraform state holding secrets
- Rely on git history rewriting after a leak
- Disable the pre-commit scanner with `SKIP=` as a habit
