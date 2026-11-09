# Artifact Contract

The eLicit verdict always travels in the agent REPORT (Step 5 report: mode,
techniques applied with verdict + evidence, corrections, challenge verdict).
When it must survive the session (long mandate, several agents, a later pass
expected), Step 5 also writes `docs/verify/elicit-<branch-slug>.json`: a list
of `{technique_id, verdict, correction_applied, evidence}` per technique
applied. A later elicitation pass loads this file first (Step 0) and
**diffs against it** instead of re-deriving technique selection from
scratch -- only re-apply techniques that were `fail`/`deferred` or are
newly relevant. See `steps/step-05-report.md` for the exact JSON schema and
`steps/step-00-init.md` for the load/diff logic.

`<branch-slug>`: the same rule as the `verification` skill
(`verification/references/verify-template.md`) -- `git branch --show-current`,
drop the `<type>/` prefix, lowercase, every character outside `a-z0-9`
becomes `-`; detached HEAD → `detached-<short sha>`. Do not improvise another
derivation: `feat/use-harness` slugifies to `use-harness`, not
`feat-use-harness` -- a mismatched slug means the gate never finds the file.

```bash
BRANCH=$(git branch --show-current)
if [ -n "$BRANCH" ]; then
  BRANCH_SLUG=$(printf '%s' "${BRANCH#*/}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')
else
  BRANCH_SLUG="detached-$(git rev-parse --short HEAD)"
fi
mkdir -p docs/verify
# Step 5 writes docs/verify/elicit-${BRANCH_SLUG}.json
```

The Verify proof is a sibling artifact: REPORT first, optional record at
`docs/verify/<branch-slug>.md`.

Optional per-repo tuning of which techniques apply: `references/elicit-profile.md`.
