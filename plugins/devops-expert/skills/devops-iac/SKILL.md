---
name: devops-iac
description: Use when writing, reviewing or operating infrastructure as code with OpenTofu or Terraform - choosing between them, project layout, provider pinning and the lock file, remote state (S3-compatible/MinIO, HTTP, PostgreSQL, Kubernetes), locking and state encryption, state surgery (import/moved/removed blocks, state mv/rm, force-unlock), modules, variables and validation, environments (workspaces vs directories vs Terragrunt), the saved-plan review/apply workflow, drift detection, tofu/terraform test, tflint/checkov/trivy, and the providers for Proxmox VE, OpenStack, Kubernetes/Helm, Docker and libvirt. Not for Ansible (devops-ansible), Packer and cloud-init images (devops-virtualization), Proxmox or OpenStack platform internals (devops-proxmox, devops-openstack), secret stores (devops-secrets), CI pipeline authoring (devops-cicd) or public-cloud providers.
versions:
  opentofu: "1.13.9 (stable line); 1.12.12 also supported"
  terraform: "1.17.1; 1.16.7"
  terragrunt: "1.2.1"
  bpg-proxmox-provider: "0.121.0"
  openstack-provider: "3.4.0"
  kubernetes-provider: "3.5.0"
  helm-provider: "3.3.0"
  docker-provider: "4.6.0"
  libvirt-provider: "0.9.9"
  tflint: "0.66.0"
  trivy: "0.76.2"
references:
  - references/tofu-vs-terraform.md
  - references/layout-providers-lock.md
  - references/state-backends-encryption.md
  - references/state-surgery.md
  - references/modules-variables.md
  - references/environments.md
  - references/plan-apply-protocol.md
  - references/testing-quality.md
  - references/provider-proxmox.md
  - references/provider-openstack.md
  - references/provider-k8s-docker-libvirt.md
  - references/templates/root-module.tf
  - references/templates/encryption.tf
  - references/templates/module-skeleton.tf
  - references/templates/proxmox-vm-cloudinit.tf
  - references/templates/openstack-instance-network.tf
  - references/templates/import-moved-removed.tf
  - references/templates/main.tftest.hcl
related-skills:
  - devops-proxmox
  - devops-openstack
  - devops-kubernetes
  - devops-gitops-packaging
  - devops-docker
  - devops-virtualization
  - devops-ansible
  - devops-cicd
  - devops-secrets
  - devops-databases
  - devops-sre-ops
---

<objective>
Covers infrastructure as code with OpenTofu and Terraform for a self-hosted
audience (Proxmox, OpenStack, Kubernetes, Docker, libvirt): the tool choice,
layout and version pinning, remote state with locking and encryption, safe state
surgery, modules, environments, a plan-then-apply protocol that never applies an
unreviewed plan, drift detection, tests and static scanning. The main danger is
destruction through state; every destructive command is shown with its exact
effect. Does not cover Ansible, Packer/cloud-init, platform internals, secret
stores, pipeline authoring or public clouds.
</objective>

# Infrastructure as Code (OpenTofu / Terraform)

## Agent Workflow (MANDATORY)

Before ANY change to `.tf`, `.tofu`, `.tfvars`, `.tftest.hcl`, `terragrunt.hcl` or state, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find the root modules, backends, providers, lock file, workspaces, wrappers (Makefile, Terragrunt, CI) and which binary (`tofu` or `terraform`) the repo uses
2. **research-expert** - re-read the registry page and docs of every provider/resource you will write (versions move; the Proxmox and OpenStack providers are community-maintained)
3. **mcp__context7__query-docs** (`/websites/opentofu`, `/websites/developer_hashicorp_terraform`, `/bpg/terraform-provider-proxmox`) - confirm each argument before writing it

Read-only commands first ([plan-apply-protocol.md](references/plan-apply-protocol.md)). After file changes, run **sniper**.

---

## Overview

| Area | What matters on 2026-11-10 |
|------|----------------------------|
| **Tool** | OpenTofu (Linux Foundation fork) vs Terraform (Business Source License 1.1, licensor IBM, 1.6.0 and later); same HCL core, diverging features |
| **Only OpenTofu** | State and plan encryption (1.7), `-exclude` (1.9), provider `for_each` (1.9), `enabled` meta-argument (1.11), dynamic `prevent_destroy` and `destroy = false` (1.12) |
| **Both** | Ephemeral resources and write-only arguments (Terraform 1.11+, OpenTofu 1.11+), `import`/`moved`/`removed` blocks, native S3 locking `use_lockfile` |
| **Only Terraform** | Actions and `terraform query` list resources (1.14), Terraform Policy GA (1.17), `-minimal-refresh` (1.17) |
| **Providers** | `bpg/proxmox` is the maintained Proxmox provider; `Telmate/proxmox` publishes only release candidates on its 3.x line (last stable 2.9.14); OpenStack provider last released 2025-11-11 |

---

## Critical Rules

