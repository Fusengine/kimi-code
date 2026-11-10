---
name: plan-apply-protocol
description: The plan, review, apply protocol with saved plans, the exact effect of every destructive command, drift detection and the CI pointer
when-to-use: Before ANY plan/apply/destroy, whenever -target, -replace, state rm, state push, force-unlock or a backend deletion is considered
keywords: plan -out, apply tfplan, detailed-exitcode, destroy, replace, -/+, target, exclude, refresh-only, drift, prevent_destroy
priority: critical
related: state-surgery.md, state-backends-encryption.md, testing-quality.md
---

# Plan, review, apply

**Load when:** infrastructure will change. Read-only commands (`fmt`, `validate`, `plan`, `show`, `state list/show/pull`, `providers`, `output`) need no go; everything that writes state or infrastructure follows this file.

## The protocol

1. **Target check** - which binary, which directory, which workspace/backend key, which provider endpoint/cloud. Print them: `tofu version; tofu workspace show; grep -n 'key\|endpoint' backend.tf`.
2. **Clean inputs** - `git status` clean (or the dirty files are named and intended); lock file unchanged; variables from files/env, not typed ad hoc.
3. **Plan to a file** - `tofu plan -out=tfplan -detailed-exitcode` (exit 0 = no changes, 1 = error, 2 = changes).
4. **Read it** - `tofu show tfplan`. Read the summary line `Plan: X to add, Y to change, Z to destroy.` and **every** resource marked destroy (`-`) or replace (`-/+`, "must be replaced"). Read forced-replacement reasons (`# forces replacement`).
5. **Show the user** - summary line, the list of destroys/replaces, the reason for each, the data at risk (disks, databases, volumes, floating IPs), and the exact apply command.
6. **Wait for the go** naming the plan.
7. **Apply that file** - `tofu apply tfplan`. A saved plan is applied without a prompt and accepts no extra planning options (the file carries the decisions).
8. **Verify** - `tofu plan -detailed-exitcode` again must return 0; check the real object (VM running, network reachable).

Never: apply from a plan produced before the code or the state changed (re-plan), apply a plan someone else produced without reading it, run `apply -auto-approve` outside a disposable lab, or `apply` without a file against shared infrastructure. A speculative `plan` without `-out` can differ from the final effect because other changes happen meanwhile - re-check the final plan.

Plan files contain resolved values, secrets included: keep them out of Git and artifacts shared widely; OpenTofu plan encryption (`state-backends-encryption.md`) protects stored plans.

## Destructive catalogue (each: ACTION / EFFECT / PROOF / WAIT-FOR-GO)

```
ACTION   tofu apply tfplan            (plan contains: proxmox_virtual_environment_vm.db -/+ must be replaced)
EFFECT   the VM and its local disks are destroyed, then created empty from the template; guest data is lost
PROOF    `tofu show tfplan` excerpt; last verified backup of the VM (devops-storage-backup); `# forces replacement` reason
WAITING  for your go
```

| Command | Exact effect | Required proof before proposing |
|---------|--------------|---------------------------------|
| `tofu destroy` (= `apply -destroy`) | Destroys every remote object in the state; `lifecycle.destroy = false` objects are forgotten and the command exits non-zero | `tofu plan -destroy -out=...` shown in full; backups; the environment name in the user's words |
| `apply` of a plan with destroy/replace | See the plan; replace = destroy then create (or create then destroy with `create_before_destroy`) | The reviewed plan file and backups |
| `-replace=ADDR` | Plans a replace of that instance even if config is unchanged; cannot combine with `-destroy` | Why the object is degraded; same checks as above |
| `-target=ADDR` / `-exclude=ADDR` / `-exclude-file` / `-target-file` | Limits the plan to (or away from) addresses and their dependencies/dependents; the rest of the config is NOT reconciled and state/config diverge. The docs reserve `-exclude` for exceptional cases (recovering from mistakes, tool limits) | State the reason; run a full plan afterwards |
| `-refresh=false` | Skips reading real objects; plan ignores external changes and can be wrong | Only for speed in a reviewed pipeline; never before a destroy |
| `apply -refresh-only` | Writes the real attributes into state (accepts drift) without changing infrastructure | Read the drift first; it may hide a manual change someone must revert |
| `state rm`, `state push`, `force-unlock`, `workspace delete -force` | See `state-surgery.md` | Backup file + proof |
| Deleting the state bucket/object, a DB schema, or a lock object | The state is gone; every resource becomes unmanaged; a lock file object (`use_lockfile`) removed by hand has the same effect as `force-unlock` | Versioned bucket + backup + proof nothing runs; never in a script |
| Removing a `prevent_destroy` line, or a resource block without a `removed` block | The next plan includes the destroy | Review the diff as a destroy request |

## Drift detection

```bash
tofu plan -refresh-only -detailed-exitcode     # exit 2 = real objects changed outside the tool; no changes proposed to infrastructure
tofu plan -detailed-exitcode                   # exit 2 = config differs from reality (drift or pending code)
```

Run it on a schedule per root module from a read-only identity; alert on exit 2 or 1. Resolve drift by one of: revert the manual change (apply the config), codify it (edit config), or accept it (`apply -refresh-only` after the user's go). Never "fix" drift by applying blindly.

## CI pointer (pipeline authoring is `devops-cicd`)

- Pull request: `fmt -check`, `validate`, `tflint`, config scan, `plan -out`; post the summary line and destroy/replace list as a comment.
- Merge to main: a protected environment requires a human approval, then applies **the same plan artifact** (store it encrypted, expire it).
- Credentials in CI: short-lived OIDC/JWT roles rather than static keys (the S3 backend docs recommend this); lock per state; never `-lock=false`.
- `-json-into=FILE` (OpenTofu 1.12) writes machine-readable output next to the normal log.

## Pitfalls

- Reading only the final count: a "1 to destroy" can be the production database.
- Trusting `# (known after apply)` for a name that forces a downstream replace.
- Provider upgrade and code change in one plan: bump providers in their own change (`layout-providers-lock.md`).

## Verification

```bash
tofu plan -out=tfplan -detailed-exitcode; echo "exit=$?"
tofu show -json tfplan | jq -r '.resource_changes[] | select(.change.actions != ["no-op"] and .change.actions != ["read"]) | "\(.change.actions|join(",")) \(.address)"'
```

## Sources

- https://opentofu.org/docs/cli/commands/plan/ , .../apply/ , .../destroy/ , .../state/ , .../force-unlock/
- https://opentofu.org/docs/language/settings/backends/s3/ (OIDC in CI) , https://opentofu.org/blog/opentofu-1-12-0/ (`-json-into`)

## Not verified

- The JSON plan layout (`resource_changes[].change.actions`) used in the `jq` line: confirm against `tofu show -json` output of the installed version.
- Exact wording of the "saved plan is stale" error and its conditions.
- Terraform equivalents of `-exclude`, `-target-file`, `-json-into`.
