---
name: 09-create-pr
description: Run React pre-PR checks, prepare the PR, hand the release to the commit agent
prev_step: references/react/08-check-test.md
next_step: null
---

# 09 - Create PR (React/Vite)

**Run the React pre-PR checks, prepare the PR title and body, then hand the push / PR / CI / merge / tag to agent `commit` (full mode).** This phase never pushes, opens, merges or tags anything itself.

## When to Use

- After all validation passes (eLicit, Verify, sniper)
- After tests pass
- At the end of the mandate, when the work is ready to leave the working branch

---

## Pre-PR Checks (run by the APEX agent)

```bash
bun run tsc --noEmit && \
bun run lint && \
bun run test && \
bun run build
```

```text
[ ] sniper validation passes
[ ] All tests pass (bun run test)
[ ] Build succeeds (bun run build)
[ ] TypeScript clean (bun run tsc --noEmit)
[ ] No console.log/debug code
[ ] Self-review completed
```

Paste each command + result in your REPORT; a check not run is reported "not verified".

### Common Failures (fix before the hand-off)

| Failure | Fix |
| --- | --- |
| TypeScript error | Fix types locally |
| ESLint error | Run lint --fix |
| Test failure | Debug with --ui |
| Build failure | Check imports/exports |

---

## Hand-off to the Commit Agent (end of mandate)

This phase never runs `git push`, `gh pr create`, `gh pr merge`, a rebase onto main, a force-push or a tag. Once the checks above are green and the Verify + sniper proofs are in the REPORT, the release goes to agent `commit` in **full mode** (template HARD STOP 1; rules `06-tooling-rules`, Git & GitHub Flow):

- It pushes the working branch, opens the PR, waits for CI, merges with a real `--merge` commit — never squash, which would orphan the release tag's bump commit — then tags post-merge and watches the release run.
- The lead launches it at the end of the mandate and announces the merge/release in the report to the owner; an APEX sub-agent never launches it and never runs those commands itself.
- Brief it with: `mode: full`, the PR title and body below, and the files of the mandate.
- Blocked (merge conflict, secret in the diff) → it stops with `status: blocked`; CI red → `status: left-open`, `ci: failed:<check>`. Either way: fix through the APEX loop (`06-fix-issue.md`), re-run the checks, hand off again.
- Branch out of date with main → the commit agent's flow handles it; never rebase and force-push a shared branch yourself (force-push needs the owner).

---

## PR Title Format

```text
<type>(<scope>): <description>

Examples:
feat(UserCard): add user profile display component
fix(useAuth): resolve token refresh race condition
refactor(forms): extract validation to custom hook
ui(Button): add loading state variant
test(UserProfile): add integration tests
```

---

## PR Body Template (handed to the commit agent)

```markdown
## Summary
- Add UserCard component with edit functionality
- Create useUser hook for data fetching
- Add comprehensive test coverage

## Changes

### Added
- `modules/users/components/UserCard.tsx` - User display component
- `modules/users/src/hooks/useUser.ts` - User data hook
- `modules/users/src/interfaces/user.interface.ts` - Type definitions

### Modified
- `modules/users/components/UserList.tsx` - Use new UserCard

## Technical Details
- Uses React 19 patterns (no forwardRef needed)
- TanStack Query integration for caching
- Optimistic updates for edit actions

## Related Issues
Closes #123

## Test Plan
- [ ] UserCard renders user information
- [ ] Edit button triggers callback
- [ ] Loading state displays correctly
- [ ] Error state handled gracefully

## Screenshots
| Before | After |
|--------|-------|
| N/A | ![UserCard](url) |

## Checklist
- [x] Tests added (hooks + components)
- [x] All files within `FUSE_SOLID_MAX_LINES`
- [x] Interfaces in src/interfaces/
- [x] JSDoc on exports
- [x] No React antipatterns
```

---

## PR Best Practices (React)

### Size Guidelines

```text
Ideal React PR:
- 1-3 components
- 1-2 hooks
- Associated tests
- <400 lines total

Split if:
- Multiple unrelated features
- >800 lines
- Multiple module changes
```

### Review-Friendly

```text
- Clear component boundaries
- Hooks tested separately
- Types documented
- Screenshots for UI changes
- Storybook link if available
```

---

## After the Hand-off

```text
[ ] Commit agent report read: PR URL, CI result, merge commit, tag
[ ] Report to the owner: merge/release announced, with the PR URL and tag
```

---

## Task Phase

Phase: `create-pr`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList` (`done` once the commit agent reports the merge); state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

---

## APEX Workflow Complete

```text
00-init-branch    -> Created feature branch
01-analyze-code   -> Understood React codebase
02-features-plan  -> Planned components/hooks
03-execution      -> Wrote React 19 code
04-validation     -> Verified with sniper
05-review         -> Self-reviewed patterns
06-fix-issue      -> Fixed any issues
07-add-test       -> Added Vitest tests
08-check-test     -> Verified tests pass
09-create-pr      -> Checks green, handed off to the commit agent (PR, CI, merge, tag)
```
