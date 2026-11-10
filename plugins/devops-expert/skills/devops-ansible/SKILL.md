---
name: devops-ansible
description: Use when writing, reviewing, testing or running Ansible - choosing ansible-core and community package versions (control node and managed node Python), static and dynamic inventory with group_vars/host_vars, variable precedence, playbooks, roles and collections (ansible-galaxy, requirements.yml, FQCN), idempotency (changed_when/failed_when), handlers, tags, Jinja2 templates, Ansible Vault and no_log, privilege escalation, check mode and diff mode, --limit, serial/rolling updates and max_fail_percentage, block/rescue/always, performance (forks, pipelining, fact caching, strategy), ansible-lint, Molecule, execution environments (ansible-navigator, ansible-builder), project layout, and Ansible versus Terraform/OpenTofu. Not for Terraform/OpenTofu state and modules (devops-iac), Linux host internals (devops-linux), CI pipeline authoring (devops-cicd), secret stores (devops-secrets), Proxmox or OpenStack platform internals (devops-proxmox, devops-openstack) or a security hardening audit (security-expert).
versions:
  ansible-core: "2.22.0 (maintained lines 2.22, 2.21, 2.20; 2.19 EOL Nov 2026)"
  ansible-community-package: "14.6.0 (ansible-core ~=2.21.6; 15.0.0 in development on 2.22)"
  ansible-lint: "26.11.0"
  molecule: "26.11.0"
  ansible-navigator: "26.11.0"
  ansible-builder: "3.2.0 (EE definition schema version 3)"
references:
  - references/versions-support.md
  - references/inventory-variables.md
  - references/playbooks-roles-collections.md
  - references/idempotency-handlers-errors.md
  - references/safe-run-protocol.md
  - references/vault-secrets.md
  - references/performance-tuning.md
  - references/testing-lint-molecule.md
  - references/execution-environments.md
  - references/ansible-vs-iac-awx.md
  - references/templates/ansible.cfg
  - references/templates/inventory.yml
  - references/templates/group_vars-all.yml
  - references/templates/site-rolling-update.yml
  - references/templates/requirements.yml
  - references/templates/ansible-lint.yml
  - references/templates/role-skeleton/tasks/main.yml
  - references/templates/role-skeleton/handlers/main.yml
  - references/templates/role-skeleton/defaults/main.yml
  - references/templates/role-skeleton/meta/main.yml
  - references/templates/role-skeleton/templates/service.conf.j2
  - references/templates/molecule/molecule.yml
  - references/templates/molecule/inventory/hosts.yml
  - references/templates/molecule/converge.yml
  - references/templates/molecule/verify.yml
  - references/templates/execution-environment.yml
  - references/templates/ansible-navigator.yml
related-skills:
  - devops-iac
  - devops-linux
  - devops-secrets
  - devops-cicd
  - devops-proxmox
  - devops-openstack
  - devops-virtualization
  - devops-docker
---

<objective>
Covers configuration management with Ansible: picking versions, structuring a
project, inventory and variables, playbooks, roles and collections, idempotent
tasks, handlers and error handling, Vault, safe execution against real hosts
(check mode, diff, limit, rolling batches), performance, testing (ansible-lint,
Molecule) and execution environments. Does not cover Terraform/OpenTofu
(devops-iac), host-level Linux administration (devops-linux), CI pipelines
(devops-cicd) or external secret stores (devops-secrets); AWX/AAP is a pointer only.
</objective>

# DevOps Ansible

## Agent Workflow (MANDATORY)

Before ANY playbook, role or inventory change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find `ansible.cfg`, `inventories/`, `roles/`, `collections/requirements.yml`, `group_vars/`, vault files
2. **research-expert** - verify module options for the installed collection versions at docs.ansible.com
3. **mcp__context7__query-docs** - `/websites/ansible_projects_ansible`, `/ansible/ansible-lint`, `/ansible/molecule`

Then read the environment read-only (`ansible --version`, `ansible-galaxy collection list`, `ansible-inventory --graph`, `ansible-doc <fqcn>`).
After changes, run **sniper**; against real hosts follow [safe-run-protocol.md](references/safe-run-protocol.md).

## Versions (checked 2026-11-10)

ansible-core 2.22.0 is the latest (PyPI; needs Python >= 3.13 on the control node). The community package `ansible` 14.6.0 pins `ansible-core ~=2.21.6` and needs Python >= 3.12; package 15.0.0 (on 2.22) is unreleased. ansible-core keeps the latest release plus two older ones. Details, Python matrix and sources: [versions-support.md](references/versions-support.md).

## Overview

| Area | Decision in one line |
|------|----------------------|
| **Install** | `ansible` package for batteries included; `ansible-core` + pinned `requirements.yml` for reproducible control nodes; EE container for CI |
| **Inventory** | YAML files per environment, `group_vars/` and `host_vars/` next to them; dynamic inventory through plugins, not scripts |
| **Content** | FQCN everywhere; roles for reusable units; collections pinned by version range in `requirements.yml` |
| **Tasks** | Native modules first; `command`/`shell` only with `changed_when`/`failed_when`; `state: present` over `latest` |
| **Run** | `--check --diff --limit` first, then canary host, then `serial` batches with `max_fail_percentage` |
| **Secrets** | Vault with `--vault-id` labels or an external store; `no_log: true` on tasks handling secrets; `diff: false` on secret files |
| **Quality** | `ansible-lint` profile `production`, Molecule with an idempotence step |

## Critical Rules

