---
name: 03-execution
description: Implement Swift features following SOLID principles
prev_step: references/swift/02-features-plan.md
next_step: references/swift/03.5-elicit.md
---

# Swift Implementation Guide

## View Pattern

```swift
import SwiftUI

struct ProfileView: View {
    @State private var viewModel: ProfileViewModel

    init(service: ProfileServiceProtocol = ProfileService()) {
        _viewModel = State(initialValue: ProfileViewModel(service: service))
    }

    var body: some View {
        Group {
            if viewModel.isLoading { ProgressView() }
            else if let profile = viewModel.profile { ProfileContent(profile: profile) }
            else if viewModel.error != nil { ErrorView(retry: { Task { await viewModel.load(id: "me") }})}
        }
        .navigationTitle("profile.title")
        .task { await viewModel.load(id: "me") }
    }
}

#Preview { NavigationStack { ProfileView() } }
```

## ViewModel Pattern

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

## SOLID Applied

```swift
// Dependency Inversion: depend on protocol
init(service: ProfileServiceProtocol) { ... }

// Interface Segregation: small protocols
protocol Fetchable { func fetch() async throws }
protocol Updatable { func update() async throws }
```

## Actor for Shared State

```swift
actor ProfileCache {
    private var cache: [String: UserProfile] = [:]
    func get(_ id: String) -> UserProfile? { cache[id] }
    func set(_ profile: UserProfile) { cache[profile.id] = profile }
}
```

## Localization (Mandatory)

```swift
Text("profile.welcome.title")           // Localized key
Text("profile.greeting \(profile.name)") // Interpolation
Button("button.save") { ... }
```

## Extract Mixed Sections

When a view section mixes several concerns, extract it to a subview:
`ProfileHeader`, `ProfileDetails`, `ProfileActions`

## Task Phase

Phase: `execution`. `.kimi-code/apex/` is harness state, read-only for agents and the lead: never create or write anything there. Kimi has no task-board sync: the lead tracks the phase in its `TodoList`; state the phase in your REPORT and keep tracking in the agents' REPORTs and `docs/decisions.md`.

## Next Phase

→ Proceed to `03.5-elicit.md`
