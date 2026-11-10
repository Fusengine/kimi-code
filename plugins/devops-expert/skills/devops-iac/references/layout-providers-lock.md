---
name: layout-providers-lock
description: Project layout, required_version, provider version pinning and the dependency lock file for OpenTofu and Terraform
when-to-use: Creating a root module, bumping a provider, reviewing a lock-file diff or fixing a checksum error
keywords: required_providers, version constraint, .terraform.lock.hcl, tofu init -upgrade, providers lock, registry, checksum
priority: high
related: tofu-vs-terraform.md, modules-variables.md, testing-quality.md
---

# Layout, providers and the lock file

**Load when:** a root module is created, a provider version changes, or `init` reports a checksum mismatch.

## Layout rules

- One root module = one state = one blast radius. Split by lifecycle and ownership (network, compute, k8s add-ons), not by file size.
- Per root module: `versions.tf` (terraform + required_providers), `backend.tf`, `providers.tf` (provider blocks), `main.tf`, `variables.tf`, `outputs.tf`. Sibling files are merged; the split is for readers.
- Reusable code goes in `modules/` or a versioned registry/Git source (`modules-variables.md`); root modules hold only module calls, provider config and backend.
- Both binaries read `.tf`; OpenTofu also reads `.tofu` files (same-name `.tofu` wins over `.tf`). Use `.tofu` only for OpenTofu-only syntax that Terraform must not see (Terraform's handling of `.tofu` is not verified, so keep a separate unique file name such as `encryption.tf` and do not run Terraform on that root).

## Pinning

```hcl
terraform {
  required_version = ">= 1.11.0, < 2.0.0"
  required_providers {
    proxmox = { source = "bpg/proxmox", version = "~> 0.121.0" }  # 0.x: minors may break
    openstack = { source = "terraform-provider-openstack/openstack", version = "~> 3.4" }
  }
}
```

| Constraint | Meaning | Use for |
|------------|---------|---------|
| `= 0.121.0` | exactly | providers below 1.0 in production |
| `~> 0.121.0` | `>= 0.121.0, < 0.122.0` | 0.x providers (bpg README: 0.x is not guaranteed backward-compatible across minors) |
| `~> 3.4` | `>= 3.4, < 4.0` | 1.0+ providers following semver |

Terraform 1.17 adds variables and locals in provider requirements; OpenTofu allows variables in module sources, backend and encryption config only when values are assigned to root variables - keep the pin literal anyway.

## The lock file (`.terraform.lock.hcl`)

- Created and updated by `init`; lives next to the root module; **commit it** and review its diff like code (OpenTofu docs: dependency-lock).
- It tracks providers only. Remote module versions are not locked: pin them exactly (`version = "1.4.2"` or a Git ref).
- Existing selection is reused even when newer versions exist; `tofu init -upgrade` re-selects the newest matching the constraint.
- Trust on first use: every installed package must match a recorded checksum. A mismatch is an alert, not a nuisance: confirm the provider version and source before touching the file.
- OpenTofu 1.12 records the full `zh:` and `h1:` checksum set on `init`; `tofu providers lock` is needed only when `init` uses a mirror or alternative installation source. Set `OPENTOFU_ENFORCE_GPG_VALIDATION=true` to require signed checksums.

## Bumping a provider (procedure)

```bash
git switch -c chore/provider-bump
# edit the constraint in versions.tf
tofu init -upgrade                     # rewrites the lock file
tofu validate && tofu plan -out=tfplan -detailed-exitcode
tofu show tfplan                       # a bump must plan zero or explainable changes
```

Exit code 0 means no changes; 2 means a diff to read (a provider upgrade that wants to replace resources is a stop: read the provider changelog). Commit the lock diff in the same PR.

## Pitfalls

- `required_providers` without `source` for non-HashiCorp providers resolves to the wrong namespace.
- Two roots sharing one `.terraform` directory or one plugin cache across versions: use per-root directories; OpenTofu 1.10 added a global provider cache lock for concurrent CI jobs.
- Provider block credentials in HCL: use environment variables or ephemeral values (`state-backends-encryption.md`).
- Switching Proxmox providers (`Telmate` to `bpg`) changes resource types: it is a migration with `state rm` + `import`, never a rename (`provider-proxmox.md`).

## Verification

```bash
tofu providers                       # tree of required providers per module
tofu version                         # shows the installed provider versions too
git diff --stat -- .terraform.lock.hcl
```

## Sources

- https://opentofu.org/docs/language/files/dependency-lock/
- https://opentofu.org/blog/opentofu-1-12-0/ , https://opentofu.org/blog/opentofu-1-10-0/
- https://registry.terraform.io/v1/providers/bpg/proxmox (0.121.0, 2026-11-09)
- https://raw.githubusercontent.com/bpg/terraform-provider-proxmox/main/README.md

## Not verified

- Exact flags of `tofu providers lock` (read the command page before use).
- Terraform's handling of `.tofu` files.
