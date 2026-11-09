---
description: Quick Flow for simple fixes - Single expert handles explore, code, review, and validate in one pass. Inspired by BMAD Barry.
argument-hint: "<fix description>"
---

# APEX Quick Flow

Fast-track workflow for a trivial 1-3 line change (typo, one-line bug fix, config value). No multi-agent orchestration: the lead spawns ONE domain-expert agent that edits; the main session never edits inline. It skips Brainstorm, the Analyze trio and the task split — never eLicit, the functional check, or sniper.

---

## When to Use

✅ **Use APEX Quick (trivial 1-3 line change only):**
- Typo fixes
- Single-line bug fixes
- A local rename touching 1-3 lines
- A one-value UI tweak (text, class, token)
- A config value change
- A short documentation fix

❌ **Use Full APEX instead:**
- New features
- Multi-file changes
- Security-related code
- Database migrations
- API changes

---

## Quick Flow Workflow

```
┌─────────────────────────────────────────────────────────┐
│             APEX QUICK (Single Pass)                    │
│                                                         │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌────────┐ │
│  │ LOCATE  │ → │  FIX    │ → │ REVIEW  │ → │ VERIFY │ │
│  └─────────┘   └─────────┘   └─────────┘   └────────┘ │
│      │             │             │             │       │
│      ▼             ▼             ▼             ▼       │
│   Find file     Apply        1 quick      Run tests   │
│   + line        minimal      technique    or run it   │
│                 change                                 │
└─────────────────────────────────────────────────────────┘
```

**Total: 4 steps, 1 expert, no handoffs**

---

## Execution

### Step 1: LOCATE

```
Expert does quick search:
- Grep for relevant code
- Read the file
- Identify exact location
```

### Step 2: FIX

```
Expert applies minimal change:
- Only change what's necessary
- Preserve existing style
- No refactoring scope creep
```

### Step 3: REVIEW (Auto-Elicit)

```
Expert applies 1 quick technique based on fix type:

| Fix Type | Quick Technique |
|----------|-----------------|
| Bug fix  | TEST-01 (Edge cases) |
| Typo     | DOC-03 (Consistency) |
| Style    | MAINT-02 (Convention) |
| Security | SEC-02 (Validation) |
| Config   | DATA-01 (Schema) |
```

### Step 4: VERIFY

```
Real functional check (executed, never linter-only):
- Run the tests covering the changed code, or run the build / the
  program / the page and observe the corrected behaviour
- Report the command + its output (or screenshot path) as proof
- Linter / type check on the changed file(s) too, but they are not the proof
```

Then the main session verifies on disk and runs sniper (full, never skipped).

---

## Example Usage

```bash
/apex-quick Fix typo in login button text
```

**Expert executes:**
```
1. LOCATE: Grep "login" → Found LoginButton.tsx:23
2. FIX: Change "Logi" → "Login"
3. REVIEW: DOC-03 check → OK
4. VERIFY: bun test LoginButton → pass; rendered button reads "Login"

✅ Done in single pass
```

---

## Comparison

| Aspect | APEX Full | APEX Quick |
|--------|-----------|------------|
| Agents | 3+ parallel | 1 expert |
| Phases | 4-5 (A-P-E-L-X) | 4 (Locate-Fix-Review-Verify) |
| TaskCreate | Yes | No |
| Verify | Full verification skill | Real functional check (tests or run) |
| Sniper | Full | Full (run by the main session) |
| Use case | Features, refactoring | Fixes, typos |

---

## Quick Flow Rules

### DO:
- ✅ Use for a trivial 1-3 line change; anything larger → full APEX
- ✅ Single file preferred
- ✅ Quick self-review
- ✅ Immediate verification

### DON'T:
- ❌ Add features while fixing
- ❌ Refactor surrounding code
- ❌ Skip the review step
- ❌ Use for security changes

---

## Output Format

```markdown
## ⚡ APEX Quick Complete

**Task**: {description}
**File**: {file_path}:{line}
**Change**: {summary}

### Quick Review
- Technique: {technique_id}
- Result: ✅ OK

### Verification
- Functional check: {command run} → {observed output}
- Linter / types: ✅ 0 errors

**Status**: ✅ Fixed
```

---

## Arguments

- `$ARGUMENTS`: Description of the fix to apply

**Examples:**
- `/apex-quick Fix typo in header`
- `/apex-quick Rename getUserData to fetchUser`
- `/apex-quick Update copyright year to 2025`
- `/apex-quick Fix missing null check in handler`
