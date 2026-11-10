---
name: sops-age
description: SOPS with age - encrypted secret files in Git, .sops.yaml creation rules, recipients, key custody, adding/removing recipients, rotating the data key
when-to-use: Storing secrets in a Git repo for GitOps, Ansible or Terraform inputs; changing who can decrypt; losing or rotating an age key
keywords: sops, age, age-keygen, .sops.yaml, creation_rules, encrypted_regex, SOPS_AGE_KEY_FILE, updatekeys, rotate, recipient
priority: high
related: rotation-lifecycle.md, destructive-secret-ops.md, leak-prevention-response.md, secrets-lifecycle.md
---

# SOPS + age

**Load when:** secrets live as encrypted files in Git. SOPS v3.13.3 (MPL 2.0, CNCF sandbox project since 2023) edits YAML, JSON, ENV, INI and BINARY files and encrypts with AWS KMS, GCP KMS, Azure Key Vault, HuaweiCloud KMS, age and PGP. age is the simple local key type (age v1.3.2).

How Flux, Argo CD or Helm consume SOPS files is in `devops-gitops-packaging`; Ansible usage in `devops-ansible`.

## Model

- File values are encrypted with a per-file **data key**; the data key is encrypted to each **recipient** (age public key) listed in the file metadata. Structure and key names stay readable, so diffs and reviews work.
- Whoever holds **any** recipient's private identity can decrypt the whole file, including every historical version in Git that listed that recipient.
- `.sops.yaml` `creation_rules` pick recipients by `path_regex` (first match wins) so people do not choose keys by hand.

## Setup

```bash
age-keygen -o ~/.config/sops/age/keys.txt     # private identity into a file; mode 0600; share only the public age1... string
chmod 600 ~/.config/sops/age/keys.txt
```

The default keys file is `sops/age/keys.txt` under the user config directory; override with `SOPS_AGE_KEY_FILE` (path), `SOPS_AGE_KEY` (inline value, avoid: visible in the environment), or `SOPS_AGE_KEY_CMD` (command that prints the identity, receives `SOPS_AGE_RECIPIENT`). Copy only the **public** `age1...` string into `.sops.yaml` ([template](templates/sops.yaml)).

```bash
sops encrypt --in-place secrets/app.yaml     # encrypts using the matching creation_rule
sops edit secrets/app.yaml                   # decrypt in $EDITOR, re-encrypt on save (never pipe to chat)
git diff --stat secrets/app.yaml             # reviewing ciphertext changes is safe
```

Never run `sops decrypt` / `sops -d` with output to the terminal in an agent session. To validate a file without exposing values, decrypt to `/dev/null` and check the exit status, or use the consumer (`kustomize build` with decryption in the pipeline).

`encrypted_regex` (for example only `^(data|stringData)$` in Kubernetes Secrets) keeps metadata readable so Kubernetes manifests still parse; `unencrypted_suffix` defaults to `_unencrypted`; `mac_only_encrypted` makes the integrity MAC cover only encrypted values.

## Key custody (the real risk)

1. At least **two recipients** per environment: the CI/cluster identity and an offline **recovery** identity held by a different person or system. One lost identity must not lock the repo.
2. The cluster/CI identity lives in the cluster as a Secret or in the CI secret store; it is the bootstrap secret ([secrets-lifecycle.md](secrets-lifecycle.md)) and cannot itself be SOPS-encrypted to the same key.
3. One identity per environment (dev/stage/prod) via separate `path_regex` rules, so a dev leak does not expose prod.
4. Humans use their own identity; remove a person's recipient when they leave.

## Changing recipients and rotating

| Goal | Command (flags from the SOPS CLI reference) | Effect |
|------|---------------------------------------------|--------|
| Re-sync a file's recipients with `.sops.yaml` | `sops updatekeys <file>` | Shows the key diff, asks to confirm, re-encrypts the data key to the new set |
| Add/remove a recipient explicitly | `sops rotate -i --add-age <pub> <file>` / `--rm-age <pub>` | Rotates the data key and changes recipients in one step |
| New data key only | `sops rotate -i <file>` | Generates a new data key, re-encrypts all values |

**Removing a recipient does not revoke access to old ciphertext**: the removed person's identity still decrypts every earlier Git revision. After a recipient leaves or an identity leaks, the underlying secrets must be rotated at their source ([rotation-lifecycle.md](rotation-lifecycle.md), [leak-prevention-response.md](leak-prevention-response.md)). Bulk re-encryption is in [destructive-secret-ops.md](destructive-secret-ops.md).

## Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| "no matching creation rules" | File path does not match any `path_regex` | Fix the regex, or `--filename-override` |
| Everything encrypted, manifest unparsable | No `encrypted_regex` | Add it for Kubernetes Secrets |
| Decrypt fails in CI | Identity not provided, wrong recipient | `SOPS_AGE_KEY_FILE` to a mounted 0600 file; check the file metadata lists the CI recipient |
| Merge conflicts in ciphertext | Two branches re-encrypted the same file | Decrypt/merge/re-encrypt through `sops edit` on one branch |

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/getsops/sops/main/README.rst
- https://github.com/getsops/sops/releases/latest (tag v3.13.3) ; https://github.com/FiloSottile/age/releases/latest (tag v1.3.2)
- Context7 `/getsops/sops` (configuration reference, CLI reference: creation_rules keys, environment variables, `rotate`, `decrypt`, `updatekeys`)

## Not verified

- The `sops encrypt` / `sops edit` subcommand spellings are shown in the CLI reference only for `rotate` and `decrypt` (and `--encrypt`, `--decrypt` flags); `sops encrypt --in-place` and `sops edit` were not read. If a call fails, use `sops --encrypt --in-place <file>` and `sops <file>`.
- age-keygen flags, age plugin/passphrase features and the age file format: age docs were not read today.
- Whether `sops updatekeys` honours `--yes` for non-interactive use: not read.
- Official getsops.io docs pages were not fetched; only the README and Context7 mirrors of the repo docs.
