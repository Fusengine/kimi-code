---
name: versions-support
description: ansible-core versus the ansible community package, current versions, support windows, control node and managed node Python requirements, tooling versions and key collection versions
when-to-use: Before installing or upgrading Ansible, choosing a Python for the control node, or deciding whether a managed host is too old
keywords: ansible-core, ansible package, 2.22, 2.21, 14.6.0, python 3.13, support matrix, EOL, pip, pipx, community.general
priority: high
related: execution-environments.md, testing-lint-molecule.md, playbooks-roles-collections.md
---

# Versions and Support

**Load when:** deciding which Ansible to install or whether a host can be managed. Facts read 2026-11-10.

## Two packages

| | `ansible-core` | `ansible` (community package) |
|---|----------------|-------------------------------|
| Content | language, runtime, `ansible.builtin` plugins | core + curated collections (85+ at last count on the docs page) |
| Versioning | `2.Y.Z`, major in May and November, patch every 4 weeks | semantic (`14.6.0`), one maintained major at a time |
| Maintained | latest + two older lines | only the latest major |

`ansible --version` prints the ansible-core version; `ansible-community --version` prints the package version.

## Current releases

| Item | Version | Constraint read today |
|------|---------|-----------------------|
| ansible-core | **2.22.0** | PyPI: `requires_python >=3.13`; classifiers Python 3.13, 3.14, 3.15 |
| ansible (package) | **14.6.0** | PyPI: `ansible-core~=2.21.6`, `requires_python >=3.12` |
| ansible 15.0.0 | in development | docs table: depends on ansible-core 2.22 |
| ansible 13.x | EOL June 2026 | docs table |

ansible-core support windows (docs matrix, which at read time lists 2.21 as newest row - 2.22 was not yet in the table):

| Core | GA | Critical fixes until | Security fixes until | EOL | Control node Python | Managed node Python |
|------|----|---------------------|----------------------|-----|---------------------|---------------------|
| 2.21 | May 2026 | Nov 2026 | May 2027 | Nov 2027 | 3.12 - 3.14 | 3.9 - 3.14, PowerShell 5.1 - 7 |
| 2.20 | 03 Nov 2025 | 18 May 2026 | 02 Nov 2026 | May 2027 | 3.12 - 3.14 | 3.9 - 3.14 |
| 2.19 | 21 Jul 2025 | 03 Nov 2025 | 18 May 2026 | Nov 2026 | 3.11 - 3.13 | 3.8 - 3.13 |

Rules from the same page:
- Control node: each release supports the three most recently released Python versions (consistent with 2.22 on 3.13 - 3.15).
- Managed node: the 6 most recent Python versions, and 7 for every 6th release (2.16, 2.22) - so 2.22 reaches back to 3.9 with 3.15 as newest (derived from the rule; the 2.22 row itself was not in the table).
- Python 2.7 targets: only ansible-core 2.16 and earlier.
- Windows managed nodes: Windows PowerShell 5.1; PowerShell 7 LTS from 2.21.
- Network modules need no Python on the device. The managed node needs Python plus an SSH user with a POSIX shell.

Practical rule: pin the control node to a line that is still maintained and whose Python you can install (2.22 needs 3.13; 2.21 and 2.20 run on 3.12). Do not run an EOL line: the docs warn about unfixed CVEs.

## Install

```bash
python3 -m pip install --user ansible            # full package (inside a venv in practice)
python3 -m pip install --user ansible-core       # minimal; then ansible-galaxy collection install -r ...
pipx install --include-deps ansible              # when the OS blocks pip
```

Windows is not a supported control node (use WSL). For containers use an execution environment ([execution-environments.md](execution-environments.md)).

## Tooling versions (PyPI, 2026-11-10)

| Tool | Version | Python | Notes |
|------|---------|--------|-------|
| ansible-lint | 26.11.0 | >=3.10 | depends `ansible-core !=2.17.*, >=2.16.19` |
| molecule | 26.11.0 | >=3.11 | docs: supports only the latest two major Ansible versions (N / N-1) |
| ansible-navigator | 26.11.0 | >=3.10 | |
| ansible-builder | 3.2.0 | >=3.11 | EE schema version 3 |
| ansible-dev-tools | 26.11.0 | >=3.11 | bundle of the tools above |

## Collections often needed (Galaxy API, 2026-11-10)

| Collection | Latest | Used for |
|------------|--------|----------|
| community.general | 14.0.1 | many utility modules and plugins |
| ansible.posix | 2.2.2 | `authorized_key`, `firewalld`, `mount`, `sysctl`, `synchronize` family |
| community.proxmox | 2.1.0 | Proxmox VE modules and inventory (see devops-proxmox) |
| openstack.cloud | 2.6.0 | OpenStack modules (see devops-openstack) |

Check the collection's own `meta/runtime.yml` / docs for the ansible-core range it supports before pinning it next to a new core.

## Upgrading

1. Read the porting guide of the target package/core (docs list porting guides up to Ansible 14).
2. Upgrade in a venv or EE on a copy of the project; run `ansible-lint`, `--syntax-check`, then `--check --diff` against staging.
3. Roll to production like any change ([safe-run-protocol.md](safe-run-protocol.md)).
4. ansible-core deprecations normally run across 4 feature releases; removals can appear without warning for undocumented behaviour.

Removed in 2.21: `interpreter_python` values `auto_legacy` and `auto_legacy_silent`; use `auto` or `auto_silent`.

## Sources (read 2026-11-10)

- https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- https://docs.ansible.com/projects/ansible/latest/reference_appendices/interpreter_discovery.html
- https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guides.html
- https://pypi.org/pypi/ansible-core/json , https://pypi.org/pypi/ansible/json
- https://pypi.org/pypi/ansible-lint/json , molecule , ansible-navigator , ansible-builder , ansible-dev-tools (same URL pattern)
- https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/<namespace>/<name>/?format=json

## Not verified

- The 2.22 row of the support matrix (docs page lagged); the 3.9 - 3.15 managed range is derived from the stated rule and the research notes, not from a table row.
- Release date 2026-11-02 of 2.22.0 (from `docs/research-devops-plugin.md`; PyPI JSON read today confirms the version, not the date).
- Which collection versions the 14.6.0 package bundles (see `ansible-build-data` changelog; not read).
- Minimum ansible-core supported by each collection listed above.
