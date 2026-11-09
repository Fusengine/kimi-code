---
name: 09-create-pr
description: Prepare a PR with design documentation and hand the release to the commit agent
prev_step: references/design/08-sniper-check.md
next_step: null
---

# 09 - Create PR (Design)

**Prepare the PR with visual documentation, then hand the push / PR / CI / merge / tag to agent `commit` (full mode).** This phase never pushes, opens, merges or tags anything itself.

## When to Use

- After sniper validation (08-sniper-check)
- When design work is complete
- At the end of the mandate, when the work is ready to leave the working branch

---

## Hand-off to the Commit Agent (end of mandate)

This phase never runs `git push`, `gh pr create`, `gh pr merge`, a rebase onto main, a force-push or a tag. Once the validation checklist below is green and the Verify + sniper proofs (screenshots included) are in the REPORT, the release goes to agent `commit` in **full mode** (template HARD STOP 1; rules `06-tooling-rules`, Git & GitHub Flow):

- It pushes the working branch, opens the PR (against the repo's base branch, e.g. `develop`), waits for CI, merges with a real `--merge` commit — never squash, which would orphan the release tag's bump commit — then tags post-merge and watches the release run.
- The lead launches it at the end of the mandate and announces the merge/release in the report to the owner; an APEX sub-agent never launches it and never runs those commands itself.
- Brief it with: `mode: full`, the PR title and body below, screenshot paths, the base branch, and the files of the mandate.
- Blocked (merge conflict, secret in the diff) → it stops with `status: blocked`; CI red → `status: left-open`, `ci: failed:<check>`. Either way: fix, re-validate, hand off again.

---

## PR Body Template (handed to the commit agent)

```markdown
## Summary
Brief description of design changes (1-2 sentences).

## Design Changes
- Added HeroSection component with glassmorphism
- Implemented staggered fade-up animations
- Used existing design tokens (colors, typography)

## Design Coherence
- [x] Matches existing color palette
- [x] Uses same typography (font-display, font-sans)
- [x] Follows spacing patterns
- [x] Animations match existing patterns

## Anti-AI Slop Checklist
- [x] No Inter/Roboto/Arial
- [x] No purple gradients
- [x] No border-left indicators
- [x] Hover states on all interactive elements

## Accessibility
- [x] WCAG 2.2 AA compliant
- [x] Keyboard navigable
- [x] Proper ARIA labels
- [x] prefers-reduced-motion respected

## Screenshots
| Before | After |
|--------|-------|
| N/A | ![screenshot](url) |

## Test Plan
- [ ] Visual review on desktop
- [ ] Visual review on mobile
- [ ] Keyboard navigation test
- [ ] Screen reader test
```

---

## Title Convention

```text
design(scope): description

Examples:
- design(hero): add hero section with animations
- design(cards): update card hover effects
- design(theme): implement dark mode
- design(a11y): improve focus states
```

---

## Screenshots Guide

### What to Include

```text
1. Full component view
2. Hover state
3. Mobile responsive view
4. Dark mode (if applicable)
5. Before/After comparison (for redesigns)
```

### Tools

```text
- macOS screenshot: Cmd + Shift + 4
- Browser DevTools: responsive mode for mobile, emulate color scheme for dark mode
```

---

## Review Request

### Reviewers to Name in the Brief

```text
- Design lead (for visual approval)
- Frontend dev (for code review)
- A11y specialist (if available)
```

---

## Validation Checklist (before the hand-off)

```text
[ ] PR title and body ready (template above)
[ ] Screenshots captured and paths in the REPORT
[ ] Design coherence documented
[ ] A11y checklist completed
[ ] Reviewers named for the commit agent's brief
```

---

## After the Hand-off

```text
[ ] Commit agent report read: PR URL, CI result, merge commit, tag
[ ] Report to the owner: merge/release announced, with the PR URL and tag
```

---

**Design workflow complete!**
