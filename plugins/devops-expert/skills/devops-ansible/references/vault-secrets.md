---
name: vault-secrets
description: Ansible Vault - encrypting variables and files, vault ids, supplying passwords, rekeying, the vault_ indirection pattern, no_log and diff false, become passwords, and the boundary with external secret stores
when-to-use: Any secret in an Ansible project - encrypting, rotating, passing the vault password to a run, or deciding vault versus a secret manager
keywords: ansible-vault, encrypt_string, vault-id, vault-password-file, ask-vault-pass, !vault, rekey, no_log, diff false, become password
priority: high
related: safe-run-protocol.md, inventory-variables.md
---

# Vault and Secret Handling

**Load when:** a task, variable or file contains a credential, key or token. Pointer: external stores (HashiCorp Vault, SOPS, cloud secret managers) are the scope of `devops-secrets`; this file covers what Ansible itself does. Template: [group_vars-all.yml](templates/group_vars-all.yml).

**Never print, log or paste a secret value in a report, a diff or a commit.** Report names and keys only.

## Two ways to encrypt

| | Encrypted variables (`encrypt_string`) | Encrypted files (`encrypt`, `create`, `edit`) |
|---|----------------------------------------|-----------------------------------------------|
| Result | a `!vault` block scalar inside a normal YAML file | the whole file is ciphertext |
| Visible | variable names stay readable in the repo and diffs | names and structure hidden |
| Rotation | per value | `ansible-vault rekey` on many files at once |

Ciphertext starts with `$ANSIBLE_VAULT;1.2;AES256;<vault-id-label>` when a vault id was used (`1.1` without one); the label is optional metadata saying which password decrypts it.

```bash
# value: read it from stdin so it never enters shell history or argv
ansible-vault encrypt_string --vault-id prod@prompt --stdin-name 'db_password'
# file level
ansible-vault create  --vault-id prod@prompt inventories/production/group_vars/all/vault.yml
ansible-vault edit    --vault-id prod@prompt inventories/production/group_vars/all/vault.yml
ansible-vault encrypt --vault-id prod@prompt secrets.yml
```

(`encrypt_string 'plain' --name x` also works, but puts the plaintext on the command line; the docs show it for tests only.)

## Supplying the password at run time

```bash
ansible-playbook site.yml --ask-vault-pass                                  # single password, prompt
ansible-playbook site.yml --vault-password-file /path/file                  # file or executable client script
ansible-playbook site.yml --vault-id prod@prompt                            # labelled
ansible-playbook site.yml --vault-id dev@dev-password --vault-id prod@prompt   # several ids
```

- `--vault-password-file` may point to an **executable script** that prints the password from a keyring or secret manager (`--vault-id prod@my-vault-password-client.py`); this is how a store plugs in without a plaintext file.
- `DEFAULT_VAULT_IDENTITY_LIST` in config sets the ids you use most often.
- Keep the password file outside the repository, mode `0600`, listed in `.gitignore`; never commit it. In CI inject it from the CI secret store into a tmpfs file or a client script.
- Rekey: `ansible-vault rekey --vault-id old@src --new-vault-id new@prompt files...` (see the ACTION block below).

## Indirection pattern ("keep vaulted variables visible")

```yaml
# group_vars/all/main.yml  (plaintext, reviewable)
app_db_password: "{{ vault_app_db_password }}"
# group_vars/all/vault.yml (encrypted file or !vault values)
# vault_app_db_password: !vault | ...
```

Reviewers and `grep` see which variables exist and where they are used; only the value is secret.

## Secrets inside tasks

- `no_log: true` on any task whose arguments or result hold a credential. ansible-lint's opt-in rule `no-log-password` (enable it in `enable_list`) catches `user` password tasks without it.
- `diff: false` on tasks that template or edit secret-bearing files, so `--diff` does not print them.
- `ansible_become_password`, `ansible_ssh_pass` and similar connection variables belong in vault or are prompted (`--ask-become-pass`), never in plain `group_vars`.
- Secrets in `-e` land in shell history and process lists; use `-e @vars.yml` with a vaulted file.
- Do not `debug:` a secret variable; the docs' own example uses `debug` only on throwaway data.

## When to leave Vault

Ansible Vault is a single symmetric key per id: no per-secret ACL, no audit, no dynamic credentials. Move to an external store (lookup plugins for the store, or SOPS) when more than a small team needs access, rotation must be automated or audit is required: hand off to `devops-secrets`.

## Destructive / sensitive operations

```
ACTION   ansible-vault rekey --vault-id prod@prompt --new-vault-id prod2@prompt inventories/production/group_vars/all/vault.yml
EFFECT   rewrites the file with a new key; the old password no longer decrypts it; every pipeline and teammate using the old key breaks until updated
PROOF    list of files that carry the old vault id (grep of the header only); new password stored in the agreed store; rollback = git revert + old password
WAIT-FOR-GO
```

```
ACTION   ansible-vault decrypt <file>   (or encrypt_string output pasted into a ticket)
EFFECT   writes plaintext secrets to disk / output; they can end up in git history, logs or the transcript
PROOF    none acceptable for routine work: use `ansible-vault view` in a terminal the user controls instead
WAIT-FOR-GO
```

## Sources (read 2026-11-10)

- https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_encrypting_content.html
- https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html (`ansible_become_password`)
- https://docs.ansible.com/projects/lint/configuring/ (`no-log-password` opt-in rule)
- https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html (`diff: false`)

## Not verified

- The `no_log` keyword page itself and its interaction with `-vvv` output (not read today).
- `ansible-vault view` flags and `--ask-become-pass` (standard CLI, not on a page read today).
- Per-version behaviour of vault id `1.1` versus `1.2` headers beyond what the format section states.
- Cryptographic parameters (docs name the cipher AES256 in the header; key derivation details not read).
