---
name: 06-fix-issue
description: Handle React issues found during review or testing
prev_step: references/react/05-review.md
next_step: references/react/07-add-test.md
---

# 06 - Fix Issue (React/Vite)

**Handle React issues found during review or testing.**

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
| Type error | P1 | Fix before PR |
| Test failure | P1 | Fix before PR |
| Hook rule violation | P1 | Fix before PR |
| Review comment | P2 | Address in order |

---

## Common React Errors

### Hook Rules Violation

```typescript
// Error: React Hook is called conditionally
if (condition) {
  const [state, setState] = useState(0) // Invalid
}

// Fix: Move hook to top level
const [state, setState] = useState(0)
if (condition) {
  // use state here
}
```

### Missing Dependencies

```typescript
// Warning: useEffect has missing dependency
useEffect(() => {
  fetchData(userId)
}, []) // userId missing

// Fix: Add to dependencies
useEffect(() => {
  fetchData(userId)
}, [userId])

// OR: Use useCallback if function
const fetch = useCallback(() => {
  fetchData(userId)
}, [userId])
```

### Stale Closure

```typescript
// Bug: count always 0 in interval
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1) // Stale closure
  }, 1000)
  return () => clearInterval(id)
}, [])

// Fix: Use functional update
useEffect(() => {
  const id = setInterval(() => {
    setCount(prev => prev + 1)
  }, 1000)
  return () => clearInterval(id)
}, [])
```

### Type Errors

```typescript
// Error: Object is possibly undefined
const user = users.find(u => u.id === id)
return <span>{user.name}</span> // Error

// Fix: Guard or optional chaining
if (!user) return null
return <span>{user.name}</span>
// OR
return <span>{user?.name}</span>
```

---

## Fix Workflow

### Step 1: Understand

```text
1. Read error message completely
2. Identify affected component/hook
3. Understand root cause
4. Check React 19 docs if needed
```

### Step 2: Fix

```text
1. Make minimal change to fix
2. Follow same patterns as codebase
3. Keep files within `FUSE_SOLID_MAX_LINES`
4. Add regression test if applicable
```

### Step 3: Verify

```text
1. Run sniper agent again
2. Run affected tests
3. Test in browser
4. Check React DevTools
```

---

## Review Comment Fixes

### Common Requests

| Request | Action |
| --- | --- |
| "Extract hook" | Move logic to src/hooks/ |
| "Add types" | Create interface in src/interfaces/ |
| "Simplify" | Split component or extract logic |
| "Add loading" | Add loading state handling |
| "Add error" | Add error boundary or state |

### Example: Extract Hook

```typescript
// Before: Logic in component
function UserProfile({ id }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchUser(id).then(setUser).finally(() => setLoading(false))
  }, [id])
  return loading ? <Spinner /> : <Profile user={user} />
}

// After: Extracted hook
function UserProfile({ id }: Props) {
  const { user, loading } = useUser(id)
  return loading ? <Spinner /> : <Profile user={user} />
}
```

---

## Commit Fixes

This phase never runs `git commit` itself. Once the fix is verified, the lead hands it to agent `commit` in **WIP mode** (`mode: wip`: one conventional commit on the working branch — no bump, no push, no PR, no merge, no tag); an APEX sub-agent never launches it. Push/PR/merge/tag happen only at the end of the mandate, in full mode (`09-create-pr.md`). Never squash or rebase: a follow-up fix is its own commit.

Suggested messages, passed to the commit agent:

```text
# Validation fix
fix(UserCard): resolve missing dependency warning

# Review fix
refactor(auth): extract useAuth hook per review

# Test fix
test(Button): fix async assertion
```

---

## Escalation

**Attempt cap before escalation.** Diagnosis is hypothesis-driven: one candidate cause documented → one atomic fix → immediate retest. The same fix twice is forbidden; a new attempt needs a new hypothesis (fresh research first). After 3 failed cycles on the same issue, STOP and escalate with a root-cause note (what was tried, sources consulted, why each attempt failed) — do not keep trying or widen the scope to work around it. Canonical implementation: sniper's Fix Retry Loop.

---

## Fix Checklist

```text
[ ] Issue understood and reproduced
[ ] Root cause identified
[ ] Minimal fix implemented
[ ] Files still within `FUSE_SOLID_MAX_LINES`
[ ] sniper validation passes
[ ] All tests pass
[ ] Browser testing done
[ ] Ready for re-review
```

---

## Task Phase

Phase: `fix-issue`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

---

## Next Phase

-> Return to `04-validation.md` (verify fix)
-> Then `05-review.md` (re-review)
