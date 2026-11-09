---
name: 09-create-pr
description: Prepare the PR (pre-PR checks, title, body) and hand the release to the commit agent
prev_step: references/08-check-test.md
next_step: null
---

# 09 - Create PR

**Run the pre-PR checks, prepare the PR title and body, then hand the push / PR / CI / merge / tag to agent `commit` (full mode).** This phase never pushes, opens, merges or tags anything itself.

## When to Use

- After all validation passes (eLicit, Verify, sniper)
- After tests pass
- At the end of the mandate, when the work is ready to leave the working branch

---

## Pre-PR Checklist (run by the APEX agent)

```text
□ All commits are WIP commits made by the commit agent (conventional `type(scope):` messages)
□ sniper validation passes (zero errors)
□ All tests pass — run the project's test script, not a subset
□ Build succeeds — run the project's build script
□ Self-review completed
□ No console.logs/debug code
□ No TODO comments unaddressed
```

Run each check for real and paste the command + result in your REPORT; a check not run is reported "not verified".

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

Types:
- feat: New feature
- fix: Bug fix
- refactor: Code refactoring
- docs: Documentation
- test: Test additions
- chore: Maintenance
```

### Examples

```text
✅ feat(auth): add social login with Google
✅ fix(cart): resolve quantity update bug
✅ refactor(api): extract fetch utilities
✅ docs(readme): add setup instructions

❌ Update stuff
❌ WIP
❌ fix
```

---

## PR Body Template (handed to the commit agent)

```markdown
## Summary
<!-- 1-3 bullet points describing what this PR does -->
- Add user authentication with JWT
- Implement login/logout flows
- Add protected route wrapper

## Changes
### Added
- `src/hooks/useAuth.ts` - Authentication hook
- `src/components/LoginForm.tsx` - Login form component

### Modified
- `src/app/layout.tsx` - Add auth provider

### Removed
- None

## Related Issues
Closes #123
Related to #456

## Test Plan
- [ ] Login with valid credentials → redirects to dashboard
- [ ] Login with invalid credentials → shows error
- [ ] Logout → redirects to login page
- [ ] Access protected route without auth → redirects to login

## Screenshots
<!-- If UI changes, add before/after screenshots -->
| Before | After |
|--------|-------|
| ![before](url) | ![after](url) |

## Checklist
- [x] Tests added/updated
- [x] Documentation updated
- [x] Self-review completed
- [x] No breaking changes (or documented)
```

---

## PR Best Practices

### Size Guidelines

```text
✅ Small PRs (<400 lines changed)
   - Easier to review
   - Faster feedback
   - Lower risk

⚠️ Medium PRs (400-800 lines)
   - Split if possible
   - Detailed description needed

❌ Large PRs (>800 lines)
   - Split into smaller PRs
```

### Review-Friendly PRs

```text
✅ Single logical change
✅ Clear, descriptive title
✅ Thorough description
✅ Linked issues
✅ Test instructions
✅ Screenshots for UI
✅ Self-reviewed
```

---

## After the Hand-off

```text
□ Commit agent report read: PR URL, CI result, merge commit, tag (`git merge-base --is-ancestor vX.Y.Z main`)
□ Close related issues / update project board if the mandate asks
□ Report to the owner: merge/release announced, with the PR URL and tag
```

---

## Task Phase

Phase: `create-pr`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList` (`done` once the commit agent reports the merge); state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

---

## Workflow Complete

```text
APEX Workflow Summary:
00-init-branch    → Created feature branch
01-analyze-code   → Understood codebase
02-features-plan  → Planned implementation
03-execution      → Wrote code
04-validation     → Verified quality
05-review         → Self-reviewed
06-fix-issue      → Fixed any issues
07-add-test       → Added tests
08-check-test     → Verified tests pass
09-create-pr      → Checks green, handed off to the commit agent (PR, CI, merge, tag) ✅
```
