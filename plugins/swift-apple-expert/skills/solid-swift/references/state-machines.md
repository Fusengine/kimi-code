---
name: state-machines
applies-to: "**/*.swift"
description: Model state so illegal states are unrepresentable - sum types by default, transition functions when order matters
when-to-use: ViewModel state, loading/error states, multi-step flows, playback, sync, any boolean-flag soup
keywords: state machine, enum, sum type, illegal states, boolean soup, LoadState, Sendable, Equatable, Swift 6
priority: high
related: templates/viewmodel.md, templates/view.md, anti-patterns.md, concurrency-patterns.md
---

# State Modeling for Swift

**Make illegal states unrepresentable. Model mutually-exclusive states as one type, not independent flags.**

State modeling is tiered. Start at Tier 1; escalate to Tier 2 only when transition order matters.

Credit: adapted from the `coreyfloyd/agents` fork (https://github.com/coreyfloyd/agents).

---

## The anti-pattern: boolean soup

Independent flags for mutually-exclusive states let contradictory combinations exist.

```swift
// BAD: three flags = 2^3 = 8 combos, most illegal
@Observable final class FeatureViewModel {
    var data: FeatureData?
    var isLoading = false
    var error: Error?
}
// loading + error + data all set at once? The type permits it. Bugs live here.
```

If two or more properties are **mutually exclusive** (only one should be true at a time), they are not separate properties: they are one state.

---

## Tier 1 - Sum-type modeling (default)

Model the set of valid states as one `enum`. Illegal states become unrepresentable. This is the baseline for almost every ViewModel.

`LoadState` is defined **once**, here. Shared by 2+ features, so it lives in `Core/Models/LoadState.swift`; the ViewModel and View templates reference it, never redefine it.

```swift
// Core/Models/LoadState.swift
import Foundation

/// A `Sendable` and `Equatable` snapshot of a failure.
///
/// A bare `any Error` is neither `Equatable` nor guaranteed `Sendable`, so the
/// failure case carries this value instead of the raw error.
struct LoadFailure: LocalizedError, Sendable, Equatable {
    /// Human-readable description, already localized at capture time.
    let message: String

    init(message: String) { self.message = message }

    /// Captures an error as a value.
    init(_ error: any Error) { self.message = error.localizedDescription }

    /// Keeps `localizedDescription` equal to `message` when the failure is shown as an `Error`.
    var errorDescription: String? { message }
}

/// The lifecycle of an asynchronous load: exactly one case at a time.
enum LoadState<Value: Sendable>: Sendable {
    case idle
    case loading
    case loaded(Value)
    case failed(LoadFailure)
}

/// `Equatable` whenever the payload is, so state changes can be asserted in tests.
extension LoadState: Equatable where Value: Equatable {}
```

Use it in a ViewModel:

```swift
@MainActor
@Observable
final class FeatureViewModel {
    private(set) var state: LoadState<FeatureData> = .idle
    private let service: FeatureServiceProtocol

    init(service: FeatureServiceProtocol) { self.service = service }

    func load() async {
        state = .loading
        do    { state = .loaded(try await service.fetchData()) }
        catch { state = .failed(LoadFailure(error)) }
    }
}
```

Drive the view with an **exhaustive `switch`**: the compiler forces you to handle every state.

```swift
var body: some View {
    switch viewModel.state {
    case .idle, .loading: ProgressView()
    case .loaded(let data): FeatureContent(data: data)
    case .failed(let error): ErrorView(error: error) {
        Task { await viewModel.load() }
    }
    }
}
```

**Tier 1 is enough when** any state can follow any other and you only need to represent the current one (most load/error screens, simple toggles).

---

## Tier 2 - State machine (when transition order matters)

Escalate when only certain transitions are legal and an illegal jump is a bug: playback, multi-step wizards, onboarding, sync, connection lifecycle. Add **events** and a **transition function** that rejects illegal moves. Name the types after the flow (`ItemsFlowState`, not a generic `State`).

```swift
enum ItemsFlowState: Equatable, Sendable {
    case idle, loading, loaded([Item]), failed(LoadFailure)
}
enum ItemsFlowEvent: Equatable, Sendable {
    case load, succeeded([Item]), failed(LoadFailure), reset
}

extension ItemsFlowState {
    /// Returns the next state, or nil if the transition is illegal.
    func applying(_ event: ItemsFlowEvent) -> ItemsFlowState? {
        switch (self, event) {
        case (.idle, .load), (.failed, .load):   return .loading
        case (.loading, .succeeded(let items)):  return .loaded(items)
        case (.loading, .failed(let failure)):   return .failed(failure)
        case (_, .reset):                        return .idle
        default:                                 return nil   // illegal: rejected
        }
    }
}

@MainActor
@Observable
final class ItemsFlowViewModel {
    private(set) var state: ItemsFlowState = .idle

    /// Single funnel for all state changes; illegal transitions are dropped (or asserted).
    func send(_ event: ItemsFlowEvent) {
        guard let next = state.applying(event) else {
            assertionFailure("Illegal transition: \(event) from \(state)")
            return
        }
        state = next
    }
}
```

`Item` is your own `Sendable & Equatable` model (see `templates/model.md`).

Key properties of Tier 2:
- **One funnel** (`send`): state is never mutated directly from scattered call sites.
- **Illegal transitions are rejected at runtime**, not just illegal states unrepresentable.
- The transition table is the spec: reviewers read legality in one place.

---

## When to use which

| Situation | Tier |
|-----------|------|
| Load/error/empty screen, any order valid | **1** - sum type |
| A flag pair that's mutually exclusive | **1** - collapse into an enum |
| Audio/video playback, sync, connection lifecycle | **2** - transitions matter |
| Multi-step wizard / onboarding where back/skip rules exist | **2** |
| Order/job lifecycle with forbidden jumps | **2** |

Default to Tier 1. Reach for Tier 2 when you can name a transition that must not happen.

---

## Checklist

- [ ] No set of mutually-exclusive `Bool`/optional properties on one type (boolean soup)
- [ ] Mutually-exclusive states modeled as one `enum` (Tier 1)
- [ ] Failure payloads are `Sendable` + `Equatable` (`LoadFailure`), never a bare `any Error`
- [ ] Views driven by an exhaustive `switch` over the state, no `if isLoading ... else if error ...`
- [ ] If transition order matters: a single `send`/transition funnel rejecting illegal moves (Tier 2)
- [ ] State is `private(set)`: mutated only through the ViewModel's own methods
