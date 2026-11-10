---
name: tofu-vs-terraform
description: Choosing OpenTofu or Terraform - license, governance, current versions, feature divergence and migration
when-to-use: Starting a project, reviewing which binary a repo uses, or writing HCL that must run on both
keywords: opentofu, terraform, BSL, license, state encryption, ephemeral, write-only, exclude, migration
priority: high
related: state-backends-encryption.md, layout-providers-lock.md, testing-quality.md
---

# OpenTofu or Terraform

**Load when:** a new stack is started, a repo mixes both binaries, or a feature must be chosen by version.

## Decision rules

| Question | Answer |
|----------|--------|
| Need state/plan encryption in the tool itself? | OpenTofu (1.7+). Terraform: no equivalent found in the docs read (not verified as absent) |
| Need Terraform-only features (actions, `terraform query`, Terraform Policy)? | Terraform 1.14+ / 1.17 |
| Need a vendor-neutral project outside the BSL? | OpenTofu (created in response to the BSL switch, given to the Linux Foundation, per its FAQ) |
| Internal use of Terraform? | Allowed by the BSL additional use grant; offering Terraform to third parties as a competing paid hosted/embedded product is not |
| Existing Terraform state at 1.5.x or earlier? | Migrate with the OpenTofu guide; later Terraform states need the guide's per-version notes |
| Team has no preference | OpenTofu for self-hosted Proxmox/OpenStack work: same providers, encryption included |

Default recommendation for this plugin's audience: **OpenTofu**, pinned to the 1.13 line, unless the repo already runs Terraform. Do not switch a live state on your own: migration is a proposal with a state backup (`state-surgery.md`).

## Versions read on 2026-11-10

| Tool | Version | Source |
|------|---------|--------|
| OpenTofu | 1.13.9 (tag, 2026-11); 1.12.12 also tagged 2026-11-05 | https://github.com/opentofu/opentofu/tags |
| Terraform | 1.17.1 (2026-10-28); 1.16.7 (2026-10-22); 1.15 EOL 2026-10-21 (research doc, not re-read) | https://github.com/hashicorp/terraform/releases |
| Terraform license | BSL 1.1, licensor IBM, Terraform 1.6.0 or later, change license MPL 2.0 four years after publication | https://raw.githubusercontent.com/hashicorp/terraform/main/LICENSE |

## Feature divergence (verified at the source)

| Feature | OpenTofu | Terraform |
|---------|----------|-----------|
| State and plan encryption | 1.7 (`terraform { encryption {} }`, key providers include pbkdf2, aws_kms, gcp_kms, external) | not found |
| Provider-defined functions | 1.7 (plus dynamic ones, OpenTofu-only) | exists (not re-verified here) |
| `removed` block, loopable `import` | 1.7 | `removed`/`import` exist (not re-verified) |
| Provider `for_each`, `-exclude` | 1.9 | not found |
| OCI registry for providers/modules, native S3 locking, `-exclude-file` | 1.10 | S3 `use_lockfile` documented; DynamoDB locking deprecated |
| Ephemeral resources, write-only attributes, `enabled` meta-argument | 1.11 | write-only needs 1.11+; `enabled` not found |
| Dynamic `prevent_destroy`, `lifecycle { destroy = false }`, full `h1:`+`zh:` lock hashes on `init` | 1.12 | not found |
| Actions (`action_trigger`), list resources (`*.tfquery.hcl`), `terraform query` | not found | 1.14 |
| Terraform Policy GA, variables in provider requirements, `-minimal-refresh` | not found | 1.17 |
| `.tofu` / `.tofutest.hcl` file extensions take precedence over same-named `.tf` / `.tftest.hcl` | yes | no |

## Writing HCL that runs on both

- Keep OpenTofu-only blocks (`encryption`, `enabled`, `destroy = false`) in separate files and say so in the PR.
- `required_version = ">= 1.11.0"` lets both binaries use ephemeral and write-only features; the Proxmox provider doc states write-only needs Terraform 1.11+ or OpenTofu 1.10+, while the OpenTofu 1.11 announcement introduces them in 1.11 - use 1.11.
- Registries differ: OpenTofu installs from `registry.opentofu.org`; `required_providers` sources are the same strings. Lock files are per binary - commit the one you run.

## Pitfalls

- Treating the two as drop-in forever: after Terraform 1.5.x the projects diverge; read the migration guide for the Terraform version in use.
- `terragrunt` picks a binary via `--tf-path`/`TG_TF_PATH` when both are installed; set it explicitly.

## Verification

```bash
tofu version; terraform version        # which one is installed; never assume
grep -rn "encryption\|lifecycle" --include=*.tf . | head   # OpenTofu-only syntax present?
```

## Sources

- https://opentofu.org/faq/ , https://opentofu.org/docs/intro/migration/
- https://opentofu.org/blog/opentofu-1-7-0/ , .../1-9-0/ , .../1-10-0/ , .../1-11-0/ , .../1-12-0/
- https://github.com/hashicorp/terraform/releases , https://raw.githubusercontent.com/hashicorp/terraform/v1.14/CHANGELOG.md
- https://developer.hashicorp.com/terraform/language/block/ephemeral , https://developer.hashicorp.com/terraform/language/backend/s3

## Not verified

- Whether Terraform has any state-encryption feature other than backend-side encryption.
- Terraform `removed`/`import`/provider-defined-function version numbers and the exact Terraform EOL policy.
- Which license text OpenTofu itself ships (not read); governance is only stated as Linux Foundation per the OpenTofu FAQ.
