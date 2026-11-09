---
name: 06-fix-issue
description: Systematic workflow for fixing Swift issues
prev_step: references/swift/05-review.md
next_step: references/swift/07-add-test.md
---

# Swift Fix Workflow

## 1. Reproduce Issue

```bash
# Run failing test
xcodebuild test -scheme MyApp \
  -only-testing:MyAppTests/ProfileViewModelTests/testLoadProfile

# Check crash logs
open ~/Library/Logs/DiagnosticReports/
```

## 2. Identify Root Cause

```bash
grep -rn "ProfileViewModel" --include="*.swift"
git blame Sources/Features/Profile/ProfileViewModel.swift
```

## Common Issues & Fixes

### Force Unwrap Crash

```swift
// BAD
let name = user!.name

// GOOD
guard let user else { return }
let name = user.name
```

### Concurrency Data Race

```swift
// BAD: shared mutable state
class Counter { var count = 0 }

// GOOD: use actor
actor Counter { var count = 0 }
```

### Main Thread Violation

```swift
// BAD
Task.detached { self.label.text = "X" }

// GOOD
@MainActor @Observable final class ViewModel { ... }
```

### Memory Leak

```swift
// BAD: retain cycle
service.fetch { result in self.data = result }

// GOOD: async/await
data = try await service.fetch()
```

## 3. Create Fix Branch

```bash
git checkout develop && git pull
git checkout -b bugfix/ISSUE-123-profile-crash
```

## 4. Write Failing Test First

```swift
@Test func testProfileLoadHandlesNil() async {
    let service = MockProfileService(returnsNil: true)
    let viewModel = ProfileViewModel(service: service)
    await viewModel.load(id: "invalid")
    #expect(viewModel.error != nil)
}
```

## 5. Verify Fix

```bash
xcodebuild test -scheme MyApp
swiftlint --strict
```

Both green → the lead hands the commit to agent `commit` in **WIP mode** (`mode: wip`: one conventional commit on the working branch — no bump, no push, no PR, no merge, no tag); an APEX sub-agent never runs `git commit` itself. Never squash or rebase: a follow-up fix is its own commit. Suggested message, passed to the commit agent:

```text
fix(profile): handle nil user (#123)
```

## Escalation

**Attempt cap before escalation.** Diagnosis is hypothesis-driven: one candidate cause documented → one atomic fix → immediate retest. The same fix twice is forbidden; a new attempt needs a new hypothesis (fresh research first). After 3 failed cycles on the same issue, STOP and escalate with a root-cause note (what was tried, sources consulted, why each attempt failed) — do not keep trying or widen the scope to work around it. Canonical implementation: sniper's Fix Retry Loop.

## Task Phase

Phase: `fix-issue`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

## Next Phase

→ Return to `04-validation.md` (verify fix), then `05-review.md` (re-review)
