---
name: rotation-lifecycle
description: How to rotate each kind of secret safely - dual-credential overlap, Vault/OpenBao database root and static roles, SOPS data key, Sealed Secrets and Kubernetes encryption keys, ESO refresh, verification and rollback
when-to-use: Scheduled or incident rotation of any secret, designing a rotation runbook, deciding rotation cadence
keywords: rotation, rotate, overlap, rotate-root, static role, rotate data key, key renewal, refreshInterval, reload, rollback, runbook
priority: high
related: destructive-secret-ops.md, leak-prevention-response.md, secrets-lifecycle.md, templates/rotation-runbook.md
---

# Rotation Lifecycle

**Load when:** a secret changes value or a key changes. Fill [templates/rotation-runbook.md](templates/rotation-runbook.md) for every secret before its first production use.

## Principles

1. **Overlap, then cut**: the consumer must accept both old and new for a window (two credentials, or a reload). A rotation that needs simultaneous change of issuer and all consumers is an outage plan.
2. **Order**: create new -> distribute -> verify consumers use it -> revoke old -> verify old fails. Never revoke first, except for a leak ([leak-prevention-response.md](leak-prevention-response.md)).
3. **Rollback before cut**: until the old credential is revoked, rollback is "point the consumer back". After revocation rollback is "issue another new one". State which phase you are in.
4. **Prove with metadata**: new version number, timestamp, lease ID, consumer reload time, a successful authenticated call by a test client. Never print the value.
5. **Cadence follows exposure**: dynamic credentials rotate by TTL; static ones on a calendar and after every departure, incident or tool compromise.

## Per secret type

| Secret | Mechanism | Notes |
|--------|-----------|-------|
| Vault/OpenBao KV static secret | Write a new KV v2 version, consumers refresh; old versions soft-deleted, later destroyed | `max_versions` bounds history; consumer must read `latest` or a pinned version on purpose |
| Database via dynamic role | Nothing to rotate for users (TTL expiry revokes); rotate the **Vault DB root user** with `database/rotate-root/<name>` | After it, nobody knows the root password: use a DB user dedicated to Vault |
| Database via static role | Vault rotates the mapped user's password on a period/schedule | Never map the config root user to a static role |
| ESO-synced Kubernetes Secret | Change at the source; ESO re-syncs on `refreshInterval` (default policy Periodic) | Pods using env vars need a restart; volume mounts refresh eventually (devops-kubernetes) |
| SOPS data key | `sops rotate -i <file>` | New data key; old Git revisions still decryptable by old recipients |
| SOPS recipient (age identity) | New identity -> add to `.sops.yaml` -> `sops updatekeys` per file -> remove old -> rotate underlying secrets | Old identity keeps decrypting history |
| Sealed Secrets sealing key | Automatic every 30 days; `kubeseal --re-encrypt` to move files to the newest key; re-backup keys | Renewal does not change secret values |
| Kubernetes encryption-at-rest key | Add second -> restart apiservers -> make first -> restart -> `kubectl replace` all Secrets -> remove old | [kubernetes-secrets-at-rest.md](kubernetes-secrets-at-rest.md) |
| Vault unseal/recovery keys | `vault operator rekey` (requires quorum of current keys); with auto-unseal use `-target=recovery` | Distribute new shares, destroy old shares only after the verification step |
| Vault root token | Revoke after use; generate again with `generate-root` when needed | Never a standing credential |
| AppRole SecretID | Short `secret_id_ttl`/`secret_id_num_uses`; issue per deploy | Deliver separately from RoleID |
| TLS certificates | Short TTL via PKI engine or ACME, automated renewal | Alert on remaining validity |
| CI static key | Replace with OIDC; else rotate and update CI variable | [container-ci-ansible-secrets.md](container-ci-ansible-secrets.md) |
| SSH keys / CA | Pointer: `devops-linux` | CA private key rotation is an incident-class event |

## Verification commands (metadata only)

```bash
vault kv metadata get -mount=secret app/db           # current_version / updated_time advanced?
vault lease lookup <lease-id>                        # TTL of a dynamic credential
kubectl --context "$CTX" -n "$NS" get externalsecret db -o jsonpath='{.status.conditions}'   # sync status
kubectl --context "$CTX" -n "$NS" rollout status deploy/app --timeout=5m
```

Then a **test client** authenticates with the new credential (success) and with the old one (failure), the test script reading values from files, not arguments.

## Sources (read 2026-11-10)

- https://developer.hashicorp.com/vault/docs/secrets/databases ; /vault/docs/commands/operator/rekey ; /vault/docs/auth/approle ; /vault/docs/commands/kv/metadata
- https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/ (via Context7: rotation steps)
- Context7 `/getsops/sops` (`rotate`, `updatekeys`), `/bitnami/sealed-secrets` (renewal, re-encrypt), `/websites/external-secrets_io` (refreshInterval, refreshPolicy)

## Not verified

- Cadence numbers (calendar rotation periods) are policy choices, not sourced; pick them with the owner.
- `generate-root` command forms and PKI CA rotation procedure: pages not read.
- Rotation helpers of specific databases (users, grants, connection pool behaviour during `rotate-root`): database-specific, not read.
