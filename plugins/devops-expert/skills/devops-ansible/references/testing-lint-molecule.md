---
name: testing-lint-molecule
description: Testing Ansible content - ansible-lint config and profiles, syntax check, Molecule scenarios (ansible-native and legacy), the idempotence step, a CI test ladder, and ansible-test for collections
when-to-use: Adding CI to a role or playbook repo, choosing lint strictness, writing a Molecule scenario, proving idempotency
keywords: ansible-lint, profile, production, skip_list, warn_list, enable_list, molecule, scenario, test_sequence, idempotence, converge, verify, ansible-native, ansible-test
priority: medium
related: idempotency-handlers-errors.md, execution-environments.md, versions-support.md
---

# Testing: ansible-lint, Molecule, ansible-test

**Load when:** setting up or reviewing tests for roles, playbooks or collections. Templates: [ansible-lint.yml](templates/ansible-lint.yml), [molecule/](templates/molecule/molecule.yml). Versions: ansible-lint 26.11.0, molecule 26.11.0 ([versions-support.md](versions-support.md)).

## Test ladder (cheapest first)

1. `yamllint` style is part of ansible-lint (`yaml` rule; needs the `yamllint` library).
2. `ansible-playbook --syntax-check` (ansible-lint's `syntax-check` rule runs it).
3. `ansible-lint` with a profile.
4. Molecule on a disposable target: converge, **idempotence**, verify.
5. `--check --diff` against staging, then canary, then production ([safe-run-protocol.md](safe-run-protocol.md)).

## ansible-lint

- Run from the project root (required for file discovery and dependency resolution). Config file: `.ansible-lint`, `.ansible-lint.yml`, `.ansible-lint.yaml`, `.config/ansible-lint.yml` or `.config/ansible-lint.yaml`; or `-c <file>`. CLI scalars override the file; list values (`skip_list`, `warn_list`, `exclude_paths`) are **appended**, not replaced.
- Profiles, each extending the previous: `min` (can Ansible load it) -> `basic` -> `moderate` -> `safety` -> `shared` -> `production`. Rules per profile include:
  - `basic`: `command-instead-of-module`, `command-instead-of-shell`, `deprecated-module`, `inline-env-var`, `key-order`, `literal-compare`, `jinja`, `no-jinja-when`, `no-tabs`, `partial-become`, `role-name`, `schema`, `name`, `var-naming`, `yaml`
  - `safety`: `avoid-implicit`, `latest`, `package-latest`, `risky-file-permissions`, `risky-octal`, `risky-shell-pipe`
  - `shared`: `galaxy`, `ignore-errors`, `meta-incorrect`, `meta-runtime`, `no-changed-when`, `no-handler`, `no-relative-paths`
  - `production`: `fqcn` (plus not-yet-implemented placeholders such as `sanity`, `single-entry-point`)
- Aim: **`production`** for new code that you own; start at `basic`/`moderate` on a legacy repo and ratchet up. Prefer `.ansible-lint-ignore` entries (file + rule, remain visible) over `skip_list` (hides violations). `warn_list` keeps non-fatal findings visible. Opt-in rules (`no-log-password`, `no-same-owner`, `name[prefix]`, `galaxy-version-incorrect`, `empty-string-compare`, `args`) are switched on in `enable_list`.
- `offline: true` disables installing `requirements.yml` and schema refresh (air-gapped CI). `mock_modules` / `mock_roles` let syntax-check pass for content not installed. `ansible-lint --fix` rewrites YAML and applies rule transforms (`write_list` limits them): review the diff, never run it on production repos unreviewed.
- Output can be written as SARIF (`sarif_file`) for code-scanning UIs.

## Molecule

Molecule tests roles, playbooks and collections; it supports only the **latest two major Ansible versions (N / N-1)**. Called as `molecule ...` or `python3 -m molecule ...`.

### Scenario sequences

A scenario is a directory (`molecule/default/`) holding everything for one way of testing. Default `test_sequence`: `dependency, cleanup, destroy, syntax, create, prepare, converge, idempotence, side_effect, verify, cleanup, destroy` (also `create_sequence`, `converge_sequence`, `check_sequence`, `destroy_sequence`). Override any sequence under `scenario:`. `idempotence` re-runs converge and fails if anything reports `changed` - this is the automated form of the idempotency contract ([idempotency-handlers-errors.md](idempotency-handlers-errors.md)). `side_effect` can run extra playbooks (reboot, config change) between converge and verify; `verify` can take test names.

### Configuration styles

- **Ansible-native** (current): top-level `ansible:` (executor backend `ansible-playbook` or `ansible-navigator`, `env`, `cfg`, `playbooks:` mapping create/destroy/converge/prepare/verify/cleanup/side_effect), `scenario:`, `shared_state`, `verifier: {name: ansible}`; targets are plain Ansible inventory (static, dynamic plugin, constructed). Driver/platforms/provisioner constructs are not needed.
- **Legacy**: `driver`, `platforms`, `provisioner`, `verifier` sections; the default driver is `delegated` (you write create/destroy playbooks). Marked "pre ansible-native" in the docs.
- `dependency: {name: galaxy}` installs roles/collections from `requirements.yml`; `prerun` (default on) installs project-level requirements into `.cache`. Disable with `prerun: false`.
- Scenario template here: [molecule.yml](templates/molecule/molecule.yml), [converge.yml](templates/molecule/converge.yml), [verify.yml](templates/molecule/verify.yml). The inventory points at a lab target you own - never at production.

### Running

```bash
molecule test                  # full default sequence (destroys at the end)
molecule converge && molecule idempotence && molecule verify   # iterate while developing
```

Molecule `create`/`destroy` act on the test targets only; a scenario that points `inventory` at real hosts makes `converge` a real run: apply [safe-run-protocol.md](safe-run-protocol.md).

## ansible-test (collections)

`ansible-test` ships with ansible-core and runs sanity, unit and integration tests for collection authors (it must be run from inside `ansible_collections/<ns>/<name>/`). For playbook/role repos use lint + Molecule instead.

## CI sketch

```yaml
# any CI: run inside an EE or a pinned venv
- ansible-galaxy collection install -r collections/requirements.yml
- ansible-lint
- ansible-playbook -i inventories/staging playbooks/site.yml --syntax-check
- molecule test            # per changed role
- ansible-playbook -i inventories/staging playbooks/site.yml --check --diff   # optional, staging only
```

Pipeline authoring itself belongs to `devops-cicd`.

## Sources (read 2026-11-10)

- https://docs.ansible.com/projects/lint/configuring/
- https://docs.ansible.com/projects/lint/profiles/
- https://docs.ansible.com/projects/molecule/
- https://docs.ansible.com/projects/molecule/configuration/
- https://docs.ansible.com/projects/molecule/ansible-native/
- https://pypi.org/pypi/ansible-lint/json , https://pypi.org/pypi/molecule/json
- Context7 `/ansible/ansible-lint`, `/ansible/molecule` (resolved; query not run beyond resolution)

## Not verified

- `molecule` subcommand names and flags (`test`, `converge`, `idempotence`, `verify`): derived from the sequence names; command help not read.
- Whether `idempotence` is available as a sequence step in ansible-native mode (it is listed in the shared `scenario:` defaults; the ansible-native `playbooks:` list has no idempotence key).
- `ansible-test` invocation details and the per-collection test layout (not read today).
- Rule behaviour of individual lint rules beyond their profile membership.
- Nothing here was executed: ansible, ansible-lint and molecule are not installed on this machine.
