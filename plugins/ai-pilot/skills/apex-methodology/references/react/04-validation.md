---
name: 04-validation
description: Verify React code quality with sniper agent
prev_step: references/react/03.5-elicit.md
next_step: references/react/05-review.md
---

# 04 - Validation (React/Vite)

**Verify React code quality with sniper agent (APEX Phase X).**

## Gate — Required Proof Artefacts

**Validation does NOT start** without both proofs for the current task, each carried by the agent REPORT or by its optional record under `docs/verify/` (slug from the git branch, per the `verification` skill — never under `.kimi-code/`, which is harness state):
- **eLicit** — the Step 5 report (techniques, verdicts, evidence, challenge verdict), or `docs/verify/elicit-<branch-slug>.json`.
- **Verify** — one evidence item per criterion + the challenge verdict, or `docs/verify/<branch-slug>.md`.

A claim made in context is not proof — only the reported evidence or the record is:

```bash
BRANCH=$(git branch --show-current)
if [ -n "$BRANCH" ]; then
  BRANCH_SLUG=$(printf '%s' "${BRANCH#*/}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')
else
  BRANCH_SLUG="detached-$(git rev-parse --short HEAD)"
fi
if [ -f "docs/verify/elicit-${BRANCH_SLUG}.json" ]; then
  echo "✅ eLicit record: docs/verify/elicit-${BRANCH_SLUG}.json"
else
  echo "ℹ️ No docs/verify/elicit-${BRANCH_SLUG}.json — the eLicit verdict must be in the agent REPORT. No such report → go back to references/react/03.5-elicit.md first."
fi
if [ -f "docs/verify/${BRANCH_SLUG}.md" ]; then
  echo "✅ Verify record: docs/verify/${BRANCH_SLUG}.md"
else
  echo "ℹ️ No docs/verify/${BRANCH_SLUG}.md — the Verify proof must be in the agent REPORT (evidence per criterion + challenge verdict). No such report → go back to the verification skill first."
fi
```

Only once both proofs are present does this phase proceed.

---

## When to Use

- After execution phase complete
- Before any code review
- After ANY code modification

---

## Launch sniper Agent

### 6-Phase Validation

```text
Phase 1: explore-codebase
-> Verify module structure
-> Check component organization

Phase 2: research-expert
-> Verify React 19 patterns
-> Check hook implementations

Phase 3: grep usages
-> Find all component references
-> Check for unused exports

Phase 4: run linters
-> ESLint/Biome
-> TypeScript strict mode
-> Prettier formatting

Phase 5: apply fixes
-> Auto-fix linter issues
-> Manual fixes for complex issues

Phase 6: ZERO errors
-> Must pass completely
-> No warnings ignored
```

### Fix Discipline (Hypothesis-Driven)

**Fix discipline (hypothesis-driven).** One candidate cause documented before any edit → one atomic change → retest immediately. If it still fails, the hypothesis was wrong: the same fix is FORBIDDEN — run a fresh research round (Context7 → Exa) for a new hypothesis. Cap: 3 cycles per error; at the 3rd failure STOP and escalate (`status: fail` + root-cause: what was tried, sources, why each failed). Never stack two unverified corrections. Canonical implementation: sniper's Fix Retry Loop.

---

## Validation Commands

### TypeScript Check

```bash
bun run tsc --noEmit
```

### ESLint/Biome

```bash
# ESLint
bun run lint
bun run lint --fix

# Biome
bun run biome check
bun run biome check --write
```

### Build Verification

```bash
bun run build
```

---

## React-Specific Checks

### Component Validation

```text
[ ] No inline types (use interfaces/)
[ ] Props destructured
[ ] JSDoc present
[ ] Presentation only (logic lives in hooks)
[ ] No business logic in JSX
```

### Hook Validation

```text
[ ] Starts with "use"
[ ] Hook stays focused (see FUSE_SOLID_MAX_LINES)
[ ] Single responsibility
[ ] Dependencies array correct
[ ] No stale closures
```

### File Structure

```text
[ ] All files within `FUSE_SOLID_MAX_LINES`
[ ] Interfaces in src/interfaces/
[ ] Hooks in src/hooks/
[ ] Components in components/
```

---

## Common React Errors

### Missing Dependencies

```typescript
// ESLint: react-hooks/exhaustive-deps
useEffect(() => {
  fetchUser(userId) // userId missing from deps
}, []) // Add userId

// Fix:
useEffect(() => {
  fetchUser(userId)
}, [userId])
```

### Type Errors

```typescript
// TS2322: Type 'undefined' is not assignable
const user = users.find(u => u.id === id)
user.name // Error: user might be undefined

// Fix: Optional chaining or guard
user?.name
// OR
if (!user) return null
```

### Import Errors

```typescript
// Cannot find module '@/modules/...'
// Check tsconfig.json paths:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Validation Report

```markdown
## Validation Results

### Linting
- ESLint: PASS (0 errors, 0 warnings)
- TypeScript: PASS (0 errors)
- Biome: PASS (formatted)

### File Checks
- All files within `FUSE_SOLID_MAX_LINES`: PASS
- Interfaces location: PASS
- Hooks separation: PASS

### Build
- vite build: SUCCESS
- Bundle size: [X] KB

### React Specific
- No inline types: PASS
- JSDoc coverage: PASS
- Hook rules: PASS
```

---

## Validation Checklist

```text
[ ] sniper agent launched
[ ] All 6 phases completed
[ ] ZERO linter errors
[ ] ZERO type errors
[ ] All files within `FUSE_SOLID_MAX_LINES` verified
[ ] Build successful
[ ] No React antipatterns
```

---

## Task Phase

Phase: `validation`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

---

## Next Phase

-> Proceed to `05-review.md` (self-review)
-> OR `07-add-test.md` (if tests needed first)
