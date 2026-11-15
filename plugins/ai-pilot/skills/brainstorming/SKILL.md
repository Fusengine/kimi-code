---
name: brainstorming
description: Use when creating a feature/component or adding functionality (design mode, fires before or alongside APEX Analyze), or when asked to analyse / improve an existing project (ideas mode, 3 grounded suggestions).
---


<objective>
Brainstorming has two modes. **Design mode** runs a design-first, no-code-before-approval process ahead of any non-trivial feature, component, or behavior change: explore project context, frame the problem (open points become explicit assumptions or go to the lead), diverge to 6-8 approaches via a named technique before converging on 2-3 with a trade-off table, present the design for approval through the lead, save it to `docs/plans/`, then hand off to APEX Analyze along with the research already gathered (so Analyze doesn't repeat it).

**Ideas mode** analyses an existing project and proposes its 3 best grounded, coherent improvements as « Suggestion: <idea> → gain: <benefit> », saved to `docs/plans/` -- it never builds anything.

Skip it entirely for trivial fixes, typos, or simple renames -- those go straight to APEX.
</objective>

# Brainstorming Skill

**Design-first approach: no code before design approval.**

---

## Agent Workflow (MANDATORY)

Before ANY brainstorming session, spawn agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Understand project context, patterns, constraints
2. **research-expert** - Fetch best practices and documentation

If the brief already carries their findings, reuse them -- do not relaunch. The only other agent allowed is **challenger**, once, on the chosen approach (design mode) or the top 3 ideas (ideas mode).

**Questions go to the lead, never to the owner.** Open points are decided from the evidence and written as explicit assumptions; only a point that changes the design and cannot be inferred becomes ONE binary question returned to the lead in the final message (rule 08); the lead escalates at most one binary question to the owner.

After design approval, transition to **APEX Analyze** phase, **passing along the explore-codebase and research-expert findings** in the handoff (not just the design doc). APEX Analyze re-runs those same agents by default — carrying forward what was already gathered here avoids re-doing the same research twice.

---

## Overview

| Scenario | Action |
|----------|--------|
| **"Analyse / improve this project", new ideas** | Ideas mode |
| **New feature** | Full brainstorming (6 steps) |
| **Major change** | Full brainstorming (6 steps) |
| **Component creation** | Full brainstorming (6 steps) |
| **Trivial fix (1-3 lines)** | Skip brainstorming, go to APEX |
| **Simple rename/typo** | Skip brainstorming, go to APEX |

---

## 6-Step Process (design mode)

### Step 1: Explore Project Context

Gather context before framing:

- `git log --oneline -20` - Recent changes and direction
- Existing code patterns and conventions
- Related documentation and prior decisions (`docs/decisions.md`)
- Tech stack and dependency constraints

### Step 2: Frame and Resolve Open Points

Frame the problem and its measurable success criteria. Resolve each open point from the evidence (code, `docs/decisions.md`, brief) and write it as an explicit assumption; only a point that changes the design and cannot be inferred becomes ONE binary question for the lead in the final message. Never a series of questions to the owner.

Categories: purpose, constraints, success criteria, users, integrations.

> See [workflow.md](references/workflow.md) for question categories

### Step 3: Diverge, Then Converge to 2-3 Approaches

Generate ≥6-8 distinct approaches via a named technique (SCAMPER / reverse-brainstorming / analogies), judgment suspended — not 3 sizes of the same idea. Only then converge to 2-3 with trade-offs in table format:

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Option A | ... | ... | ... |
| Option B | ... | ... | ... |
| Option C | ... | ... | ... |

Always include a clear recommendation with rationale.

### Step 4: Present Design for Approval

Break design into digestible sections:

1. Architecture overview
2. Key components and responsibilities
3. Data flow and state management
4. Edge cases and error handling

**Approval comes through the lead** (who relays to the owner when needed): report the design and its assumptions to the lead before any code is written.

### Step 5: Save Design Document

Save the design to: `docs/plans/YYYY-MM-DD-<topic>-design.md` (`Status: Draft` until the lead approves, then `Approved`)

### Step 6: Transition to APEX

Hand off to APEX Analyze phase with the approved design as input.

---

## Ideas Mode

Input: a project path plus any explore/research findings the lead passes.

1. **Coherence** -- read `docs/decisions.md`, `MEMORY/LESSON.md`, `git log --oneline -30`; drop any idea that contradicts a recorded decision or repeats a lesson's mistake.
2. **Explore** -- helpers above, unless the brief carries their findings.
3. **Diverge** -- 6-8 ideas through a named technique (SCAMPER on the main flows, reverse brainstorming, analogies with comparable tools).
4. **Converge** -- top 3 by gain / cost; each grounded: it does not exist yet (file:line of the closest existing code) and every API it relies on is real (doc URL fetched).
5. **Challenge** -- `challenger` once on the top 3; drop or fix any REFUTED idea.
6. **Save** -- `docs/plans/YYYY-MM-DD-<topic>-ideas.md`, short:

```markdown
# <Project> - Ideas (YYYY-MM-DD)
Technique: <name> -- inputs read: <decisions / lessons / git log / explore / research>
## Top 3
1. Suggestion: <idea> → gain: <concrete benefit> -- cost: S/M/L -- risk: <one line>
   Evidence: missing at <file:line>; API: <doc URL>
## Also considered
- <idea> -- dropped because <reason>
## Assumptions
- <assumption made instead of asking>
```

The same 3 `Suggestion:` lines go into the final message. Nothing is built.

---

## Reference Guide

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Workflow** | [workflow.md](references/workflow.md) | Question categories, proposal format, design template |
| **Anti-Patterns** | [anti-patterns.md](references/anti-patterns.md) | Catching rationalizations to skip brainstorming |

---

## Quick Reference

```text
Design mode:
1. Explore   → git log, codebase, docs (agents in parallel, or reuse brief findings)
2. Frame     → problem + success criteria; open points = assumptions or one binary question to the lead
3. Diverge   → 6-8 options (named technique), converge to 2-3 with trade-offs table
4. Design    → Present sections, approval through the lead
5. Save      → docs/plans/YYYY-MM-DD-<topic>-design.md
6. Handoff   → APEX Analyze with approved design + prior research (no re-research)

Ideas mode:
coherence → explore → diverge 6-8 → top 3 grounded → challenger → docs/plans/YYYY-MM-DD-<topic>-ideas.md
```

---

## Critical Rules

1. **NEVER write code before design approval** - Design first, always; ideas mode never builds
2. **Never question the owner** - Open points become explicit assumptions or one binary question to the lead
3. **Always propose alternatives** - Minimum 2 approaches with trade-offs
4. **Save the doc** - Design or ideas doc in `docs/plans/`: audit trail and shared reference
5. **Get explicit approval** - Through the lead, before any code
6. **Grounded or dropped** - Every suggestion carries file:line evidence and a verified doc URL
