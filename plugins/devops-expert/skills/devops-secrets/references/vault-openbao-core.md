---
name: vault-openbao-core
description: HashiCorp Vault and OpenBao - status and licence, choosing between them, seal/unseal and auto-unseal, integrated raft storage and snapshots, audit devices
when-to-use: Standing up, operating, backing up or recovering a Vault/OpenBao server; choosing Vault vs OpenBao; unsealing; enabling auditing
keywords: vault, openbao, bao, seal, unseal, shamir, auto-unseal, recovery keys, raft, snapshot, audit device, BUSL, license
priority: high
related: vault-openbao-access.md, destructive-secret-ops.md, rotation-lifecycle.md
---

# Vault and OpenBao - Core Operations

**Load when:** operating the server itself. Auth, policies and engines are in [vault-openbao-access.md](vault-openbao-access.md). Destructive commands (rekey, seal, restore) are in [destructive-secret-ops.md](destructive-secret-ops.md).

## Status (checked 2026-11-10)

| | Vault | OpenBao |
|---|-------|---------|
| Latest release | v2.2.1 (GitHub `releases/latest`) | v2.7.2 (GitHub `releases/latest`; docs "Version 2.7.x") |
| Licence | Business Source License 1.1, licensor IBM, Vault 1.15.0 or later; change date four years after each version's publication, change licence MPL 2.0 | Not read; project hosted as "OpenBao a Series of LF Projects, LLC" |
| Use grant | Production use allowed unless offering the work to third parties on a hosted/embedded basis in competition with IBM's paid versions; internal use inside your organisation (affiliates under common control included) is not a competitive offering | - |
| CLI binary | `vault` | `bao` (same command shapes in the pages read, for example `bao auth enable kubernetes`) |
| Enterprise-only | Seal wrap, performance standby, DR/performance replication are Enterprise per the pages read | Check the OpenBao docs per feature |

Choice rule: internal use of Vault is covered by the grant; a hosted or embedded offering to others is where BUSL bites. The agent states the facts and the licence text location; it does not give a legal opinion. For ESO, the Vault provider is "stable" and the OpenBao provider is "alpha" in the ESO stability table read today.

## Seal and unseal

- A server starts **sealed**: it reaches storage but cannot decrypt. Only unseal and status calls work.
- Key chain: unseal key -> root key -> keyring encryption key -> data.
- **Shamir seal** (default): the unseal key is split into shares; `vault operator unseal` takes shares one at a time until the threshold is met; each node of a cluster must be unsealed separately.
- A node stays unsealed until it is resealed through the API, restarted, or storage fails unrecoverably.
- **Auto-unseal** delegates the unseal key to a trusted service (KMS, HSM, or another Vault's transit engine). Initialisation then yields **recovery keys**, which authorise operations such as generating a root token but **cannot unseal** the server.
- **Lifecycle dependency:** if the auto-unseal key or service is permanently deleted, the cluster cannot be recovered, even from backups (Vault docs). Protect the seal key with deletion controls and an independent backup of the seal mechanism.
- Transit seal needs a token for the transit key; the docs strongly recommend environment variables over writing the token in the config file.
- OpenBao: `seal` stanza in config; since v2.6.0 external KMS plugins; in v2.7.0 many vendor-specific built-in seals moved to plugins only (see its deprecation notice); OpenBao runs a periodic seal health check (default every 10 minutes) and logs warnings when the seal mechanism breaks. It discourages automating Shamir shares (for example storing them in Kubernetes Secrets) and offers a static-key auto-unseal instead (OpenBao docs page "static key auto-unseal").

```bash
vault status                    # Initialized / Sealed / Version / HA mode, no secret in output
vault operator unseal           # prompts for one share, nothing on the command line
```

## Integrated storage (raft)

```bash
vault operator raft list-peers                      # read-only: members, leader, voter
vault operator raft snapshot save <file>.snap       # takes a point-in-time snapshot (integrated storage only)
```

- `snapshot save` is not supported when raft is only used as `ha_storage`.
- A restore must be forced when the unseal/auto-unseal keys do not match the snapshot's cluster (`vault operator raft snapshot restore -force <file>`; API `/v1/sys/storage/raft/snapshot-force`). The command returns before the restore finishes; wait for "post-unseal setup complete" and "vault is unsealed" in the server log. Restore and `remove-peer` are in [destructive-secret-ops.md](destructive-secret-ops.md).
- Snapshots contain all secrets: treat the file as a secret, encrypt it (age) before it leaves the host, and keep the keys needed to unseal that snapshot (seal keys or recovery path) in separate custody.
- Restore tests belong in `devops-storage-backup`'s restore-drill discipline.

## Audit devices

- Auditing is **off** on a new cluster; enable devices explicitly (`file`, `syslog`, `socket`).
- Vault logs every request/response to all enabled devices and guarantees a write to at least one; if **no** device can be written, Vault refuses the request. Enable **at least two** devices.
- String values are logged as HMAC-SHA256 keyed hashes by default; `/sys/audit-hash` computes the hash of a known value for matching. Disabling a device stops writes immediately, leaves existing logs, and loses the ability to hash against old entries (new key on re-enable).
- Audit logs hold request metadata: ship them off-host, restrict read access, rotate files.

```bash
vault audit list
vault audit enable file file_path=/var/log/vault_audit.log     # example from the Vault docs
```

## Operating checklist

1. `vault status` on every node: unsealed, same version, HA active/standby as expected.
2. Two audit devices enabled and receiving writes.
3. Last raft snapshot age and an encrypted off-host copy; last tested restore date.
4. Seal mechanism health (OpenBao health check log lines; for KMS/transit seals the KMS key policy and deletion protection).
5. Root token: revoked after bootstrap; regenerate through `generate-root` with unseal/recovery keys only when needed.
6. Upgrade: read the release notes and upgrade guide of the target version first; take a raft snapshot before (no upgrade procedure was read for this skill).

## Sources (read 2026-11-10)

- https://github.com/hashicorp/vault/releases/latest (redirect to tag v2.2.1) ; https://github.com/openbao/openbao/releases/latest (tag v2.7.2)
- https://raw.githubusercontent.com/hashicorp/vault/main/LICENSE
- https://openbao.org/docs/what-is-openbao/ ; https://openbao.org/docs/concepts/seal/ ; https://openbao.org/docs/configuration/seal/ ; https://openbao.org/docs/auth/kubernetes/
- https://developer.hashicorp.com/vault/docs/concepts/seal ; /vault/docs/configuration/seal/transit ; /vault/docs/commands/operator/raft ; /vault/docs/sysadmin/snapshots/restore (via Context7) ; /vault/docs/audit
- https://external-secrets.io/latest/introduction/stability-support/

## Not verified

- OpenBao licence text, and OpenBao's raft snapshot, audit and enterprise-parity details: not read; assume nothing beyond the pages listed.
- Whether `bao` accepts every `vault` flag shown here: only the Kubernetes auth commands were compared.
- Vault upgrade procedure, HA/standby behaviour and storage migration were not read.
- Exact current Shamir default share/threshold at init (the `rekey` page shows defaults 5 and 3 for rekey flags only).
