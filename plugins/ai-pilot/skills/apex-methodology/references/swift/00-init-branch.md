---
name: 00-init-branch
description: Git flow and branching strategy for Swift/iOS projects
prev_step: null
next_step: references/swift/01-analyze-code.md
---

# Swift Branching Strategy

## Git Flow for iOS Projects

```text
main (production)
  └── develop (integration)
       ├── feature/AUTH-123-login-screen
       └── bugfix/UI-789-button-crash
```

## Branch Naming

```bash
feature/TICKET-description    # New features
bugfix/TICKET-description     # Bug fixes
release/1.2.0                 # Releases
hotfix/1.2.1-critical-fix     # Hotfixes
```

## Creating Feature Branch

```bash
git checkout develop && git pull origin develop
git checkout -b feature/AUTH-123-login-screen
```

The branch stays local; agent `commit` pushes it at the end of the mandate (full mode).

## SPM Package Versioning

Release tags (SemVer, e.g. `1.2.0`) are created only by agent `commit` in full mode, after the merge is confirmed — never by hand in this phase.

```swift
// Package.swift dependency
.package(url: "https://github.com/org/Package", from: "1.2.0")
```

## Essential .gitignore

```text
xcuserdata/
DerivedData/
.build/
Pods/
*.xcscmblueprint
```

## Merge Strategy

Merges are done only by agent `commit` (full mode, end of mandate): PR into the base branch, CI wait, then a real `--merge` commit — never squash, which would orphan the release tag's bump commit. No manual rebase, merge or commit in this phase.

## Branch Protection Rules

- Require PR reviews (min 1)
- Require status checks (SwiftLint, tests)
- No force push to main/develop

## Release Process

Version bump, CHANGELOG, merge and post-merge tag are all run by agent `commit` in full mode, announced by the lead in the report (template HARD STOP 1). This phase only creates the working branch.

## Task Phase

Phase: `init-branch`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

## Next Phase

→ Proceed to `01-analyze-code.md`
