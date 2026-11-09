---
name: 09-create-pr
description: Run Laravel pre-PR checks, prepare a well-documented PR, hand the release to the commit agent
prev_step: references/laravel/08-check-test.md
next_step: null
---

# 09 - Create PR (Laravel)

**Run the Laravel pre-PR checks, prepare the PR title and body, then hand the push / PR / CI / merge / tag to agent `commit` (full mode).** This phase never pushes, opens, merges or tags anything itself.

## When to Use

- After all validation passes (eLicit, Verify, sniper)
- After self-review complete
- At the end of the mandate, when the feature is ready to leave the working branch

---

## Pre-PR Checks (run by the APEX agent)

```bash
composer quality && \
php artisan test
```

### Quality Gates

```text
[ ] Larastan level 8+ passes
[ ] Pint passes (no style issues)
[ ] All Pest tests pass
[ ] Coverage > 80%
[ ] All files within `FUSE_SOLID_MAX_LINES`
[ ] Self-review completed
```

### Code Readiness

```text
[ ] No debug code (dd, dump, ray)
[ ] No commented-out code
[ ] PHPDoc complete
[ ] Migrations reversible
[ ] Routes documented in api.php
```

Paste each command + result in your REPORT; a check not run is reported "not verified".

---

## Hand-off to the Commit Agent (end of mandate)

This phase never runs `git push`, `gh pr create`, `gh pr merge`, a rebase onto main, a force-push or a tag. Once the checks above are green and the Verify + sniper proofs are in the REPORT, the release goes to agent `commit` in **full mode** (template HARD STOP 1; rules `06-tooling-rules`, Git & GitHub Flow):

- It pushes the working branch, opens the PR, waits for CI, merges with a real `--merge` commit — never squash, which would orphan the release tag's bump commit — then tags post-merge (and deletes the merged branch) and watches the release run.
- The lead launches it at the end of the mandate and announces the merge/release in the report to the owner; an APEX sub-agent never launches it and never runs those commands itself.
- Brief it with: `mode: full`, the PR title and body below, and the files of the mandate.
- Blocked (merge conflict, secret in the diff) → it stops with `status: blocked`; CI red → `status: left-open`, `ci: failed:<check>`. Either way: fix through the APEX loop (`06-fix-issue.md`), re-run the checks, hand off again.
- Branch out of date with main → the commit agent's flow handles it; never rebase and force-push a shared branch yourself (force-push needs the owner).

---

## PR Title Convention

```text
<type>(<scope>): <description>
```

### Examples

```text
feat(posts): add Post CRUD API
fix(auth): resolve token expiration issue
refactor(users): extract UserService
docs(api): add OpenAPI documentation
test(orders): add integration tests
chore(deps): update Laravel to 12.5
```

---

## PR Body Template (handed to the commit agent)

```markdown
## Summary

Add complete CRUD API for blog posts with proper authorization.

## Changes

### Database
- Migration: `create_posts_table`
- Added `PostStatus` enum

### Models
- `Post` model with User relationship

### Services
- `PostService` (create, update, publish)

### API Endpoints
- `GET /api/v1/posts` - List posts
- `POST /api/v1/posts` - Create post
- `GET /api/v1/posts/{id}` - Show post
- `PUT /api/v1/posts/{id}` - Update post
- `DELETE /api/v1/posts/{id}` - Delete post
- `PostResource` for JSON transformation

### Tests
- 8 feature tests
- 3 unit tests
- Coverage: 87%

## Test Plan

- [ ] Run `composer quality`
- [ ] Test all API endpoints
- [ ] Verify migrations work
- [ ] Check authorization policies

## Breaking Changes

None / List any breaking changes

## Related Issues

Closes #123
```

---

## Reviewer Checklist

### For Reviewers to Check

```text
Code Quality:
[ ] declare(strict_types=1) present
[ ] Type hints complete
[ ] PHPDoc for complex methods
[ ] No business logic in controllers

Architecture:
[ ] SOLID principles followed
[ ] Interfaces in Contracts/
[ ] Services handle business logic
[ ] Files within `FUSE_SOLID_MAX_LINES`

Security:
[ ] Input validated via FormRequest
[ ] Authorization with Policies
[ ] No SQL injection risks
[ ] Sensitive data protected

Performance:
[ ] No N+1 queries
[ ] Eager loading used
[ ] Indexes on queried columns

Tests:
[ ] Feature tests present
[ ] Edge cases covered
[ ] Mocks used appropriately
```

### Respond to Feedback

```text
1. Address all comments through the APEX loop (06-fix-issue)
2. Fixes land as new WIP commits by the commit agent — never a force-push
3. Hand off again; the commit agent updates the PR
```

---

## After the Hand-off

```text
[ ] Commit agent report read: PR URL, CI result, merge commit, tag
[ ] Deployment checked if the mandate covers it (`php artisan about`, `php artisan migrate:status` on the target)
[ ] Report to the owner: merge/release announced, with the PR URL and tag
```

---

## PR Report Template

```markdown
## Ready for Hand-off

**Title:** feat(posts): add Post CRUD API
**Branch:** feature/123-post-crud

### Quality Status
- Larastan: PASS
- Pint: PASS
- Tests: 78/78 PASS
- Coverage: 87%

### Files Changed
- 12 files added
- 3 files modified
- 0 files deleted

### Next
Release handed to `commit` (full mode) by the lead — PR URL and tag in its report.
```

---

## Task Phase

Phase: `create-pr`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList` (`done` once the commit agent reports the merge); state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.
