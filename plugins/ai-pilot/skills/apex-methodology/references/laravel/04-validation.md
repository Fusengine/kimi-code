---
name: 04-validation
description: Verify code quality with Larastan, Pint, Pest
prev_step: references/laravel/03.5-elicit.md
next_step: references/laravel/05-review.md
---

# 04 - Validation (Laravel)

**Verify code quality with Larastan, Pint, Pest (APEX Phase X).**

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
  echo "ℹ️ No docs/verify/elicit-${BRANCH_SLUG}.json — the eLicit verdict must be in the agent REPORT. No such report → go back to references/laravel/03.5-elicit.md first."
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

## Quality Tools Stack

### Required Tools

```bash
# Install quality tools
composer require --dev larastan/larastan
composer require --dev laravel/pint
composer require --dev pestphp/pest pestphp/pest-plugin-laravel
```

---

## Larastan (Static Analysis)

### Configuration (phpstan.neon)

```neon
includes:
    - vendor/larastan/larastan/extension.neon

parameters:
    paths:
        - app/
    level: 8
    treatPhpDocTypesAsCertain: true
    reportMaybes: true
```

### Run Analysis

```bash
./vendor/bin/phpstan analyse

# With memory limit
./vendor/bin/phpstan analyse --memory-limit=2G

# Specific path
./vendor/bin/phpstan analyse app/Services/
```

### Levels Guide

| Level | Checks |
| --- | --- |
| 0-4 | Basic type checks |
| 5-6 | Generic types, return types |
| 7 | Union types, partial checks |
| 8 | Strict null checks |
| 9 | Maximum strictness |

### Common Fixes

```php
// Error: Cannot call method on null
// Fix: Add null check
if ($user !== null) {
    $user->notify();
}

// Error: Return type mismatch
// Fix: Add proper return type
public function find(int $id): ?User
{
    return User::find($id);
}
```

---

## Pint (Code Style)

### Check Without Fixing

```bash
./vendor/bin/pint --test
```

### Fix Code Style

```bash
./vendor/bin/pint

# Specific directory
./vendor/bin/pint app/Services/

# Parallel mode (faster)
./vendor/bin/pint --parallel
```

### Configuration (pint.json)

```json
{
    "preset": "laravel",
    "rules": {
        "declare_strict_types": true,
        "final_class": true,
        "void_return": true
    }
}
```

---

## Pest (Testing)

### Run All Tests

```bash
php artisan test

# Or directly with Pest
./vendor/bin/pest
```

### Run Specific Tests

```bash
# By file
./vendor/bin/pest tests/Feature/PostControllerTest.php

# By name
./vendor/bin/pest --filter="create post"

# By group
./vendor/bin/pest --group=api
```

### Architecture Tests

```php
arch('app')
    ->expect('App\Services')
    ->toHaveSuffix('Service')
    ->toBeClasses();

arch('controllers')
    ->expect('App\Http\Controllers')
    ->toHaveSuffix('Controller')
    ->toExtend('App\Http\Controllers\Controller');
```

---

## Combined Validation Script

### composer.json scripts

```json
{
    "scripts": {
        "lint": "./vendor/bin/pint --test",
        "analyse": "./vendor/bin/phpstan analyse",
        "test": "./vendor/bin/pest",
        "quality": [
            "@lint",
            "@analyse",
            "@test"
        ]
    }
}
```

### Run All Checks

```bash
composer quality
```

---

## File Structure Validation

### Check File Lines

```bash
# Find files over FUSE_SOLID_MAX_LINES
find app -name "*.php" -exec wc -l {} + | awk -v max="${FUSE_SOLID_MAX_LINES:-100}" '$1 > max'
```

### Verify Structure

```text
[ ] All files within `FUSE_SOLID_MAX_LINES`
[ ] Interfaces in Contracts/
[ ] Services in Services/
[ ] DTOs in DTOs/
[ ] No business logic in Controllers
```

---

## Common Issues & Fixes

### Type Errors

```php
// Error: Argument of type string|null
// Fix: Add null coalescing
$name = $request->input('name') ?? '';
```

### Missing Return Types

```php
// Before
public function find($id)

// After
public function find(int $id): ?User
```

### Unused Imports

```php
// Pint will auto-remove
// Or configure in pint.json
```

### Fix Discipline (Hypothesis-Driven)

**Fix discipline (hypothesis-driven).** One candidate cause documented before any edit → one atomic change → retest immediately. If it still fails, the hypothesis was wrong: the same fix is FORBIDDEN — run a fresh research round (Context7 → Exa) for a new hypothesis. Cap: 3 cycles per error; at the 3rd failure STOP and escalate (`status: fail` + root-cause: what was tried, sources, why each failed). Never stack two unverified corrections. Canonical implementation: sniper's Fix Retry Loop.

---

## Validation Report Template

```markdown
## Validation Results

### Larastan (Level 8)
- Status: PASS
- Errors: 0

### Pint
- Status: PASS
- Files checked: 45
- Files fixed: 0

### Pest
- Status: PASS
- Tests: 78
- Assertions: 234
- Time: 2.3s

### File Checks
- Files over `FUSE_SOLID_MAX_LINES`: 0
- Missing strict_types: 0
```

---

## Validation Checklist

```text
[ ] Larastan level 8+ passed
[ ] Pint --test passed
[ ] All Pest tests passed
[ ] All files within `FUSE_SOLID_MAX_LINES`
[ ] No type errors
[ ] No code style issues
```

---

## Task Phase

Phase: `validation`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

---

## Next Phase

Proceed to `05-review.md` (self-review)
Or `07-add-test.md` (if tests needed first)
