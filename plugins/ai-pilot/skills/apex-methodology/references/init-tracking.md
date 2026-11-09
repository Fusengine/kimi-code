---
name: init-tracking
description: APEX task tracking at Step 0 — harness state, nothing for agents to write
---

# Step 0: Task Tracking

**`.kimi-code/apex/` is harness state and read-only for agents and the lead.** No APEX step creates, initializes or writes anything there — no `mkdir`, no `jq > task.json`.

## What to do at Step 0

1. **Lead** → open the task in its `TodoList` (the real task description) and move it at each phase (`pending` → `in_progress` → `done`). Kimi has no task-board sync: nothing writes `.kimi-code/apex/task.json` for you.
2. **Agents** → tracking lives in the agents' REPORTs (current phase, files touched, proof) and in `docs/decisions.md` for decisions that must outlive the session.

Reading `.kimi-code/apex/task.json` to know the current phase is fine; writing it is not.

## Proof artefacts (not under `.kimi-code/`)

The eLicit and Verify proofs live in the agent REPORT; their optional records go to `docs/verify/elicit-<branch-slug>.json` and `docs/verify/<branch-slug>.md` at the repo root. `<branch-slug>` follows the `verification` skill's derivation (`references/verify-template.md`): `git branch --show-current`, drop the `<type>/` prefix, lowercase, every character outside `a-z0-9` becomes `-`; detached HEAD → `detached-<short sha>`.

```bash
BRANCH=$(git branch --show-current)
if [ -n "$BRANCH" ]; then
  BRANCH_SLUG=$(printf '%s' "${BRANCH#*/}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')
else
  BRANCH_SLUG="detached-$(git rev-parse --short HEAD)"
fi
```

**The PreToolUse hooks will BLOCK Write/Edit until documentation is consulted** — consult it (Analyze phase); the harness records the consultation itself.
