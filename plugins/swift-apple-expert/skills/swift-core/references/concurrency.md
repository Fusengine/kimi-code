---
name: concurrency
description: Swift 6.4.x (6.4.2 ships with Xcode 27.2) concurrency with async/await, actors, Sendable, default MainActor isolation, approachable concurrency, Observations, typed NotificationCenter messages, #bundle, strict memory safety, async defer, cancellation shields, InlineArray, Span
when-to-use: implementing async operations, managing shared state, fixing data races, using Swift 6.2-6.4 features
keywords: async, await, actor, Sendable, Task, MainActor, nonisolated, TaskGroup, InlineArray, Span, Observations, MainActorMessage, SWIFT_DEFAULT_ACTOR_ISOLATION, SWIFT_APPROACHABLE_CONCURRENCY
priority: high
related: architecture.md, testing.md, performance.md
---

# Swift 6.4 Concurrency

## Swift 6.4 New Features (Xcode 27, current 6.4.2)

Language, tooling and library additions beyond concurrency (Swift Build default in SwiftPM, Subprocess 1.0, SE-0521/0522/0491, SE-0508 source break): see [swift-6-4.md](swift-6-4.md).

### Async calls in `defer` - SE-0493
`await` is allowed inside `defer`; the call runs to completion before the scope exits.

### Task Cancellation Shields - SE-0504
Run cleanup that must not observe the enclosing task's cancellation.

```swift
func processFile(at url: URL) async throws {
    let handle = try FileHandle(forReadingFrom: url)
    defer {
        await withTaskCancellationShield {
            await flushMetrics(for: url)
            try? handle.close()
        }
    }
    try await processContents(of: handle)
}
```

### Advanced Observation Tracking - SE-0506
`@Observable` types gain fine-grained and continuous change notifications.

---

## Swift 6.2 Features

### Default MainActor isolation
Run unannotated code on the main actor without writing `@MainActor` (suited to app targets, scripts and UI code).

