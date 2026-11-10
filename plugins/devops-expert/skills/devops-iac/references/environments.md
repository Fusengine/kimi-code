---
name: environments
description: Separating dev/staging/prod - workspaces vs directories vs Terragrunt, with blast-radius rules
when-to-use: Designing environment separation, adding a new environment, or deciding whether to adopt Terragrunt
keywords: workspace, terraform.workspace, directory per environment, terragrunt, run --all, filter, dependency, DRY, blast radius
priority: high
related: state-backends-encryption.md, modules-variables.md, plan-apply-protocol.md
---

# Environments

**Load when:** a second environment appears, or one `apply` could touch production by accident.

## Decision

| Approach | Use when | Avoid when |
|----------|----------|-----------|
| **Directories** (`live/<env>/<stack>/`, each with its own backend key and tfvars) | Default. Environments differ in size, endpoints, guards; prod needs its own credentials and review | Dozens of near-identical stacks (copy drift) |
| **Workspaces** (`tofu workspace`) | Short-lived copies of one stack in the same account (feature branches, tests) | Prod vs non-prod: same code, same backend credentials, and the current workspace is invisible state - a wrong `workspace select` targets production |
| **Terragrunt** (v1.2.1) | Many stacks per environment, dependencies between them, shared backend/provider boilerplate | A handful of stacks; the extra tool is a second thing to learn and pin |

Rule: **prod credentials are separate from non-prod credentials** whatever the layout, so a mistaken command cannot reach prod.

## Directories

```
live/
├── dev/   network/ compute/ k8s-addons/
├── prod/  network/ compute/ k8s-addons/
modules/  (versioned, shared)
```

- Each leaf is a root module with its own `backend` key (`live/prod/network/terraform.tfstate`), its own lock file and `terraform.tfvars`.
- Cross-stack data: read outputs with `terraform_remote_state` (needs the consumer to read the other state; with OpenTofu encryption configure `remote_state_data_sources`) or, better, look objects up by name/tag with data sources so stacks stay decoupled.
- Promote by changing the module `ref`/version in `dev`, then `prod`, in separate reviewed PRs.

## Workspaces

```bash
tofu workspace list; tofu workspace show          # always print before any plan/apply
tofu workspace new feature-x                      # state lives under the same backend (S3 default prefix "env:")
tofu workspace select feature-x
tofu workspace delete -force feature-x            # dangling resources if it still tracks any
```

`terraform.workspace` can drive names and sizes; never drive security guards (`prevent_destroy`) from it without a variable that is set per environment in code. `workspace delete` without `-force` refuses when resources are tracked.

## Terragrunt (when chosen)

Verified at https://docs.terragrunt.com : an empty `terragrunt.hcl` next to a `.tf` root is enough to call `terragrunt` instead of `tofu`/`terraform`, with automatic `init`.

```bash
terragrunt run --all plan                          # every unit in the current stack
terragrunt run --all --filter 'prod/**' -- plan    # filter by path
terragrunt run --all --filter-affected -- plan     # units changed between the default branch and HEAD (plan/apply only, not -destroy)
terragrunt run -- plan -no-color                   # `--` separates Terragrunt flags from tofu/terraform flags
```

- `terragrunt run --all apply` applies many states in one command: it needs the same saved-plan discipline - plan all, review all summaries, apply after the go; never auto-approve against prod from a laptop.
- Pick the binary explicitly with `--tf-path` (`TG_TF_PATH`) when both are installed.
- The `terraform { source = ... }` block accepts local, Git, `tfr://` registry and `oci://` sources; pin versions exactly (an omitted `?version=` fetches the latest stable).
- Block syntax for `include`, `dependency`, `remote_state`, `generate`, `unit`/`stack`: read https://docs.terragrunt.com/reference/hcl/blocks before writing; this skill does not reproduce it.

## Pitfalls

- Same backend key for two environments: the second `init` shares state.
- Workspaces plus a single shared `terraform.tfvars`: prod gets dev values.
- `terragrunt run --all destroy` / `tofu destroy` in a directory named `prod`: propose-only (`plan-apply-protocol.md`).

## Verification

```bash
tofu workspace show && grep -n "key" backend.tf    # the environment you think you are in
terragrunt run --all --filter-affected -- plan     # only intended units appear
```

## Sources

- https://docs.terragrunt.com/getting-started/quick-start/ , https://docs.terragrunt.com/reference/cli/commands/run/ , https://docs.terragrunt.com/reference/hcl/blocks/
- https://github.com/gruntwork-io/terragrunt/releases (v1.2.1)
- https://opentofu.org/docs/cli/commands/workspace/delete/ , https://opentofu.org/docs/language/settings/backends/s3/

## Not verified

- Terragrunt `include`/`dependency`/`remote_state`/`stack` syntax and its auto-approve/non-interactive flags (not read in detail).
- Terragrunt-specific exit codes and behaviour with OpenTofu state encryption.
