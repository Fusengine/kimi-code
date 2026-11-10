---
name: vault-openbao-access
description: Vault/OpenBao access layer - auth methods (Kubernetes, AppRole, JWT/OIDC), path policies, KV v2, dynamic database credentials, PKI engine
when-to-use: Giving a workload or person access to a Vault/OpenBao secret, writing a policy, enabling a secrets engine, replacing static database passwords
keywords: vault, openbao, auth method, kubernetes auth, approle, jwt, oidc, policy, capabilities, kv v2, database secrets engine, static role, dynamic role, pki, lease
priority: high
related: vault-openbao-core.md, external-secrets-operator.md, machine-identity-certificates.md, destructive-secret-ops.md
---

# Vault/OpenBao - Auth, Policies, Engines

**Load when:** configuring who may read what. Commands use `vault`; for OpenBao use `bao` (the Kubernetes auth page was compared; other pages were not).

## Auth methods

| Method | Use for | Key facts (docs read) |
|--------|---------|-----------------------|
| `kubernetes` | Pods in a cluster | Login with a ServiceAccount JWT against a `role`; role binds `bound_service_account_names` and `bound_service_account_namespaces`, sets `policies`, `ttl`, optional `audience`. Vault calls the TokenReview API, so it needs a reviewer identity |
| `jwt` / OIDC | CI runners, humans via SSO, short-lived Kubernetes tokens | The Kubernetes page lists JWT auth as the option when all tokens must be short-lived and Vault cannot revoke early |
| `approle` | Machines/automation that cannot use platform identity | `role_id` + `secret_id`; recommended with `batch` tokens; SecretID has TTL and use limits; deliver the SecretID through a trusted channel, never beside the RoleID |
| `token` | Bootstrap only | Not for workloads |

Kubernetes-auth specifics:

- Since Kubernetes 1.21 mounted tokens are short-lived and bound to the pod; for the **reviewer JWT** pick one: Vault runs in the cluster and uses its own token as reviewer (Vault 1.9.3+), client JWT as reviewer, a long-lived reviewer token (cannot be short-lived), or JWT auth instead.
- On 1.21+ set `disable_iss_validation=true` where the mount predates Vault 1.9 (`vault read -field disable_iss_validation auth/kubernetes/config` to check).
- Vault's own warning: the JWT is shared with Vault over the network, which is acceptable because Vault is in the trusted compute base; applications must not share their JWT with others.
- ESO's Vault provider with Kubernetes auth needs the `system:auth-delegator` ClusterRole bound to the ServiceAccount (see [external-secrets-operator.md](external-secrets-operator.md)).
- Template: [vault-kubernetes-auth-role.sh](templates/vault-kubernetes-auth-role.sh).

## Policies

- Path-based, **deny by default**; an empty policy grants nothing. `deny` overrides every other capability, `sudo` included.
- Capabilities: `create`, `read`, `update`, `patch`, `delete`, `list`, plus `sudo`, `deny`, `subscribe`; `recover` appears in the policy-syntax example. `list` results are not filtered by policy - never encode secrets in key names.
- Discover required capabilities with `-output-policy` on a CLI command.
- Templated paths like `secret/data/{{identity.entity.id}}/*` give per-identity areas.
- **KV v2 paths**: data under `<mount>/data/<path>`, metadata under `<mount>/metadata/<path>`; a v1-style path in a policy silently grants nothing on v2.
- Policies are code: store the HCL in Git, review it, apply it with a pipeline. Template: [vault-policy.hcl](templates/vault-policy.hcl).

```bash
vault policy list
vault policy read app-readonly              # policy HCL, contains no secret values
vault token capabilities <path>             # what the current token may do on a path
```

## KV v2

- Versioned static secrets. `delete` is a soft delete (data recoverable); **`destroy` permanently removes the named versions**; **`vault kv metadata delete` removes all versions and metadata**. See [destructive-secret-ops.md](destructive-secret-ops.md).
- Metadata (`vault kv metadata get`) shows versions, timestamps, `max_versions`, `cas_required`, `delete_version_after` without values. `max_versions` set on a key: older versions are permanently deleted once exceeded.
- Check-and-set (`-cas-required`) prevents blind overwrites.
- ESO's Vault provider supports the KV engine only; other engines go through the ESO Vault generator.

## Dynamic database credentials

Verified flow (database secrets engine):

1. `vault secrets enable database`
2. `vault write database/config/<name> plugin_name=... connection_url=... allowed_roles=... username=... password=...` using a **dedicated DB user created for Vault**.
3. Rotate that root user: `vault write -force database/rotate-root/<name>` - afterwards **the original root password is no longer known to anyone**; use a user made only for Vault.
4. `vault write database/roles/<role> db_name=<name> creation_statements=... default_ttl=1h max_ttl=24h`
5. Clients read `database/creds/<role>`: unique username per request, revoked at lease end.

- **Static roles** map one Vault role to one existing DB user and rotate its password on a period or schedule; anyone with the policy reads the current password. Never assign the root credentials from `config/` to a static role - rotation breaks every other user of that config.
- Revocation: `vault lease revoke <lease-id>`; prefix revocation is bulk and destructive ([destructive-secret-ops.md](destructive-secret-ops.md)).

## PKI engine

- Issues X.509 certificates on demand after Vault authentication, with short TTLs so revocation is rarely needed and CRLs stay small; certificates can live only in memory.
- Setup guides exist for root CA and intermediate CA; keep the root CA offline and issue through an intermediate (design practice; the quick-start pages were not read).
- ACME is available on the PKI engine (page listed in docs; contents not read). ACME client side and TLS termination: `devops-networking`.

## Sources (read 2026-11-10)

- https://developer.hashicorp.com/vault/docs/auth/kubernetes ; https://openbao.org/docs/auth/kubernetes/
- https://developer.hashicorp.com/vault/docs/auth/approle
- https://developer.hashicorp.com/vault/docs/concepts/policies ; kv-v2 setup page (via Context7 `/websites/developer_hashicorp_vault`)
- https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2 ; /commands/kv/destroy ; /commands/kv/metadata
- https://developer.hashicorp.com/vault/docs/secrets/databases
- https://developer.hashicorp.com/vault/docs/secrets/pki
- https://external-secrets.io/latest/provider/hashicorp-vault/

## Not verified

- JWT/OIDC auth configuration fields (`bound_audiences`, `bound_claims`, `user_claim`): the jwt page was not read; read it before writing a config.
- PKI role/issue parameters, root/intermediate quick-starts, ACME limits: not read.
- OpenBao pages other than Kubernetes auth, seal and what-is: not read; do not assume engine parity.
- Vault Agent, Vault Secrets Operator, CSI provider: not read.
- `vault policy list/read` and `vault token capabilities`: command names appear in the CLI navigation / are standard, but their pages were not read.