- Compiler flag `-default-isolation MainActor` (swift.org Swift 6.2 post, https://www.swift.org/blog/swift-6.2-released/, read 2026-11-13).
- Xcode build setting `SWIFT_DEFAULT_ACTOR_ISOLATION`, shown as "Default Actor Isolation": "Controls default actor isolation for unannotated code. When set to 'MainActor', @MainActor isolation will be inferred by default to mitigate false-positive data-race safety errors in sequential code" (Xcode build settings reference, https://developer.apple.com/documentation/xcode/build-settings-reference, read 2026-11-13).
- Effect on this plugin's patterns: with the setting on, `@MainActor` on view models is implicit; keep the explicit annotation in packages and non-UI targets where the setting is off. Use `nonisolated` to opt a declaration out and `@concurrent` for work that must run off the actor.

### Approachable concurrency - nonisolated(nonsending) - SE-0461
Async functions stay on the caller's executor instead of hopping to the global executor.

- Xcode build setting `SWIFT_APPROACHABLE_CONCURRENCY` (name verified on the Xcode build settings reference, 2026-11-13). Apple's description: enables the upcoming features DisableOutwardActorInference, GlobalActorIsolatedTypesUsability, InferIsolatedConformances, InferSendableFromCaptures and NonisolatedNonsendingByDefault.
- Single feature, SwiftPM or compiler: `-enable-upcoming-feature NonisolatedNonsendingByDefault`.
- Async functions on classes can access `self` without data races, with fewer context switches; use `@concurrent` to opt into parallelism explicitly.

### Observations async sequence
`Observations` (`struct Observations<Element, Failure>`, iOS 26.0, macOS 26.0 and the other 26.0 platforms) streams transactional changes of `@Observable` state: updates include all synchronous changes, and the transaction ends at the next `await` that suspends, so consumers never see torn state.

```swift
for await count in Observations({ model.count }) { render(count) }
```

Initializer verified: `init(_ emit: @escaping @isolated(any) @Sendable () throws(Failure) -> Element)`. Source: https://developer.apple.com/documentation/observation/observations (read 2026-11-13).

### Typed NotificationCenter messages
Notification payloads as concrete types instead of strings and `userInfo`. A type conforms to `NotificationCenter.MainActorMessage` (delivered synchronously on the main actor) or `NotificationCenter.AsyncMessage` (asynchronous); both iOS 26.0, macOS 26.0 and the other 26.0 platforms.

```swift
struct EventDidStart: NotificationCenter.MainActorMessage { typealias Subject = Event }
extension NotificationCenter.MessageIdentifier where Self == NotificationCenter.BaseMessageIdentifier<EventDidStart> {
    static var didStart: Self { .init() }
}
```

Conformance and identifier pattern from https://developer.apple.com/documentation/foundation/notificationcenter/mainactormessage (read 2026-11-13). Apple's page names `addObserver(of:for:using:)` for observing; its symbol page was not read, so check the exact signature on developer.apple.com before writing the observer call.

### `#bundle`
Not listed in the Swift 6.2 post; availability is OS-based, below. `#bundle` resolves the `Bundle` of the current module (app, extension, framework or Swift package), e.g. `String(localized: "title", bundle: #bundle)`. Verified: `@freestanding(expression) macro bundle() -> Bundle`, iOS 15, macOS 12, tvOS 15, watchOS 8, visionOS 1 (https://developer.apple.com/documentation/foundation/bundle(), read 2026-11-13).

### Strict memory safety (opt-in)
Flags every use of an unsafe construct (unsafe pointers, `@unsafe` APIs) not acknowledged with `unsafe`; the Swift 6.2 post keeps it for projects with the strongest security requirements. Xcode build setting `SWIFT_STRICT_MEMORY_SAFETY` (build settings reference, 2026-11-13: "Enable strict memory safety checking. This will produce warnings for each use of an unsafe language construct or API that isn't acknowledged with `unsafe` or `@unsafe`"). Prefer `Span` over unsafe buffer pointers to stay clear of it.

### InlineArray - SE-0453
Fixed-size stack-allocated arrays for performance.

```swift
var colors: InlineArray<3, UInt8> = [255, 128, 64]
```

**Use for:** Graphics (RGB), protocol headers, small fixed buffers.

### Span & RawSpan
Safe non-owning memory views (replaces UnsafePointer).

```swift
func parseHeader(_ data: Span<UInt8>) -> String? {
    guard data.count >= 8 else { return nil }
    let header = data.prefix(8)  // Safe slicing
    return String(bytes: header, encoding: .utf8)
}

// Usage
let array: [UInt8] = [...]
parseHeader(array.span)  // Zero-copy
```

**Features:** Bounds-checking, lifetime tracking, compiler-enforced safety, zero-copy.

### Named Tasks - SE-0469
Name tasks for debugging and profiling.

```swift
Task(name: "ImageDownload") { await downloadImage() }

// In TaskGroups
await withTaskGroup(of: Int.self) { group in
    group.addTask(name: "Worker-1") { await process(1) }
}
```

**Visibility:** Instruments profiler, Xcode debugger, crash logs.

### Task.immediate - SE-0472
Task body runs synchronously on the caller's executor until its first real suspension.

```swift
// Standard: queued, respects backpressure
Task { await operation() }

// Immediate: runs inline until the first suspension
Task.immediate { await operation() }
```

**Use for:** Reducing latency on short tasks.

---

## Core Concepts

### Async/Await
- `async` marks suspendable functions
- `await` suspends until result ready
- `try await` for error propagation

### Actors
Thread-safe state encapsulation. All access serialized.

### Sendable
Types safe to share across concurrency domains.

### @MainActor
Isolates code to main thread for UI.

### Task Groups
`withTaskGroup` for parallel operations with automatic cancellation.

---

## Migration Fixes

| Error | Solution |
|-------|----------|
| "not Sendable" | Make struct Sendable or use actor |
| "actor-isolated" | Add `await` or use `nonisolated` |
| "main actor-isolated" | Use `@MainActor` or `MainActor.run` |

---

## Best Practices

- ✅ Use actors for shared mutable state
- ✅ Mark types Sendable when possible
- ✅ Use `InlineArray` for small fixed collections
- ✅ Use `Span` instead of `UnsafePointer`
- ❌ Don't use locks with actors
- ❌ Don't capture non-Sendable types in Tasks
