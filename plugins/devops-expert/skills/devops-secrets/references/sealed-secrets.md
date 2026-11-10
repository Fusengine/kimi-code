---
name: sealed-secrets
description: Sealed Secrets - SealedSecret resources, kubeseal, scopes, controller key renewal, backup and restore of the sealing keys, re-encryption
when-to-use: Committing Kubernetes secrets to Git as ciphertext, restoring after a cluster loss, rotating sealing keys, debugging decryption errors
keywords: sealed secrets, SealedSecret, kubeseal, bitnami.com/v1alpha1, scope strict namespace-wide cluster-wide, sealing key, key-renew-period, re-encrypt
priority: high
related: kubernetes-secrets-at-rest.md, destructive-secret-ops.md, external-secrets-operator.md, sops-age.md
---

# Sealed Secrets

**Load when:** secrets are stored in Git as `SealedSecret` and decrypted in-cluster by the controller. Latest release v0.41.2 (repo `bitnami/sealed-secrets`, formerly `bitnami-labs`; the old URL redirects).

## Model

- A cluster-side controller holds sealing **private keys**; `kubeseal` encrypts with the **public certificate**. Only the controller can decrypt; not even the author can read a SealedSecret back.
- Resource: `apiVersion: bitnami.com/v1alpha1`, `kind: SealedSecret`, `spec.encryptedData`, optional `spec.template` (type, immutable, labels/annotations, templated `data`) for the generated Secret. The Secret is owned by the SealedSecret and follows its update and delete.
- **Scopes**: `strict` (default; name and namespace are part of the ciphertext), `namespace-wide` (rename inside the namespace), `cluster-wide` (any namespace, any name). Choose `strict` unless you can state why not. Set with `kubeseal --scope` or annotations on the input Secret.
- The result is still a normal Kubernetes Secret in etcd: encryption at rest and RBAC still apply ([kubernetes-secrets-at-rest.md](kubernetes-secrets-at-rest.md)).

## Workflow

See [templates/sealed-secret-workflow.md](templates/sealed-secret-workflow.md). Summary:

1. Fetch the certificate once (`kubeseal --fetch-cert > cert.pem`) and use it offline (`kubeseal --cert cert.pem`); the certificate is not secret.
2. Build the Secret manifest from a 0600 file (never a literal on the command line) and pipe it straight to `kubeseal`; only the sealed output touches disk.
3. Commit the SealedSecret; the GitOps tool applies it.

## Key lifecycle

- Sealing keys **renew every 30 days** by default (new key appended; old keys remain for decryption). New secrets are sealed with the newest key. Tune with controller flag `--key-renew-period=<go duration>` (`0` disables renewal; "d" unit is not supported by Go durations).
- Renewal does not re-encrypt existing SealedSecrets and does not rotate the underlying secret values.
- `kubeseal --re-encrypt` re-encrypts a SealedSecret file with the latest key without sending the secret to the client; it does not update the in-cluster object, so commit the new file. Old keys are not garbage-collected.
- **Backup**: the controller keys are Secrets labelled `sealedsecrets.bitnami.com/sealed-secrets-key` in the controller namespace (default `kube-system`). The backup file contains private keys: encrypt it (age) and store it offline. **Recreate the backup after every renewal**, or it cannot decrypt newer SealedSecrets.
- **Restore**: apply the key Secrets before starting the controller, or replace the newly created ones and restart the controller pod.
- Losing every copy of the keys means every existing SealedSecret is unreadable; the only recovery is to re-create each secret value at its source and re-seal. Deleting the key Secrets is therefore a destructive operation ([destructive-secret-ops.md](destructive-secret-ops.md)).
- The project notes work on KMS/HSM-backed key management; it was not available in the README read today.

## Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| "no key could decrypt secret" | Sealed for another cluster, another name/namespace under `strict`, or keys lost | Re-seal against this cluster's certificate with the right name/namespace |
| Works after restore for old secrets, not new | Backup predates a renewal | Re-backup after each renewal |
| Secret exists but not updated | Secret not owned by the SealedSecret | The README documents annotations for managing/patching existing secrets; read it before forcing |
| `kubeseal --fetch-cert` fails | Control-plane firewall (for example private GKE) | Publish the certificate to a trusted URL and use `--cert` |

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/bitnami/sealed-secrets/main/README.md (head: overview, template, certificate, scopes)
- Context7 `/bitnami/sealed-secrets` (README sections: backup, restore, key renewal, `--re-encrypt`)
- https://github.com/bitnami/sealed-secrets/releases/latest (tag v0.41.2)

## Not verified

- Licence, supported Kubernetes versions table, upgrade notes, and the "Manual key management" / "common misconceptions" sections: not read.
- Behaviour of custom or imported keys, HSM/KMS offload: not read.
- Whether `bitnami/sealed-secrets` is still actively maintained beyond the v0.41.2 release: not checked (no maintainer statement read).
