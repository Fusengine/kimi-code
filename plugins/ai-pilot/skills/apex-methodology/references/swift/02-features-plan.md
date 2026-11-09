---
name: 02-features-plan
description: Plan Swift features with MVVM architecture
prev_step: references/swift/01-analyze-code.md
next_step: references/swift/03-execution.md
---

# Swift Features Planning

## Feature Structure (MVVM)

```text
Features/UserProfile/
├── Views/ProfileView.swift        (view only)
├── ViewModels/ProfileViewModel.swift  (state + actions)
├── Models/UserProfile.swift       (data model)
├── Protocols/ProfileServiceProtocol.swift
└── Services/ProfileService.swift  (service logic)
```

## Task Breakdown Template

```markdown
## Feature: User Profile
1. [ ] Create `UserProfile` model
2. [ ] Define `ProfileServiceProtocol`
3. [ ] Implement `ProfileService`
4. [ ] Create `ProfileViewModel` (@Observable)
5. [ ] Build `ProfileView` with subviews
6. [ ] Add navigation route
7. [ ] Write unit tests
8. [ ] Localize strings
```

## Component Templates

### Model

```swift
struct UserProfile: Codable, Sendable, Identifiable {
    let id: String
    let displayName: String
    let email: String
}

extension UserProfile {
    static let preview = UserProfile(id: "1", displayName: "John", email: "john@test.com")
}
```

### Protocol

```swift
protocol ProfileServiceProtocol: Sendable {
    func fetchProfile(id: String) async throws -> UserProfile
    func updateProfile(_ profile: UserProfile) async throws -> UserProfile
}
```

### ViewModel

```swift
@MainActor @Observable
final class ProfileViewModel {
    var profile: UserProfile?
    var isLoading = false
    var error: Error?
    private let service: ProfileServiceProtocol

    init(service: ProfileServiceProtocol) { self.service = service }

    func load(id: String) async {
        isLoading = true
        defer { isLoading = false }
        do { profile = try await service.fetchProfile(id: id) }
        catch { self.error = error }
    }
}
```

## Pre-Implementation Checklist

- [ ] Research Apple docs for APIs
- [ ] Check existing code for reusable components
- [ ] Define protocols before implementations
- [ ] Plan file splits if a file is expected to exceed `FUSE_SOLID_MAX_LINES`
- [ ] Identify localization keys

## Task Phase

Phase: `features-plan`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

## Next Phase

→ Proceed to `03-execution.md`
