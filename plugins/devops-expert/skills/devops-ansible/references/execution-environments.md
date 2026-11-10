---
name: execution-environments
description: Execution environments (EE) as the reproducible Ansible control node - ansible-builder v3 definition file, ansible-navigator settings file and CLI flags, pull policy, volume mounts, and when to use an EE instead of a venv
when-to-use: Pinning the whole toolchain (core, collections, Python and system deps) in a container, running playbooks the same way locally and in CI/AWX
keywords: execution environment, ansible-builder, ansible-navigator, execution-environment.yml, ansible-runner, container-engine, pull policy, bindep, ee
priority: medium
related: versions-support.md, testing-lint-molecule.md, ansible-vs-iac-awx.md
---

# Execution Environments

**Load when:** you want one pinned, portable control node (container image) or the project runs on AWX/AAP. Templates: [execution-environment.yml](templates/execution-environment.yml), [ansible-navigator.yml](templates/ansible-navigator.yml).

## venv or EE

| | venv + `requirements.yml` | Execution environment |
|---|---------------------------|-----------------------|
| Pins | ansible-core, Python packages, collections | all of that plus system packages and the OS layer |
| Needs | Python of the right version on the control node | a container engine (podman, docker) |
| Good for | small teams, a single control host | CI, shared runners, AWX/AAP (same image everywhere) |

The install guide itself recommends an EE image as the control node for containers. An EE image is data you build and own: sign and scan it like any other image (`devops-docker`), and pin the base image by digest.

## ansible-builder (3.2.0, schema version 3)

The definition file is `execution-environment.yml` (or `.yaml`). **`version: 3` must be written**, otherwise Ansible Builder assumes version 1. Seven top-level sections: `additional_build_files`, `additional_build_steps`, `build_arg_defaults`, `dependencies`, `images`, `options`, `version`.

```yaml
version: 3
images:
  base_image:
    name: docker.io/redhat/ubi9:latest      # RPM-based images only (dnf); Debian/Ubuntu/Alpine are not supported
dependencies:
  ansible_core:
    package_pip: ansible-core==2.21.6        # pin the line you validated
  ansible_runner:
    package_pip: ansible-runner
  galaxy: requirements.yml                   # collections
  python: requirements.txt
  system: bindep.txt
```

- `dependencies.exclude` removes unwanted Python/system packages pulled in by collections.
- `additional_build_files` copies files into the build context (`src`, `dest` under `_build/`); `additional_build_steps` injects Containerfile lines per phase (`prepend_base`, `prepend_galaxy`, `prepend_final`, `append_final`, ...). Keep credentials out of build steps and build args.
- `options.package_manager_path` is for RHEL-based images that use `microdnf`.
- Building produces a `Containerfile`/`Dockerfile` and an image with the container engine; the exact `ansible-builder` subcommands are in its CLI help (not read here).

## ansible-navigator (26.11.0)

A CLI/TUI to run and inspect playbooks, inventories, collections and EE images. Settings come from CLI flags, environment variables or a settings file; first match wins:

1. `ANSIBLE_NAVIGATOR_CONFIG` (path)
2. `./ansible-navigator.<ext>` in the project (no leading dot)
3. `~/.ansible-navigator.<ext>` (leading dot)

JSON (`.json`) or YAML (`.yml`/`.yaml`); only one file per directory, otherwise it errors. Useful settings (all under the `ansible-navigator:` key): `execution-environment.enabled`, `.image`, `.container-engine` (`auto` tries podman, then docker, then container), `.pull.policy` (`always`, `missing`, `never`, `tag`), `.volume-mounts` (`src`, `dest`, `options`), `.environment-variables` (`pass` / `set`), `mode` (`stdout` or interactive), `playbook-artifact` (`enable`, `save-as`), `logging`. CLI equivalents: `--ee`, `--eei <image>`, `--ce`, `--pp`, `--mode stdout`.

```bash
ansible-navigator run playbooks/site.yml -i inventories/staging --mode stdout --check --diff --limit web01
```

Everything in [safe-run-protocol.md](safe-run-protocol.md) applies unchanged: the EE changes where Ansible runs, not what it may do. SSH keys and vault passwords reach the container through mounts or environment passthrough: mount read-only, pass only what the play needs.

Molecule can use `ansible-navigator` as its executor backend ([testing-lint-molecule.md](testing-lint-molecule.md)).

## Sources (read 2026-11-10)

- https://docs.ansible.com/projects/builder/en/latest/definition/
- https://docs.ansible.com/projects/navigator/
- https://docs.ansible.com/projects/navigator/settings/
- https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html (EE as control node)
- https://pypi.org/pypi/ansible-builder/json , https://pypi.org/pypi/ansible-navigator/json

## Not verified

- `ansible-builder` command names and flags (`build`, tags, `--container-runtime`): not read.
- Whether `ubi9:latest` is a good pin (use a digest); the base image names are the docs' examples.
- The `python:`/`system:` dependency file names (`requirements.txt`, `bindep.txt`) are conventional: the docs sample shows `bindep.txt` and an inline list.
- The versions of ansible-core available for the chosen base image (the builder picks "most recently compatible" when unpinned).
- Hardware, rootless and SELinux (`:Z`) specifics of running EEs; AAP-supplied EE catalogs.
