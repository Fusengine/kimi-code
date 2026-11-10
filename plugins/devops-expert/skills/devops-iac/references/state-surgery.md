---
name: state-surgery
description: Changing what state tracks without destroying infrastructure - import, moved and removed blocks, state mv/rm/push, force-unlock, with exact effects and backups
when-to-use: Renaming or moving a resource, adopting existing infrastructure, forgetting an object, recovering from a lock or a broken state
keywords: import block, moved block, removed block, lifecycle destroy false, state mv, state rm, state push, force-unlock, workspace delete
priority: critical
related: state-backends-encryption.md, plan-apply-protocol.md, modules-variables.md
---

# State surgery

**Load when:** the config and the state disagree about names, ownership or existence. Order of preference: **declarative blocks reviewed in a plan** > CLI state commands > `state push`.

## Rule 0 - backup before anything

```bash
tofu state pull > "backup-$(date +%F-%H%M).tfstate"     # keep it outside the repo
tofu state list > state-list-before.txt
```

Bucket versioning is the second net. With encryption on, the key is part of the backup (`state-backends-encryption.md`).

## Declarative blocks (preferred)

| Need | Block | Effect |
|------|-------|--------|
| Rename a resource/module, add `count`/`for_each` | `moved { from = a  to = b }` | Before planning, the object at `from` is re-bound to `to`; no destroy. New environments without `from` ignore it. Not usable with `ephemeral` blocks |
| Adopt an existing object | `import { to = ADDR  id = "..." }` (or `identity = {...}` where the resource type has an identity schema) | Plan shows the import; apply writes it to state. The `resource` block must exist (or `-generate-config-out`, experimental) |
| Forget an object, keep it running | `removed { from = ADDR  lifecycle { destroy = false } }` | State entry removed at apply; remote object untouched. `from` cannot carry an instance key. OpenTofu warns if `lifecycle` is missing |
| Keep a resource in config but never destroy it | `lifecycle { destroy = false }` (OpenTofu 1.12) | `destroy` and replace plans "forget" it instead; persisted in state; `tofu destroy` exits non-zero when something was forgotten (`-suppress-forget-errors` silences) |
| Block destruction | `lifecycle { prevent_destroy = true }` (dynamic in 1.12) | Any plan that destroys it errors |

Template: [templates/import-moved-removed.tf](templates/import-moved-removed.tf). Procedure: add the block, `plan -out`, confirm the plan says "will be imported/moved/forgotten" and **zero** unrelated create/destroy, show it, apply the saved plan after the go. Keep `moved` blocks for as long as any consumer's state may still hold the old address.

## CLI state commands (each is a proposal)

```
ACTION   tofu state mv 'proxmox_virtual_environment_vm.web' 'module.web.proxmox_virtual_environment_vm.this'
EFFECT   rebinds the existing VM to the new address in state only; if the config is not changed to match,
         the next plan destroys the VM at one address and creates it at the other
PROOF    backup file exists; `tofu state mv -dry-run` output; plan after the move shows no changes
WAITING  for your go
```

| Command | Exact effect | Guard |
|---------|--------------|-------|
| `tofu state mv [-dry-run] SRC DST` | Re-associates the remote object with a new address of the same kind and type | Tell collaborators: a plan between your code change and the move destroys and recreates |
| `tofu state rm [-dry-run] ADDR...` | State forgets the object; it keeps running; the next plan proposes to create a new one, which can fail on name conflicts | `-dry-run` first; prefer a `removed` block (reviewable) |
| `tofu import ADDR ID` / `import` block | Binds an existing object to a resource address | Run the plan afterwards; a non-empty diff means config drift to resolve before apply |
| `tofu state pull` / `state push [-force] FILE` | Read / overwrite the whole remote state. `push` refuses a different lineage or a lower serial; `-force` disables both checks and **overwrites the destination** | Only to restore a backup; never `-force` without the backup of the current remote state |
| `tofu force-unlock [-force] LOCK_ID` | Removes the backend lock without touching infrastructure; if the holder is alive, two writers can corrupt state | Prove the holder died (CI job gone, host destroyed); `pg` backend does not support it |
| `tofu workspace delete -force NAME` | Deletes a workspace that still tracks resources: they become dangling, running but unmanaged | Without `-force` it refuses; run `state list` in it first |
| `tofu state replace-provider` | Rewrites the provider address in state | Required when moving between provider namespaces; read the command page first |
| `-lock=false` (any state command) | Skips the lock | Never when others can run concurrently |

## Pitfalls

- A resource deleted from config with no `removed` block is destroyed at the next apply.
- Re-adding a forgotten resource at the same address makes the tool try to create it (conflict) - import it instead.
- `moved` across modules needs both module addresses; test with `plan` before sharing.
- `import` with the legacy `id` string differs per resource type: read the provider's Import section, do not guess the format (for Proxmox VMs and OpenStack resources see the provider references).

## Verification

```bash
tofu plan -out=tfplan -detailed-exitcode        # after surgery: exit 0 (no changes) is the goal
tofu state list | diff - state-list-before.txt   # only the intended addresses changed
```

## Sources

- https://opentofu.org/docs/language/modules/develop/refactoring/ , https://opentofu.org/docs/language/import/
- https://opentofu.org/docs/language/resources/syntax/ (removed block) , https://opentofu.org/docs/language/resources/behavior/
- https://opentofu.org/docs/cli/commands/state/rm/ , .../state/mv/ , .../state/push/ , .../force-unlock/ , .../destroy/ , .../workspace/delete/
- https://opentofu.org/docs/cli/state/recover/

## Not verified

- Terraform's `removed` block and `import` `identity` support versions; the Terraform equivalents of `lifecycle { destroy = false }`.
- Exact `tofu state replace-provider` and `tofu import` flags (not fetched).
