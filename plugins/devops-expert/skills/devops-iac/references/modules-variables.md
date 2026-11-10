---
name: modules-variables
description: Module design and versioning, variables with validation, outputs, locals and meta-arguments (for_each, count, enabled, lifecycle)
when-to-use: Writing or reviewing a reusable module, adding inputs, or deciding how to version and consume modules
keywords: module, variable validation, sensitive, ephemeral, outputs, locals, for_each, count, enabled, prevent_destroy, precondition
priority: high
related: layout-providers-lock.md, testing-quality.md, state-surgery.md
---

# Modules, variables, outputs

**Load when:** code is repeated in two stacks, a module interface changes, or an input needs guarding.

## Design rules

- A module wraps one coherent unit (a VM with its disks and firewall, a network with its subnets), exposes few inputs, and hides provider details. Extract at the third repetition, not before.
- No `provider` blocks inside reusable modules; declare `required_providers` (source + minimum version) and let the root configure providers.
- Inputs: typed (`object({...})` over loose maps), described, validated; outputs: only what callers need, each described. Sensitive outputs are marked `sensitive = true` - this hides them from the UI but they remain in state.
- `for_each` over a map/set with stable keys, not `count` over a list (index shifts replace resources). Use `moved` when migrating (`state-surgery.md`).
- Zero-or-one instances: `count = var.x ? 1 : 0` everywhere; OpenTofu 1.11 adds `lifecycle { enabled = var.x }` for resources and module calls.
- Destruction guards: `lifecycle { prevent_destroy = true }` on data-bearing resources and VM templates; from OpenTofu 1.12 it can reference module variables, so one module serves dev (false) and prod (true).

## Variables and validation

```hcl
variable "cpu_cores" {
  type        = number
  description = "vCPU count per VM."
  default     = 2
  validation {
    condition     = var.cpu_cores >= 1 && var.cpu_cores <= 32
    error_message = "cpu_cores must be between 1 and 32."
  }
}
variable "admin_token" {
  type      = string
  sensitive = true       # hidden in output, still in state unless the provider offers a write-only argument
  ephemeral = true       # not persisted in state or plan (OpenTofu 1.11+; Terraform version: see Not verified)
}
```

Complete example with object types, `optional()`, cross-field checks and outputs: [templates/module-skeleton.tf](templates/module-skeleton.tf). Validation errors are testable without any provider (`tofu test` with `expect_failures`, see `testing-quality.md`).

- Where values come from, from weakest to strongest: defaults, `terraform.tfvars`/`*.auto.tfvars`, `-var-file`, `-var`, environment `TF_VAR_name`. Secrets only through `TF_VAR_*` from a secret store (`devops-secrets`), never committed `.tfvars`.
- Ephemeral variables are accepted only in ephemeral contexts (write-only arguments, provider config, other ephemeral values); using them elsewhere is an error at plan time.
- Preconditions/postconditions (`lifecycle { precondition {...} }`) check assumptions about data sources (an image exists, a template VM is a template) before changes are made.

## Locals

Use `locals` to name a computed value used twice or more (tags merged with defaults, naming scheme). No logic that would be clearer as a variable default; no locals that read secrets (they end up in state via resources anyway, but keep them out of outputs).

## Versioning and consuming

| Source | Pin | Notes |
|--------|-----|-------|
| Registry (`source = "ns/name/provider"`) | `version = "1.4.2"` exact for production | Remote module versions are not recorded in the lock file (OpenTofu docs), so a range changes silently |
| Git (`git::https://...//subdir?ref=v1.4.2`) | tag or commit SHA, never a branch | Terragrunt downloads the whole repo before the `//` |
| OCI registry | `oci://host/repo?tag=...` for Terragrunt; OpenTofu 1.10 supports OCI for providers and modules | Useful in air-gapped networks |
| Local path | none | Fine inside one repo; promote to Git tags when two repos need it |

- Semver the module: removing/renaming an input or output is a major bump; changing a resource address needs a `moved` block inside the module so callers' states follow.
- OpenTofu 1.10 supports marking variables and outputs as deprecated; use it for a release cycle before removing.
- Document each module with a README of inputs/outputs and keep `tests/*.tftest.hcl` next to it.

## Pitfalls

- `count` and `for_each` values must be known at plan time; deriving them from resource attributes created in the same run errors.
- `depends_on` on modules forces deferral of data sources and produces noisy plans; prefer real references.
- Output of a whole resource object leaks every attribute (including secrets) into state of consumers and `terraform_remote_state`: output only the fields needed.
- Overriding `prevent_destroy` by deleting the line is a normal code change - require review on those lines.

## Verification

```bash
tofu fmt -check -recursive && tofu init -backend=false && tofu validate
tofu test                       # validation and plan assertions (testing-quality.md)
```

## Sources

- https://opentofu.org/docs/language/files/dependency-lock/ (modules not locked)
- https://opentofu.org/blog/opentofu-1-10-0/ , .../1-11-0/ , .../1-12-0/
- https://opentofu.org/docs/language/ephemerality/
- https://opentofu.org/docs/cli/commands/test/ (`expect_failures`)
- https://docs.terragrunt.com/reference/hcl/blocks/ (`tfr://`, `oci://` sources)

## Not verified

- Exact syntax of the OpenTofu deprecation attribute for variables/outputs (read the 1.10 what's-new page).
- Terraform `ephemeral = true` variable version (the ephemeral block page was read; the first supported version number was not).
