---
name: testing-quality
description: Offline checks and tests for IaC - fmt, validate, tofu/terraform test with mock providers, tflint, checkov and trivy config scanning
when-to-use: Before proposing any plan, when adding a module, or when wiring checks into CI
keywords: tofu test, tftest.hcl, mock_provider, expect_failures, fmt, validate, tflint, checkov, trivy config, plan scan
priority: high
related: modules-variables.md, plan-apply-protocol.md, layout-providers-lock.md
---

# Testing and static quality

**Load when:** HCL is written or reviewed. The ladder, cheapest first: `fmt` > `validate` > `tflint` > config scan > `test` (plan only, mocked) > `test` (apply, real infra, lab only) > reviewed `plan`.

## Offline checks (no credentials, no network to the platform)

```bash
tofu fmt -check -recursive              # exit 0 = formatted; non-zero lists files (use -diff to see changes)
tofu init -backend=false                # installs providers/modules, does not touch any backend
tofu validate                           # needs the initialized dir; checks syntax, types, references
```

## `tofu test` / `terraform test`

- Runs every `*.tftest.hcl` / `*.tofutest.hcl` (and `.json`) in the module dir or `tests/` (`-test-directory=path`; `-filter=file` repeatable; `-verbose` prints each plan/state).
- A `run` block runs `plan` or `apply` (**default `apply`**, which creates real infrastructure and destroys it at the end) and evaluates `assert` blocks. Always set `command = plan` unless the test targets a throwaway lab.
- `expect_failures = [var.x]` asserts that a validation or check fails (negative tests); `variables {}` sets inputs; `override_resource`, `override_data`, `override_module`, `mock_provider` replace remote calls so tests run with no platform at all.
- OpenTofu: a `.tofutest.hcl` file wins over a same-named `.tftest.hcl`, letting a module keep one test per binary.
- Variables used in backend/module-source/encryption config must be given values when running `tofu test`.

Template: [templates/main.tftest.hcl](templates/main.tftest.hcl) (plan-only, mocked provider, one negative test).

Test pyramid for this audience: validation rules and naming logic with `command = plan` + `mock_provider` (fast, in CI); real Proxmox/OpenStack applies only in a lab project with its own credentials and quota, never against shared infrastructure.

## Static analysis

| Tool | Version read | Use | Command |
|------|--------------|-----|---------|
| `tflint` | 0.66.0 (supports Terraform 1.17) | Language rules, unused declarations, deprecated syntax; provider rulesets cover AWS/Azure/GCP - none read for Proxmox/OpenStack, so expect language rules only | `tflint --init && tflint --recursive` (flags: read `tflint --help`) |
| `trivy config` | 0.76.2 | Misconfiguration scan of Terraform, Dockerfile, Helm, Kubernetes manifests | `trivy config ./infra` |
| `checkov` | current on PyPI (not read) | Policy scan of `.tf` and of the JSON plan; plan scanning sees resolved values and `__change_actions__` (delete detection) | `checkov -d .` ; `tofu show -json tfplan > tfplan.json && checkov -f tfplan.json` |

- Plan JSON can contain secrets: scan it inside the pipeline, never upload it as a public artifact.
- Scanner output is advice: a finding on a self-hosted target (for example "bucket not encrypted with KMS") may not apply; record a justified ignore (`.trivyignore` or inline skip) with the reason, never a blanket skip.
- Pin scanner versions in CI; they ship new rules continuously and break builds silently otherwise.

## CI order (pointer: `devops-cicd`)

`fmt -check` > `init -backend=false` > `validate` > `tflint` > `trivy config` / `checkov` > `test` > (with credentials) `plan -out` > review > `apply`.

## Pitfalls

- `tofu test` with the default `apply` against production credentials.
- Mock providers return generated values: assertions on computed attributes (`id`, IPs) need `mock_resource` defaults.
- `validate` passes while a provider rejects a value at plan: only plan/apply talk to the platform.
- Installing scanners with `curl | sh`: download release assets and verify checksums (tflint documents `gh attestation verify`).

## Verification

```bash
tofu test -verbose 2>&1 | tail -20        # run summary: N passed, 0 failed
tflint --version && trivy --version       # pinned tool versions in use
```

## Sources

- https://opentofu.org/docs/cli/commands/test/ , .../validate/ , .../fmt/
- https://github.com/terraform-linters/tflint (README, release v0.66.0)
- https://trivy.dev/docs/latest/scanner/misconfiguration/ , https://github.com/aquasecurity/trivy/releases (v0.76.2)
- https://www.checkov.io/7.Scan%20Examples/Terraform%20Plan%20Scanning.html

## Not verified

- tflint `--recursive` and `--init` flags beyond what the README shows (`tflint --init` is documented there; `--recursive` was not read).
- Whether any maintained tflint or checkov rule pack exists for Proxmox or OpenStack resources.
- `terraform test` differences from `tofu test` (the Terraform command page was not read).
- Checkov's current version number.
