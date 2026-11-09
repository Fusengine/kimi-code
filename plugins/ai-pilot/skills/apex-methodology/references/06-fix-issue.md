---
name: 06-fix-issue
description: Handle issues found during review or testing
prev_step: references/05-review.md
next_step: references/07-add-test.md
---

# 06 - Fix Issue

**Handle issues found during review or testing.**

## When to Use

- When validation finds errors
- When tests fail
- When reviewer requests changes
- When bugs are discovered

---

## Issue Triage

### Classify Issue

| Type | Priority | Action |
| --- | --- | --- |
| Build failure | P0 | Fix immediately |
| Test failure | P1 | Fix before PR |
| Linter error | P1 | Fix before PR |
| Type error | P1 | Fix before PR |
| Review comment | P2 | Address in order |
| Enhancement | P3 | Evaluate scope |

---

## Fix Workflow

### Step 1: Understand

```text
1. Read error message completely
2. Identify affected file(s)
3. Understand root cause
4. Check if related to your changes
```

### Step 2: Isolate

```text
1. Can you reproduce locally?
2. Is it a new issue or existing?
3. What's the minimal reproduction?
4. Does reverting your change fix it?
```

### Step 3: Fix

```text
1. Make minimal change to fix
2. Don't introduce new features
3. Follow same code standards
4. Add regression test if applicable
```

### Step 4: Verify

```text
1. Run sniper agent again
2. Run affected tests
3. Build locally
4. Test the specific scenario
```

---

## Common Issues

### Build Failures

```text
Error: Property/method does not exist

Fixes:
- Add property to interface
- Use optional access (?. or equivalent)
- Add type guard/check
```

### Test Failures

```text
Error: Assertion failed
Expected: "value"
Received: undefined

Fixes:
- Check mock setup
- Verify test data
- Check async handling
```

### Linter Errors

```text
Error: Variable defined but never used

Fixes:
- Delete unused imports/variables
- Remove dead code
- Prefix with _ if intentional
```

### Type Errors

```text
Error: Type mismatch

Fixes:
- Fix source type
- Add proper type annotation
- Use type casting if safe
```

---

## Review Comments

### Handling Feedback

```text
For each comment:

1. READ: Understand the concern
2. AGREE/DISCUSS: Valid point or misunderstanding?
3. FIX: Implement if valid
4. RESPOND: Explain what you did

Response formats:
✅ "Done" - Fixed as requested
💬 "Good point, fixed with [approach]"
❓ "Could you clarify...?" - Need more info
🤔 "I chose X because..." - Explain reasoning
```

### Common Review Requests

| Request | Action |
| --- | --- |
| "Add tests" | Write unit/integration tests |
| "Add docs" | Add documentation comments |
| "Simplify" | Refactor for clarity |
| "Extract" | Move to separate function/file |
| "Rename" | Use clearer naming |
| "Handle error" | Add try/catch/validation |

---

## Regression Prevention

### Before Fixing

```text
1. Write failing test for the bug
2. Fix the bug
3. Verify test passes
4. Ensure no other tests break
```

### Test Structure

```text
describe: Bug fix: [description]
  it: should [expected behavior]

    // Arrange: Set up conditions that caused bug
    // Act: Perform the action
    // Assert: Verify correct behavior
```

---

## Commit Fixes

### Hand-off to the Commit Agent (after each verified fix)

This phase never runs `git commit` itself. Once the fix is verified (checks re-run green, proofs in the REPORT), the commit goes to agent `commit` in **WIP mode** (template HARD STOP 1; rules `06-tooling-rules`, Git & GitHub Flow):

- It makes one conventional commit on the working branch — no bump, no CHANGELOG, no push, no PR, no merge, no tag.
- The lead launches it after each verified task; an APEX sub-agent never launches it and never runs `git commit` itself.
- Brief it with: `mode: wip`, a suggested conventional message (examples below), and the files of the fix.
- Push, PR, merge and tag happen only at the end of the mandate, in **full mode** (`09-create-pr.md`, "Hand-off to the Commit Agent").

### Suggested Messages (passed to the commit agent)

```text
# Validation fix
fix(scope): resolve linter error in Component

# Review fix
fix(scope): address review feedback on validation

# Test fix
test(scope): fix flaky test in auth module
```

### History

Never squash or rebase: a follow-up fix is its own commit, with its own conventional message. The end-of-mandate merge is a real `--merge`, so every fix commit stays readable in history.

---

## Escalation

**Attempt cap before escalation.** Diagnosis is hypothesis-driven: one candidate cause documented → one atomic fix → immediate retest. The same fix twice is forbidden; a new attempt needs a new hypothesis (fresh research first). After 3 failed cycles on the same issue, STOP and escalate with a root-cause note (what was tried, sources consulted, why each attempt failed) — do not keep trying or widen the scope to work around it. Canonical implementation: sniper's Fix Retry Loop.

### When to Ask for Help

```text
□ Bug cause is unclear after investigation
□ Fix would require significant changes
□ Fix affects other team's code
□ Security implications
□ Unsure about correct approach
```

### How to Ask

```markdown
## Issue: [Brief description]

### What I tried
1. [Approach 1] - Result: [outcome]
2. [Approach 2] - Result: [outcome]

### What I think is happening
[Your hypothesis]

### Questions
1. [Specific question]
2. [Specific question]
```

---

## Fix Checklist

```text
□ Issue understood and reproduced
□ Root cause identified
□ Minimal fix implemented
□ Regression test added (if applicable)
□ sniper validation passes
□ All tests pass
□ Build succeeds
□ Ready for re-review
```

---

## Task Phase

Phase: `fix-issue`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

---

## Next Phase

→ Return to `04-validation.md` (verify fix)
→ Then `05-review.md` (re-review)
