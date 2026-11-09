# Verification Artifact Template

The proof always goes in the agent's REPORT to the lead. When it must also
survive the session (long mandate, several agents, owner asked for a record),
write this file to `docs/verify/<branch-slug>.md` in Step 6.

`<branch-slug>`: from the git branch only -- `git branch --show-current`, drop
the `<type>/` prefix, lowercase, every character outside `a-z0-9` becomes `-`.
A branch like `feat/use-harness` slugifies to `use-harness`, not
`feat-use-harness`. Detached HEAD: `detached-<short sha from git rev-parse --short HEAD>`.

---

## Template

```markdown
# Verification: <branch-slug>

**Date**: {ISO-8601 UTC}
**Original request**: {one-line summary}

## Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | {criterion} | ✅/❌ | {command output, log excerpt, screenshot path, or diff} |
| 2 | {criterion} | ✅/❌ | {evidence} |

## Regression Check

- [ ] Full test suite passed -- {command + result summary}
- [ ] No new lint/type errors -- {evidence}
- [ ] No unrelated files modified -- {file list reviewed}

## Side Effects

- [ ] All modified files reviewed individually
- [ ] No debug code / secrets left behind

## Verdict

**FUNCTIONALLY RESOLVED** -- summary of evidence
or
**UNRESOLVED** -- {remaining items, blocking reason}
```

---

## Rules

- One evidence entry per criterion. "It works" is not evidence -- paste the
  actual command output or excerpt.
- If a criterion cannot be verified (no test harness, no way to reproduce),
  say so explicitly under Verdict instead of marking it ✅.
- When written, this file lets eXamine (sniper) and any later elicitation pass
  avoid re-deriving verification state from scratch.
