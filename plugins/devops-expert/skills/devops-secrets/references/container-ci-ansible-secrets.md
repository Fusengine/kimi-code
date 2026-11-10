---
name: container-ci-ansible-secrets
description: Secrets in Docker/Compose, BuildKit build secrets, CI pipelines (OIDC federation instead of static keys) and Ansible Vault - pointers and the rules the agent applies
when-to-use: A secret must reach a container, an image build, a CI job or an Ansible run; replacing a stored CI key; deciding Ansible Vault vs SOPS
keywords: docker compose secrets, /run/secrets, build secrets, --mount=type=secret, oidc, id-token, workload identity, ansible vault, ARG, ENV
priority: high
related: machine-identity-certificates.md, secrets-lifecycle.md, leak-prevention-response.md
---

# Secrets in Containers, Builds, CI and Ansible

**Load when:** a secret crosses a tool boundary. Dockerfile and image practice: `devops-docker`. Pipeline design: `devops-cicd`. Ansible roles and inventories: `devops-ansible`. This file holds the secret-handling rules only.

## Docker and Compose

- Compose secrets mount a file at `/run/secrets/<name>` (Linux containers only), granted **per service** through the service's `secrets:` attribute; the top-level `secrets:` element defines the source (`file:` or `environment:`). Env vars leak into logs, crash dumps and child processes; files obey filesystem permissions.
- Many official images accept `*_FILE` variables that read the value from the mounted file (a convention of images such as mysql and postgres, not a Docker feature).
- The source file is still a secret on the host: mode 0600, not in Git, produced by the secret store or SOPS at deploy time.
- Compose secrets are for a single host; for several hosts, deliver secrets through the orchestrator or a store, not by copying files.

```yaml
services:
  app:
    image: myapp:CHANGE_ME
    secrets: [db_password]
secrets:
  db_password:
    file: ./secrets/db_password.txt      # untracked, 0600; contents never in the chat
```

## BuildKit build secrets

- `ARG` and `ENV` persist in the image: never use them for secrets. Use a **secret mount**: available only during the `RUN` instruction, not stored in a layer.
- Pass: `docker build --secret id=<id>,src=<file>` or `--secret id=<id>,env=<VAR>`; consume: `RUN --mount=type=secret,id=<id>` (file at `/run/secrets/<id>` by default, or `target=`, or `env=`). Bake has an equivalent `secret` target attribute. SSH mounts (`--ssh default`) cover private Git over SSH.
- Private Git remote contexts: pre-defined secrets `GIT_AUTH_TOKEN` and `GIT_AUTH_HEADER` (host-suffixed IDs for multiple hosts).
- After a mistake: an image that ever received a secret via `ARG`/`ENV`/`COPY` is compromised; the secret is revoked and rotated, the image is deleted from registries by the owner (not by this agent without a go).

## CI pipelines

- Prefer **OIDC federation**: the CI provider issues a short-lived signed token per job; the target (cloud, Vault/OpenBao JWT auth, a registry) validates claims (`sub` such as repository and environment) against a preconfigured trust and returns a credential valid for the job only. No long-lived key is stored as a CI variable. GitHub documents this explicitly (workflows request tokens; claims are checked against the trust definition).
- Vault/OpenBao side: JWT/OIDC auth role bound to claims (see [vault-openbao-access.md](vault-openbao-access.md)); keep roles narrow (one repo, one environment, one policy).
- If a static CI secret is unavoidable: environment-scoped, protected branches only, masked, rotated on a calendar ([rotation-lifecycle.md](rotation-lifecycle.md)), never echoed, never passed to untrusted PR code.
- Pipeline structure, runners, approvals and `id-token` permission wiring: `devops-cicd`.
- Pre-commit and CI scanning: [leak-prevention-response.md](leak-prevention-response.md).

## Ansible Vault

- Ansible Vault encrypts variables and files and has its own password management (single password, vault IDs, storing/accessing passwords). Details and command forms: `devops-ansible`.
- Choice rule: Ansible-only repos with few secrets can use Ansible Vault; mixed Kubernetes/GitOps repos should use one tool (SOPS) to avoid two key-custody problems. State the choice in the repo.
- The vault password is the bootstrap secret: supply it through a password file or script outside Git or an interactive prompt, never as literal text in a command line (flag names: see `devops-ansible`).

## Sources (read 2026-11-10)

- https://docs.docker.com/compose/how-tos/use-secrets/
- https://docs.docker.com/build/building/secrets/
- https://docs.github.com/en/actions/concepts/security/openid-connect
- https://docs.ansible.com/projects/ansible/latest/vault_guide/index.html (table of contents only)

## Not verified

- GitHub `permissions: id-token` syntax, GitLab/Gitea equivalents and runner behaviour: not read (devops-cicd owns them).
- Swarm secrets and Podman secrets: not researched.
- Ansible Vault cipher, `ansible-vault` flags and vault ID semantics beyond the guide's topics list: not read.
- Whether Compose `secrets` with `environment:` source behaves identically across Compose versions: only the documented example was read.
