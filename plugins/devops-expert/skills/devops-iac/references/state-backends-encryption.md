---
name: state-backends-encryption
description: Remote state backends (S3-compatible/MinIO, HTTP, PostgreSQL, Kubernetes), locking, credentials handling and OpenTofu state encryption
when-to-use: Choosing or changing a backend, configuring MinIO state, enabling encryption, or diagnosing a lock
keywords: backend s3, minio, use_lockfile, pg, http, kubernetes secret, force-unlock, state encryption, pbkdf2, aws_kms, fallback
priority: critical
related: state-surgery.md, plan-apply-protocol.md, environments.md
---

# State backends, locking and encryption

**Load when:** state needs a home, a backend changes, or state must be encrypted. The state holds every attribute of every resource, secrets included (the OpenStack instance resource states that all arguments, admin password too, are stored in plain text in state).

## Backend choice

| Backend | Locking | Pick when | Limits |
|---------|---------|-----------|--------|
| `s3` (AWS or S3-compatible such as MinIO) | `use_lockfile = true` (conditional writes, `If-None-Match`) or DynamoDB | You run an object store; most common self-hosted choice | Enable bucket versioning; lock objects add versions, add a lifecycle rule |
| `pg` | Postgres advisory locks; `force-unlock` not supported (locks drop with the session) | You already run PostgreSQL 10+ | Several tool versions under 1.10 on one database are unsafe; keep `public` schema access |
| `http` | `LOCK`/`UNLOCK` methods; 423 or 409 means held | A service (GitLab, custom) exposes a state API | Locking disabled unless `lock_address` set |
| `kubernetes` | Lease resource | State of in-cluster tooling | Secret size limit 1 MB; secret named `tfstate-{workspace}-{secret_suffix}` |
| `local` | none across machines | Throwaway lab only | Never for shared infrastructure |

## S3-compatible (MinIO) configuration

```hcl
terraform {
  backend "s3" {
    bucket = "tfstate"
    key    = "live/prod/network/terraform.tfstate"
    region = "us-east-1"                       # dummy value for non-AWS stores
    endpoints = { s3 = "https://minio.example.internal:9000" }
    use_path_style              = true
    use_lockfile                = true
    skip_credentials_validation = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_s3_checksum            = true         # only if the store rejects checksums
  }
}
```

Credentials come from the environment, never the file: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (store the values in `devops-secrets`). Pass secrets with a partial configuration or environment variables: values given inline or via `-backend-config` are written into `.terraform/` and into plan files (OpenTofu backend docs warning). Full file: [templates/root-module.tf](templates/root-module.tf).

Terraform's S3 backend documents `use_lockfile` and marks DynamoDB locking as deprecated; OpenTofu documents both as supported.

## Locks

- A lock is released by the process that took it. `force-unlock LOCK_ID` removes it without touching infrastructure; run it only after proving the holder is dead (ACTION / EFFECT / PROOF in `plan-apply-protocol.md`). `pg` has no `force-unlock`: end the holding session instead (`pg_locks`).
- `-lock=false` on any state command is dangerous when others can run concurrently; never in automation.

## OpenTofu state and plan encryption

Template: [templates/encryption.tf](templates/encryption.tf). Rules from the OpenTofu docs:

1. Encrypts state and plan **at rest** (local and any backend). It does not protect against data loss, replay of an older state/plan, or the person running `tofu`.
2. Without the key the state is unrecoverable: back up the unencrypted state and the keys first, and exercise the recovery before enabling.
3. Existing project: add a `method "unencrypted"` and a `fallback` on the state method, apply once, then remove the fallback and set `enforced = true`.
4. Never rename key providers or methods after encrypting (metadata stores their names); roll over with a `fallback` block or set `encrypted_metadata_alias`.
5. Key providers verified in the docs: `pbkdf2` (passphrase, at least 16 characters), `aws_kms`, `gcp_kms`, `external` (a command); the page also lists Azure Key Vault and OpenBao providers (read their exact block names there). Use one KMS key per state, not one for many.
6. `TF_ENCRYPTION` environment variable supplies the same config and merges over code; use it with `enforced = true` in code so unencrypted writes are impossible.
7. Reading an encrypted state through `terraform_remote_state` is configured in the `remote_state_data_sources` block.

## Procedure: enable encryption (propose, then go)

```bash
tofu state pull > backup-$(date +%F).tfstate    # plain backup, stored encrypted elsewhere
# add encryption.tf with the unencrypted fallback, then:
tofu plan -out=tfplan && tofu apply tfplan      # first write is encrypted
aws --endpoint-url <endpoint> s3 cp s3://tfstate/<key> - | head -c 300   # proof: the stored object is not readable JSON resources (state pull itself may print decrypted state: not verified)
# remove the fallback, set enforced = true, plan again: expect no changes
```

## Pitfalls

- Bucket versioning off: a bad `state push` or delete is unrecoverable.
- One bucket and key shared by two roots: the second `init` adopts the first root's state.
- Putting the passphrase default in `variable` (as the docs sample does) - supply it through the environment.
- MinIO and `use_lockfile`: confirm the server honours conditional writes before trusting the lock (not verified).

## Verification

```bash
tofu init -reconfigure && tofu state list | head      # backend reachable, state readable
aws --endpoint-url https://minio.example.internal:9000 s3api get-bucket-versioning --bucket tfstate   # Status: Enabled
```

## Sources

- https://opentofu.org/docs/language/settings/backends/s3/ , .../pg/ , .../http/ , .../kubernetes/
- https://opentofu.org/docs/language/state/encryption/ , https://opentofu.org/docs/cli/commands/force-unlock/
- https://developer.hashicorp.com/terraform/language/backend/s3

## Not verified

- MinIO behaviour for conditional writes, checksum support and `use_path_style` requirements; test on the actual server.
- `init -migrate-state` / `-reconfigure` semantics (read the init command page before moving state between backends).
- Terraform-side encryption options other than backend features.
