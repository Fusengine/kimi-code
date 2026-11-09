---
name: 09-create-pr
description: Run Next.js pre-PR checks, prepare the PR, hand the release to the commit agent
prev_step: references/nextjs/08-check-test.md
next_step: null
---

# 09 - Create PR (Next.js)

**Run the Next.js pre-PR checks, prepare the PR title and body, then hand the push / PR / CI / merge / tag to agent `commit` (full mode).** This phase never pushes, opens, merges or tags anything itself.

## When to Use

- After all validation passes (eLicit, Verify, sniper)
- After tests pass
- At the end of the mandate, when the work is ready to leave the working branch

---

## Pre-PR Checks (run by the APEX agent)

```bash
pnpm tsc --noEmit && \
pnpm eslint . && \
pnpm build && \
pnpm test --run
```

```text
[ ] tsc --noEmit passes
[ ] eslint passes
[ ] pnpm build succeeds
[ ] All tests pass (+ pnpm test:e2e when the change touches a user flow)
[ ] Self-review completed
[ ] No console.logs/debug code
[ ] No TODO comments unaddressed
```

Paste each command + result in your REPORT; a check not run is reported "not verified".

---

## Hand-off to the Commit Agent (end of mandate)

This phase never runs `git push`, `gh pr create`, `gh pr merge`, a rebase onto main, a force-push or a tag. Once the checks above are green and the Verify + sniper proofs are in the REPORT, the release goes to agent `commit` in **full mode** (template HARD STOP 1; rules `06-tooling-rules`, Git & GitHub Flow):

- It pushes the working branch, opens the PR, waits for CI, merges with a real `--merge` commit — never squash, which would orphan the release tag's bump commit — then tags post-merge and watches the release run.
- The lead launches it at the end of the mandate and announces the merge/release in the report to the owner; an APEX sub-agent never launches it and never runs those commands itself.
- Brief it with: `mode: full`, the PR title and body below (with the build output), and the files of the mandate.
- Blocked (merge conflict, secret in the diff) → it stops with `status: blocked`; CI red → `status: left-open`, `ci: failed:<check>`. Either way: fix through the APEX loop (`06-fix-issue.md`), re-run the checks, hand off again.
- Branch out of date with main → the commit agent's flow handles it; never rebase and force-push a shared branch yourself (force-push needs the owner).

---

## PR Title Format

```text
<type>(<scope>): <description>

Types:
- feat: New feature (route, component, API)
- fix: Bug fix
- refactor: Code refactoring (RSC migration)
- perf: Performance improvement
- docs: Documentation
- test: Test additions
```

### Next.js Examples

```text
feat(auth): add Better Auth login flow
fix(hydration): resolve client-server mismatch on dates
refactor(users): migrate to Server Components
perf(images): implement next/image lazy loading
feat(api): add user CRUD endpoints
```

---

## PR Body Template (handed to the commit agent)

```markdown
## Summary
- Add user authentication with Better Auth
- Implement Server Actions for form handling
- Add protected route middleware

## Changes
### Added
- `modules/auth/` - Authentication module
- `app/(auth)/login/page.tsx` - Login page
- `proxy.ts` - Auth proxy (Next.js 16)

### Modified
- `app/layout.tsx` - Add SessionProvider

## Architecture Decisions
- Used Server Actions instead of API routes for form mutations
- Separated Server/Client components for optimal hydration

## Related Issues
Closes #123
Related to #456

## Test Plan
- [ ] Login with valid credentials - redirects to dashboard
- [ ] Login with invalid credentials - shows error
- [ ] Access protected route without auth - redirects to login
- [ ] Logout - clears session, redirects to home

## Checklist
- [x] TypeScript strict mode passes
- [x] ESLint passes (no errors/warnings)
- [x] Build succeeds
- [x] Unit tests added (Vitest)
- [x] E2E tests added (Playwright)
- [x] Documentation updated
- [x] No breaking changes
```

---

## Next.js Specific Checks

### Build Output in the PR Body

```text
Include, from the real `pnpm build` output:
- Bundle size impact
- New routes added
- Rendering strategy (SSG/SSR/ISR)
```

```markdown
## Build Output
Route (app)                    Size     First Load JS
+ /(auth)/login (dynamic)      2.1 kB   89.3 kB
+ /dashboard (dynamic)         1.8 kB   88.9 kB

First Load JS increased by: +3.9 kB (acceptable)
```

---

## PR Best Practices

### Size Guidelines

```text
Small PRs (<400 lines changed):
- Easier to review
- Faster feedback
- Lower risk

For larger features, split into several mandates/PRs:
- First: interfaces/types
- Second: services
- Third: components
- Fourth: integration
```

### Review-Friendly

```text
[ ] Single logical change per PR
[ ] Clear title and description
[ ] Screenshots for UI changes
[ ] Test instructions provided
[ ] Self-reviewed first
```

---

## After the Hand-off

```text
[ ] Commit agent report read: PR URL, CI result, merge commit, tag
[ ] Close related issues / update project board if the mandate asks
[ ] Vercel preview/production checked if the mandate covers deploy
[ ] Report to the owner: merge/release announced, with the PR URL and tag
```

---

## Task Phase

Phase: `create-pr`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList` (`done` once the commit agent reports the merge); state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

---

## APEX Workflow Complete

```text
00-init-branch    - Created feature branch
01-analyze-code   - Understood Next.js codebase
02-features-plan  - Planned routes, components, actions
03-execution      - Implemented with SOLID principles
04-validation     - Verified with sniper (tsc, eslint, build)
05-review         - Self-reviewed Server/Client patterns
06-fix-issue      - Fixed any issues found
07-add-test       - Added Vitest/Playwright tests
08-check-test     - Verified all tests pass
09-create-pr      - Checks green, handed off to the commit agent (PR, CI, merge, tag)
```
