---
name: kubernetes-secrets-at-rest
description: What a Kubernetes Secret protects (base64 is encoding), encryption at rest with EncryptionConfiguration and a KMS v2 provider, key rotation, re-encryption of existing Secrets, RBAC exposure
when-to-use: Reviewing Secret exposure, enabling or changing encryption at rest, rotating the API server encryption key, deciding who may read Secrets
keywords: kubernetes secret, base64, etcd, encryption at rest, EncryptionConfiguration, aescbc, secretbox, kms v2, identity provider, encryption-provider-config, kubectl replace
priority: critical
related: destructive-secret-ops.md, external-secrets-operator.md, sealed-secrets.md
---

# Kubernetes Secrets Reality

**Load when:** any task where a value ends up in a `kind: Secret`. Cluster lifecycle, etcd backups and apiserver static-pod editing belong to `devops-k8s-cluster`; workload consumption patterns to `devops-kubernetes` (config-secrets.md).

## Facts

| Fact | Consequence |
|------|-------------|
| `data` values are base64: an encoding, anyone can decode | A manifest, `-o yaml` output or a Git repo holding a Secret holds the secret |
| Without `--encryption-provider-config` the API server stores plain text in etcd | An etcd snapshot or disk read exposes every Secret |
| If the first provider is `identity`, nothing is encrypted | Check the order, not just that the file exists |
| Anyone who can create a Pod in a namespace can mount any Secret there | RBAC on `pods` create ~ Secret read |
| At-rest encryption protects etcd storage, not API reads, not node tmpfs, not pod environment | A user with `get secrets` still reads plaintext |
| Encryption applies to writes after the change | Existing Secrets stay plaintext until rewritten |

## Encryption at rest

`EncryptionConfiguration` (`apiVersion: apiserver.config.k8s.io/v1`) lists `resources` (for example `secrets`, optionally `configmaps`, custom resources from v1.26, wildcards from v1.27) and an **ordered** `providers` list:

- The **first** provider encrypts new writes; on read every provider is tried in order. A stored value no listed provider can read makes the resource unreadable (API error).
- Providers named in the page: `identity` (plain), `aescbc`, `aesgcm`, `secretbox`, `kms`. Each entry supports multiple keys; with a local provider the first key encrypts.
- **KMS v2** (`kms` provider): `apiVersion: v2`, `name` (cannot change once set), `endpoint` (UNIX socket of the KMS plugin), `timeout` (default 3s). Envelope encryption keeps the key outside the cluster; the plugin and the KMS become a dependency of every Secret write and read of uncached data.
- Local keys (`aescbc`, `secretbox`) sit in a file on every control-plane node: protect the file (mode, disk encryption, no Git) and back it up.
- Template: [templates/encryption-configuration.yaml](templates/encryption-configuration.yaml) - keys are placeholders; generate real ones on the control-plane host.

Wildcards must not overlap; put a specific exemption (`identity`) **before** the wildcard entry.

### Verify it works

1. Config check: `kube-apiserver` runs with `--encryption-provider-config=<path>` and the first provider is not `identity`.
2. Proof of storage encryption: read the raw etcd value of a test Secret with `etcdctl` and confirm the stored bytes start with the provider prefix instead of readable text (the page's procedure; do this on a throwaway Secret, never print a real one).
3. Re-encrypt old data: `kubectl get secrets --all-namespaces -o json | kubectl replace -f -` (needs admin access, retry on conflict). This rewrites every Secret: see [destructive-secret-ops.md](destructive-secret-ops.md).

### Rotate the encryption key (documented order)

1. Add the new key as the **second** entry on all control-plane nodes; restart **all** kube-apiserver processes so each can decrypt it.
2. Make a secure backup of the new key. Losing all copies means deleting every resource encrypted under it.
3. Move the new key to the **first** position; restart all apiservers again.
4. Re-write all Secrets (`kubectl replace` above).
5. Remove the old key only after step 4 completed and the backup exists.

Changing provider order or removing a key early can make Secrets unreadable: ACTION/EFFECT/PROOF/WAIT-FOR-GO.

## RBAC exposure

```bash
kubectl --context "$CTX" auth can-i get secrets -n "$NS" --as=system:serviceaccount:"$NS":web   # expect "no"
kubectl --context "$CTX" auth can-i create pods -n "$NS" --as=<subject>                         # "yes" implies Secret reach
```

- Avoid `list`/`watch` on secrets (they return values); name specific `resourceNames` when `get` is required.
- Give workloads their own ServiceAccount and `automountServiceAccountToken: false` unless needed (devops-kubernetes).
- `immutable: true` Secrets cut accidental edits; a changed value means a new object name.

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/ (determine, configuration, wildcards)
- Context7 `/websites/kubernetes_io`: key rotation steps, `kubectl replace`, KMS v2 fields and example (pages encrypt-data and kms-provider)
- ../devops-kubernetes/references/config-secrets.md (sibling skill facts on Secrets and pod creation)

## Not verified

- The etcdctl verification commands and the stored-prefix format: the encrypt-data section "ensure all secrets are encrypted" was not read in full; read it before running them.
- Which KMS plugins exist for self-hosted setups (for example a Vault-backed plugin): not researched.
- Behaviour of `kubectl replace` on Secrets with finalizers or large counts, and `resourceVersion` conflicts: not read.
- Kubernetes 1.37 changes to encryption at rest: release notes not read.
