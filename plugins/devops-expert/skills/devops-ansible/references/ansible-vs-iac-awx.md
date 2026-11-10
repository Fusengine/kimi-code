---
name: ansible-vs-iac-awx
description: When to choose Ansible versus Terraform/OpenTofu, the hand-off between provisioning and configuration, ansible-pull and Proxmox/OpenStack collections as a pointer, and AWX/AAP as a pointer only
when-to-use: Deciding which tool owns a task, designing the provision-then-configure pipeline, or being asked about AWX/AAP
keywords: ansible vs terraform, opentofu, provisioning, configuration management, state, plan, AWX, AAP, controller, hand-off, inventory
priority: medium
related: inventory-variables.md, execution-environments.md, safe-run-protocol.md
---

# Ansible versus IaC, and AWX/AAP

**Load when:** a request could be done by Ansible or by Terraform/OpenTofu, or someone asks about a web UI/controller. The IaC side is `devops-iac`; this file does not duplicate it.

## Decision table (general practice, not a single-source claim)

| Task | Prefer | Why |
|------|--------|-----|
| Create/destroy VMs, networks, volumes, DNS, buckets as long-lived objects | **Terraform/OpenTofu** (`devops-iac`) | state file, `plan` before `apply`, drift detection, dependency graph |
| Install packages, render configs, manage users/services on existing hosts | **Ansible** | agentless over SSH, idempotent modules, handlers |
| Orchestrated change across hosts in order (rolling restart, DB failover steps) | **Ansible** | `serial`, `max_fail_percentage`, `delegate_to`, block/rescue |
| One-off fleet command (ad hoc) | Ansible ad hoc, read-only first | no state needed |
| Build a golden image | Packer / cloud-init (`devops-virtualization`), then Ansible as provisioner if needed | |
| Kubernetes objects | kubectl/Helm/GitOps (`devops-kubernetes`, `devops-gitops-packaging`), not Ansible | controllers reconcile continuously |
| Proxmox/OpenStack VM lifecycle | IaC provider first (`devops-iac`); Ansible collections (`community.proxmox`, `openstack.cloud`) for imperative or one-off tasks | Ansible has no plan/state: a rerun re-evaluates each task |

Ansible cloud/virtualization modules can create resources, but without a state file there is no plan of what will be destroyed and no drift view; for resources that must be tracked, keep them in IaC.

## Hand-off pattern

1. IaC creates hosts and tags them (role, environment).
2. Ansible reads them through a dynamic inventory plugin of the platform (or a generated static YAML inventory committed with the change) - [inventory-variables.md](inventory-variables.md).
3. Ansible configures; secrets come from vault or the secret store ([vault-secrets.md](vault-secrets.md)).
4. Never let both tools manage the same attribute (e.g. a package list in cloud-init and in a role): one owner per resource and per setting.

## ansible-pull

Pull-mode (`ansible-pull`) fits fleets that cannot be reached from a control node. It moves the blast radius to every host's schedule: keep the repository branch protected, pin collection versions, and log runs. The CLI exists in the install guide's shell-completion list; its behaviour was not read today.

## AWX / AAP (pointer only)

AWX (upstream) and Red Hat Ansible Automation Platform provide a web UI, REST API, RBAC, job scheduling, credential storage and inventory sync (the dynamic inventory page mentions both syncing inventory sources). Consider them when many people run playbooks, audit is required or credentials must not live on laptops. They run jobs in execution environments ([execution-environments.md](execution-environments.md)). This skill does not cover installing or operating them; the ansible-lint `production` profile targets content bound for AAP.

## Sources (read 2026-11-10)

- https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html (AWX/AAP inventory sync mention)
- https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html (EE control node, ansible-pull listed)
- https://docs.ansible.com/projects/lint/profiles/ (`production` profile and AAP)
- `docs/research-devops-plugin.md` (skill boundaries ansible / iac / virtualization)

## Not verified

- The decision table is practice-based, not taken from one official page.
- AWX current version, install path (operator), and AAP licensing/support terms.
- The `ansible-pull` flags and repository layout requirements.
- Whether Ansible can read OpenTofu/Terraform state directly (an inventory plugin may exist; not checked).
