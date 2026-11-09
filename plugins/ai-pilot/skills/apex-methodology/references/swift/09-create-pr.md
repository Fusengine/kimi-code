---
name: 09-create-pr
description: Run Swift pre-PR checks, prepare the PR, hand the release to the commit agent
prev_step: references/swift/08-check-test.md
next_step: null
---

# Swift Pull Request Guide

Run the Swift pre-PR checks, prepare the PR title and body, then hand the push / PR / CI / merge / tag to agent `commit` (full mode). This phase never pushes, opens, merges or tags anything itself.

## Pre-PR Checks (run by the APEX agent)

```bash
swiftlint --strict && \
swift test
```

For an Xcode app target, run the scheme instead of `swift test`: `xcodebuild test -scheme MyApp -destination "platform=iOS Simulator,name=iPhone 16"`. Paste each command + result in your REPORT; a check not run is reported "not verified".

## Hand-off to the Commit Agent (end of mandate)

This phase never runs `git push`, `gh pr create`, `gh pr merge`, a rebase onto main, a force-push or a tag. Once the checks above are green and the Verify + sniper proofs are in the REPORT, the release goes to agent `commit` in **full mode** (template HARD STOP 1; rules `06-tooling-rules`, Git & GitHub Flow):

- It pushes the working branch, opens the PR (against the repo's base branch, e.g. `develop`), waits for CI, merges with a real `--merge` commit — never squash, which would orphan the release tag's bump commit — then tags post-merge and watches the release run.
- The lead launches it at the end of the mandate and announces the merge/release in the report to the owner; an APEX sub-agent never launches it and never runs those commands itself.
- Brief it with: `mode: full`, the PR title and body below, the base branch, and the files of the mandate.
- Blocked (merge conflict, secret in the diff) → it stops with `status: blocked`; CI red → `status: left-open`, `ci: failed:<check>`. Either way: fix through the APEX loop (`06-fix-issue.md`), re-run the checks, hand off again.

## PR Body Template (handed to the commit agent)

```markdown
## Summary
Brief description (1-2 sentences).

## Changes
- Added `ProfileViewModel` with @Observable
- Created `ProfileServiceProtocol`

## Checklist
- [ ] MVVM architecture followed
- [ ] @Observable (not ObservableObject)
- [ ] Files within `FUSE_SOLID_MAX_LINES`
- [ ] SwiftLint passes
- [ ] /// docs on public APIs
- [ ] Unit tests added
- [ ] #Preview for views
- [ ] Strings localized
- [ ] Models are Sendable

## Screenshots
| Before | After |
|--------|-------|
| N/A | [img] |
```

## Title Convention

```text
feat(scope): description (#ticket)
fix(scope): description (#ticket)
refactor(scope): description
```

## GitHub Actions Checks (what the commit agent's CI wait gates on)

```yaml
name: PR Checks
on: [pull_request]
jobs:
  lint:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - run: swiftlint --strict
  test:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - run: xcodebuild test -scheme MyApp -destination "platform=iOS Simulator,name=iPhone 16"
```

## After the Hand-off

```text
[ ] Commit agent report read: PR URL, CI result, merge commit, tag
[ ] Report to the owner: merge/release announced, with the PR URL and tag
```

## Task Phase

Phase: `create-pr`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList` (`done` once the commit agent reports the merge); state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.
