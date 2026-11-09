---
name: 04-validation
description: Verify Swift code with SwiftLint and build validation
prev_step: references/swift/03.5-elicit.md
next_step: references/swift/05-review.md
---

# Swift Code Validation

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
  echo "ℹ️ No docs/verify/elicit-${BRANCH_SLUG}.json — the eLicit verdict must be in the agent REPORT. No such report → go back to references/swift/03.5-elicit.md first."
fi
if [ -f "docs/verify/${BRANCH_SLUG}.md" ]; then
  echo "✅ Verify record: docs/verify/${BRANCH_SLUG}.md"
else
  echo "ℹ️ No docs/verify/${BRANCH_SLUG}.md — the Verify proof must be in the agent REPORT (evidence per criterion + challenge verdict). No such report → go back to the verification skill first."
fi
```

Only once both proofs are present does this phase proceed.

## SwiftLint Configuration (.swiftlint.yml)

```yaml
included: [Sources, Tests]
excluded: [Pods, .build, DerivedData]

disabled_rules: [trailing_whitespace, todo]
opt_in_rules: [empty_count, closure_spacing, modifier_order]

line_length:
  warning: 120
  error: 150
file_length:
  warning: 100
  error: 150
identifier_name:
  min_length: 2
  excluded: [id, x, y]

reporter: "xcode"
```

## Running SwiftLint

```bash
swiftlint                    # Lint all
swiftlint --fix              # Auto-fix
swiftlint --strict           # Warnings as errors
swiftlint analyze --compiler-log-path build.log  # Deep analysis
```

## swift-format Configuration (.swift-format)

```json
{
  "version": 1,
  "lineLength": 120,
  "indentation": { "spaces": 4 },
  "rules": {
    "AlwaysUseLowerCamelCase": true,
    "NeverForceUnwrap": true,
    "OrderedImports": true
  }
}
```

## Running swift-format

```bash
swift-format -i Sources/**/*.swift  # Format
swift-format lint --strict Sources/ # Check
```

## Xcode Build Validation

```bash
xcodebuild build -scheme MyApp \
  -destination "platform=iOS Simulator,name=iPhone 16" \
  CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO
```

## Pre-commit Hook

```bash
#!/bin/sh
swiftlint --strict && swift-format lint --strict Sources/
```

## Fix Discipline (Hypothesis-Driven)

**Fix discipline (hypothesis-driven).** One candidate cause documented before any edit → one atomic change → retest immediately. If it still fails, the hypothesis was wrong: the same fix is FORBIDDEN — run a fresh research round (Context7/apple-docs → Exa) for a new hypothesis. Cap: 3 cycles per error; at the 3rd failure STOP and escalate (`status: fail` + root-cause: what was tried, sources, why each failed). Never stack two unverified corrections. Canonical implementation: sniper's Fix Retry Loop.

## Validation Checklist

- [ ] SwiftLint: zero warnings
- [ ] swift-format: passes
- [ ] No file over `FUSE_SOLID_MAX_LINES`
- [ ] All public APIs: /// docs
- [ ] No force unwraps
- [ ] All strings localized
- [ ] #Preview for all views

## Task Phase

Phase: `validation`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

## Next Phase

→ Proceed to `05-review.md`
