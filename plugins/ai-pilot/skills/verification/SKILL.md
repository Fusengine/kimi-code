---
name: verification
description: Use when marking a task complete, finishing a feature, or claiming a bug fixed -- verifies functional resolution before closing. Do NOT use for lint/quality checks (use sniper AFTER this).
---


<objective>
Verification confirms the original request is actually fulfilled -- distinct from sniper, which only confirms the code is clean. It runs a 6-step process: re-read the original request word for word, list every acceptance criterion (explicit and implicit), verify each with concrete evidence (test output, logs, screenshots, diffs), run the full test suite to check for regressions, review every modified file for accidental side effects, then route the "functionally resolved" claim through the `challenger` agent before writing it down.

The proof lives in the agent's REPORT to the lead (proof per part, not verified, files touched); when a file is needed it goes to `docs/verify/<branch-slug>.md`. Proof by type (UI, tests, commit, migration/deploy, platform advice) follows the global `AGENTS.md` COORDINATOR PATH step 9 (proof by type) -- canonical there, not repeated here. It sits between eLicit and eXamine in APEX: a task is only complete when both verification and sniper pass.
</objective>

# Verification Before Completion

## Overview

**Sniper validates CODE QUALITY. Verification validates FUNCTIONAL RESOLUTION.** Both are needed before closing any task.

Sniper catches linter errors, SOLID violations, and code style issues. Verification ensures the **original request is actually fulfilled** -- the right behavior, the right output, the right fix. A task can pass sniper with zero errors and still be functionally wrong.

| Aspect | Sniper | Verification |
|--------|--------|-------------|
| **Focus** | Code quality | Functional correctness |
| **Checks** | Linting, SOLID, style | Acceptance criteria, regressions, side effects |
| **Runs** | After any code change | Before marking task as complete |
| **Result** | Clean code | Solved problem |

---

## Agent Workflow

When invoked, follow the 6-step verification process below **before** marking any task as completed.

### 6-Step Verification Process

**Step 1: Re-read the original request**
Go back to the original issue, task description, or user message. Read it word by word. Do not rely on memory or assumptions.

**Step 2: List ALL acceptance criteria**
Extract every explicit and implicit requirement from the original request. Number them. If the request is vague, list what a reasonable user would expect.
Name each part of the owner's request, including additions made mid-task; a rule acquired for one entity (trash, slug, format) applies to its siblings -- grep them for parity.

**Step 3: Verify each criterion with evidence**
For each criterion, provide concrete evidence of resolution:
- Test output showing the expected behavior
- Log output confirming the fix
- Screenshot of the UI change
- Code diff showing the implementation

The proof required for each type of deliverable is the global `AGENTS.md` COORDINATOR PATH step 9 (proof by type; source: `core-overrides/kimi-rules/templates/KIMI.md.template`).

**Look before done (canonical rule):** open the real output -- rendered page/screenshot (native vision: look at it), extracted frames, runtime log of the real target (running dev server, real DB, installed build) -- and state what you see in it. Tests green or isolated fixtures ≠ done; a crash fix first reproduces the crash in a test, and "error gone" ≠ behaviour correct.

**Step 4: Check for regressions**
Run the full test suite. Compare results before and after. No new failures, no new warnings.

**Step 5: Check for side effects**
Review every modified file. Confirm no accidental changes to unrelated code. Verify dependencies and configuration are unchanged unless required.

**Step 6: Confirm functional resolution -- challenge, then report the proof**
Before writing "Original problem is FUNCTIONALLY resolved," ALWAYS route the claim through the `challenger` agent (or `challenge` skill), fresh-context: claim = "functionally resolved" + evidence from Steps 3-5, NEVER the investigation reasoning. This is systematic -- every Verify gate, no exception, exactly like sniper runs at every eXamine. Only write the "FUNCTIONALLY resolved" verdict after a `CONFIRMED` result. A `REFUTED` or `UNCERTAIN` verdict must be resolved (fix and re-verify) or explicitly accepted by the owner before any "done" claim.

Put the proof in your REPORT to the lead: one evidence item per criterion (command output, log excerpt, screenshot path, or diff), the challenge verdict, what is not verified, files touched. When the proof must survive the session (long mandate, several agents, owner asked for a record), also write `docs/verify/<branch-slug>.md` using the body of `references/verify-template.md`. Then state explicitly in your response: "Original problem is FUNCTIONALLY resolved" with a summary of evidence, or list what remains unresolved. Any criterion without its own evidence is reported as "not verified", never folded into "done".

`<branch-slug>`: from the git branch only -- `git branch --show-current`, drop the `<type>/` prefix, lowercase, every character outside `a-z0-9` becomes `-` (`feat/use-harness` -> `use-harness`). Detached HEAD: `detached-<short sha from git rev-parse --short HEAD>`.

---

## Reference Guide

| Resource | Path | Content |
|----------|------|---------|
| Checklist | `references/checklist.md` | Full verification checklist with all categories |
| Common Misses | `references/common-misses.md` | Frequently forgotten verification items |
| Artifact Template | `references/verify-template.md` | Optional `docs/verify/<branch-slug>.md` record: path, slug derivation, body |

---

## Integration with APEX

Verification runs **between eLicit and eXamine** in the APEX workflow:

```
Analyze -> Plan -> Execute -> eLicit -> [VERIFICATION] -> eXamine (sniper)
```

This ensures functional correctness is confirmed before code quality validation. A task is only complete when **both** verification and sniper pass.

---

## Critical Rules

| Rule | Reason |
|------|--------|
| Never skip re-reading the original request | Prevents solving the wrong problem |
| Evidence required for every criterion | "It works" is not evidence |
| Full test suite, not just new tests | Catches regressions |
| Review ALL modified files | Catches accidental side effects |
| Both verification AND sniper must pass | Quality without correctness is useless |
| Step 6 proof goes in the REPORT; a file, if needed, in `docs/verify/<branch-slug>.md` | A claim without its proof regresses across sessions |