1. **Plan, read, show, then apply that exact plan** - `plan -out=FILE`, read the summary line and every `replace` (`-/+`) and `destroy`, show it to the user, `apply FILE` only after the user's go. Never apply from a dirty tree, a stale plan or an unreviewed plan.
2. **Destruction through state is proposed, never run on your own** - `destroy`, applying a plan that replaces or destroys, `state rm`, `state push`, `force-unlock`, `-target`, `-replace`, deleting a backend bucket/table or a lock: ACTION / EFFECT / PROOF / WAIT-FOR-GO ([plan-apply-protocol.md](references/plan-apply-protocol.md)).
3. **Back up state before any surgery** - `state pull > backup` plus bucket versioning; with encryption on, the key is part of the backup.
4. **Never invent an argument, block or provider** - every attribute here comes from the provider docs of the pinned version; the rest is under "Not verified".
5. **Pin everything and commit the lock file** - `required_version`, provider `version`, exact module versions, `.terraform.lock.hcl`.
6. **Secrets never in `.tf`, `.tfvars` committed or state when avoidable** - ephemeral values and write-only arguments first, then encrypted state; the secret store is `devops-secrets`.
7. **Say which binary** - OpenTofu documents compatibility with state files created by Terraform up to 1.5.x; never switch binaries on a live state without the migration guide and a state backup.

---

## Architecture

```
infra/
├── live/<env>/<stack>/            # root modules: backend, providers, module calls (one state each)
│   ├── versions.tf  backend.tf  main.tf  variables.tf  outputs.tf
│   ├── encryption.tf              # OpenTofu only
│   ├── .terraform.lock.hcl        # committed
│   └── terraform.tfvars           # non-secret values only
├── modules/<name>/                # reusable, versioned, tested (tests/*.tftest.hcl)
└── .tflint.hcl  .trivyignore      # static checks
```

---

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Tool choice** | [tofu-vs-terraform.md](references/tofu-vs-terraform.md) | License, governance, feature divergence, migration |
| **Layout & providers** | [layout-providers-lock.md](references/layout-providers-lock.md) | Project tree, version pinning, lock file, registries |
| **State** | [state-backends-encryption.md](references/state-backends-encryption.md) | Backend choice, S3/MinIO, http, pg, kubernetes, locking, encryption |
| **State surgery** | [state-surgery.md](references/state-surgery.md) | import, moved, removed, state mv/rm/push, force-unlock |
| **Modules** | [modules-variables.md](references/modules-variables.md) | Module design, versioning, variables, validation, outputs, locals |
| **Environments** | [environments.md](references/environments.md) | Workspaces vs directories vs Terragrunt |
| **Plan/apply** | [plan-apply-protocol.md](references/plan-apply-protocol.md) | Saved plans, destructive catalogue, drift, CI pointer |
| **Testing** | [testing-quality.md](references/testing-quality.md) | fmt, validate, test, tflint, checkov, trivy |
| **Proxmox** | [provider-proxmox.md](references/provider-proxmox.md) | Which provider, auth, VM from template |
| **OpenStack** | [provider-openstack.md](references/provider-openstack.md) | clouds.yaml auth, network + instance |
| **K8s/Helm/Docker/libvirt** | [provider-k8s-docker-libvirt.md](references/provider-k8s-docker-libvirt.md) | Provider choice, v3 schema changes, pitfalls |

### Templates

| Template | When to Use |
|----------|-------------|
| [root-module.tf](references/templates/root-module.tf) | Root module with pinned providers and an S3-compatible backend |
| [encryption.tf](references/templates/encryption.tf) | OpenTofu state and plan encryption with migration fallback |
| [module-skeleton.tf](references/templates/module-skeleton.tf) | Reusable module with validated inputs and outputs |
| [proxmox-vm-cloudinit.tf](references/templates/proxmox-vm-cloudinit.tf) | VM cloned from a cloud-init template (bpg provider) |
| [openstack-instance-network.tf](references/templates/openstack-instance-network.tf) | Network, router, security group and instance |
| [import-moved-removed.tf](references/templates/import-moved-removed.tf) | Adopt, rename and forget resources without destroying them |
| [main.tftest.hcl](references/templates/main.tftest.hcl) | Offline plan-only tests for the module skeleton, including negative validation tests |

---

## Quick Reference

```bash
tofu version && tofu providers                          # binary, versions, provider tree
tofu fmt -check -recursive && tofu init -backend=false && tofu validate   # offline checks
tofu init && tofu plan -out=tfplan -detailed-exitcode   # exit 0 no diff, 1 error, 2 changes
tofu show tfplan                                        # read it; show the user; wait for the go
tofu apply tfplan                                       # only the reviewed file
```

---

## Best Practices

### DO
- One state per stack and environment; remote backend with locking; bucket versioning on
- Provider and module versions pinned; lock file reviewed in code review
- `moved` blocks for renames, `removed` with `lifecycle { destroy = false }` to forget
- `prevent_destroy` on state-like resources (databases, volumes) and VM templates

### DON'T
- Run `apply` without a saved plan outside a throwaway lab; use `-target` as a routine tool
- Run `state push -force` or `force-unlock` without proof of the cause
- Mix `tofu` and `terraform` on one state; commit `.tfstate`, plan files or `.tfvars` with secrets