1. **Version first** - `ansible --version` and `ansible-galaxy collection list` before writing a task; module options differ per collection version; unknown option = `ansible-doc <fqcn>`
2. **Check, diff, limit before any real run** - `ansible-playbook --check --diff --limit <host>`; check mode is a prediction, not a guarantee (modules without check support are skipped)
3. **Production runs are proposed, not run** - show playbook, inventory, `--limit`, tags, `--become` scope and expected changes, wait for the user's go ([safe-run-protocol.md](references/safe-run-protocol.md))
4. **Canary then rolling** - one host, then `serial: [1, 5, 10]` with `max_fail_percentage`; never `hosts: all` plus `strategy: free` on a stateful tier
5. **Idempotent or it does not ship** - second run reports `changed=0`; `command`/`shell` without `changed_when` is a defect ([idempotency-handlers-errors.md](references/idempotency-handlers-errors.md))
6. **Never print or commit a secret** - vault passwords out of the repo, `no_log: true`, names and keys only in reports ([vault-secrets.md](references/vault-secrets.md))
7. **Never invent a module, option or collection** - cite the docs.ansible.com or collection page; unknown = "not verified"

## Architecture

```
infra-ansible/
├── ansible.cfg                   # inventory path, roles_path, collections_path, forks, pipelining
├── collections/requirements.yml  # pinned collections (and roles)
├── inventories/
│   ├── production/{hosts.yml,group_vars/,host_vars/}
│   └── staging/{hosts.yml,group_vars/,host_vars/}
├── playbooks/site.yml            # imports per-tier playbooks
├── roles/<role>/{tasks,handlers,defaults,vars,templates,files,meta}/
├── molecule/default/             # per-role or per-collection scenarios
├── .ansible-lint                 # profile and skip/warn lists
└── execution-environment.yml     # only when running in an EE
```

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Versions and support** | [versions-support.md](references/versions-support.md) | Choosing core/package, Python on control and managed nodes |
| **Inventory and variables** | [inventory-variables.md](references/inventory-variables.md) | Static/dynamic inventory, precedence, groups |
| **Playbooks, roles, collections** | [playbooks-roles-collections.md](references/playbooks-roles-collections.md) | Layout, FQCN, galaxy, requirements.yml, Jinja2 |
| **Idempotency and errors** | [idempotency-handlers-errors.md](references/idempotency-handlers-errors.md) | changed_when, handlers, block/rescue/always, tags |
| **Safe execution** | [safe-run-protocol.md](references/safe-run-protocol.md) | ANY run against real hosts, become, reboot, state: absent |
| **Vault and secrets** | [vault-secrets.md](references/vault-secrets.md) | Encrypting values, vault ids, no_log |
| **Performance** | [performance-tuning.md](references/performance-tuning.md) | forks, pipelining, fact caching, strategies |
| **Testing** | [testing-lint-molecule.md](references/testing-lint-molecule.md) | ansible-lint profiles, Molecule, ansible-test |
| **Execution environments** | [execution-environments.md](references/execution-environments.md) | ansible-navigator, ansible-builder |
| **Ansible vs IaC, AWX** | [ansible-vs-iac-awx.md](references/ansible-vs-iac-awx.md) | Tool choice, handoff to devops-iac |

### Templates

| Template | When to Use |
|----------|-------------|
| [ansible.cfg](references/templates/ansible.cfg) | New project defaults: forks, pipelining, fact cache |
| [inventory.yml](references/templates/inventory.yml) | YAML inventory with groups, ranges and group vars |
| [group_vars-all.yml](references/templates/group_vars-all.yml) | Variables with the `vault_` indirection pattern |
| [site-rolling-update.yml](references/templates/site-rolling-update.yml) | Rolling update: serial, max_fail_percentage, block/rescue |
| [requirements.yml](references/templates/requirements.yml) | Pinned collections and roles |
| [ansible-lint.yml](references/templates/ansible-lint.yml) | Lint config (copy to `.ansible-lint`) |
| [role-skeleton/](references/templates/role-skeleton/tasks/main.yml) | New role: tasks, handlers, defaults, meta, template |
| [molecule/](references/templates/molecule/molecule.yml) | Ansible-native Molecule scenario |
| [execution-environment.yml](references/templates/execution-environment.yml) | ansible-builder v3 definition |
| [ansible-navigator.yml](references/templates/ansible-navigator.yml) | Navigator settings with an EE |

## Quick Reference

```bash
ansible --version; ansible-galaxy collection list                 # versions first
ansible-inventory -i inventories/staging --graph                  # what the inventory resolves to
ansible-doc ansible.builtin.template                              # option names for the installed version
ansible-lint                                                      # from the project root
ansible-playbook -i inventories/staging playbooks/site.yml --syntax-check
ansible-playbook -i inventories/staging playbooks/site.yml --check --diff --limit web01   # read-only prediction
ansible-playbook -i inventories/production playbooks/site.yml --limit web01               # after the user's go
```

## Best Practices

### DO
- Pin collections (`version: ">=x,<y"`) and the ansible-core line in CI; install from `requirements.yml`
- Keep one inventory directory per environment so `group_vars` never leak across them
- Add `no_log: true` to tasks that handle credentials and `diff: false` where `--diff` would print them
- Use `ansible.builtin.assert` for pre-flight guards (target group, free disk, version) inside `pre_tasks`

### DON'T
- Run `ansible-playbook` against `production` from a prompt without `--limit` and the user's go
- Use `ignore_errors: true` to hide a failing task; use `failed_when` or `block/rescue`
- Use `state: latest` for packages in production plays
- Rely on `-e` extra vars for routine config: they beat every other variable source
