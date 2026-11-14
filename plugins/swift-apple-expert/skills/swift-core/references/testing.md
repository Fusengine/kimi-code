---
name: testing
description: Swift Testing first (@Test, #expect, exit tests, attachments, Issue severity, Test.cancel, CustomTestReflectable), Swift Testing UI tests with XCUIAutomation (27.3 beta), XCTest as the legacy path
when-to-use: writing unit or UI tests, migrating XCTest to Swift Testing, testing async code, attaching evidence to test results
keywords: Swift Testing, @Test, #expect, #require, exit test, Attachment, Issue.record, Test.cancel, CustomTestReflectable, XCUIAutomation, XCUIHinge, XCTest, XCUITest
priority: high
requires: architecture.md, concurrency.md
related: performance.md, sdk-27-changes.md, swift-6-4.md
---

# Testing

Swift Testing is the default for new tests; XCTest stays for what Swift Testing does not cover yet (see "XCTest: legacy path"). Apple's Swift 6.4 post pushes migration: "Swift 6.4 makes it easier to migrate existing projects to use Swift Testing" (https://www.swift.org/blog/swift-6.4-released/, read 2026-11-13).

Sources (all read 2026-11-13): symbol pages under https://developer.apple.com/tutorials/data/documentation/testing/..., Xcode 27.3 release notes https://developer.apple.com/documentation/xcode-release-notes/xcode-27_3-release-notes, swift.org posts for 6.2 (2025-09-15), 6.3 (2026-03-24), 6.4 (2026-09-15).

## Core API (Swift 6.0 / Xcode 16.0)

```swift
import Testing

@Suite(.serialized) struct CartTests {
    @Test(.tags(.checkout), .timeLimit(.minutes(1)))
    func total() async throws {
        let cart = try #require(await Cart.load())   // unwraps or fails the test
        #expect(cart.total == 42)
        #expect(throws: CartError.self) { try cart.apply(code: "bad") }
    }

    @Test(arguments: [1, 2, 3]) func positive(value: Int) { #expect(value > 0) }
}
```

| Piece | Use |
|-------|-----|
| `@Test`, `@Suite` | Test and group; suite traits cascade to its tests |
| `#expect`, `#require` | Soft check; `#require` stops the test and unwraps optionals |
| `#expect(throws:)` | Error expectations |
| `@Test(arguments:)` | Parameterized tests |
| `confirmation(_:expectedCount:...)` | Callback or event based code (replaces `XCTestExpectation`) |
| `.serialized`, `.tags(_:)`, `.timeLimit(_:)`, `.enabled(if:)`, `.disabled(_:)` | Traits |

Symbol pages: `Suite(_:_:)`, `require(_:_:sourceLocation:)`, `confirmation(_:expectedCount:isolation:sourceLocation:_:)`, `Trait.serialized`, `Trait.tags(_:)`, `Trait.timeLimit(_:)`, each under `documentation/testing/` (Swift 6.0, Xcode 16.0; `timeLimit` needs iOS 16 / macOS 13).

Async and actor code needs no special API: mark the test `async`, `await` directly, add `@MainActor` to the test or suite for `@MainActor` view models (see concurrency.md).

## Swift 6.2 (Xcode 26.0)

### Exit tests
Verify that code terminates (a failed `precondition`, `fatalError`). The body runs in a child process; the parent suspends until it exits.

```swift
@Test func rejectsInvalidInput() async {
    await #expect(processExitsWith: .failure) { Customer.current.eat(junkFood) }
}
```

- Macro: `expect(processExitsWith:observing:_:sourceLocation:performing:)` and the `require` twin (Swift 6.2, Xcode 26.0). Conditions: `.success`, `.failure`, `.exitCode(_:)`, `.signal(_:)`.
- Platforms per Apple's article: macOS, Linux, FreeBSD, OpenBSD, Windows. **Not iOS, iPadOS, tvOS, watchOS or visionOS**: put exit tests in a macOS-capable target (e.g. a Swift package).
- Capturing parent values in the body (`{ [food] in ... }`) needs Swift 6.3+; captured values must be `Sendable` and `Codable`. Exit tests cannot nest.
- Source: https://developer.apple.com/documentation/testing/exit-testing

### Attachments
Attach evidence to results: `Attachment.record(_:named:sourceLocation:)` (Swift 6.2, Xcode 26.0). `Array`, `ContiguousArray`, `ArraySlice`, `Data`, `String`, `Substring` attach as-is; `Encodable` / `NSSecureCoding` values need `Attachable` conformance (default implementation when the test target imports Foundation). Files and directories attach by URL: create `try await Attachment(contentsOf:named:)` (async, throwing), then record it.
Source: https://developer.apple.com/documentation/testing/attachments

## Swift 6.3 (Xcode 26.4)

| API | Use |
|-----|-----|
| `Issue.record(_:severity:sourceLocation:)` with `Issue.Severity` | `.warning` shows in results without failing the test |
| `try Test.cancel(_:sourceLocation:)` (`throws -> Never`) | Cancel the running test and its task hierarchy, e.g. skip one argument of a parameterized test |
| `Attachment(_:named:as:sourceLocation:)`, `AttachableAsImage`, `AttachableImageFormat` | Image attachments on Apple and Windows platforms via cross-import overlays with UI frameworks such as UIKit |
| Exit test value capturing | See above |

Symbol pages list Swift 6.3 / Xcode 26.4 for `Issue.record(_:severity:sourceLocation:)`, `Test.cancel`, `Attachment.init(_:named:as:sourceLocation:)`, `AttachableAsImage`, `AttachableImageFormat`. The Swift 6.3 post lists the Swift Testing proposals ST-0012, ST-0013, ST-0014, ST-0015, ST-0016, ST-0017 and ST-0020 without mapping each to a feature. Source: https://www.swift.org/blog/swift-6.3-released/

## Swift 6.4 (Xcode 27.0)

- **`CustomTestReflectable`** (`var customTestMirror: Mirror { get }`, Swift 6.4 / Xcode 27.0, ST-0022): customize how a type appears in failed-expectation output.
- **`Transferable` attachments** (Apple platforms, ST-0023): `import CoreTransferable`, then `try await Attachment(exporting: value, as: .pdf)` (the `as:` content type is optional) and `Attachment.record(_:)`. The initializer exists only when the test target imports CoreTransferable.
- **Interop (ST-0021)**: `XCTAssert` works inside Swift Testing tests and `#expect` inside XCTests; a failed cross-framework assertion surfaces as a runtime warning, controlled by the test plan's "Swift Testing and XCTest Interoperability" setting.
- **`swift test` repetition** (ST-0024): see swift-6-4.md.
- Sources: https://www.swift.org/blog/swift-6.4-released/, https://developer.apple.com/documentation/testing/customtestreflectable

## UI tests with Swift Testing (Xcode 27.3 beta)

> **Beta.** Xcode 27.3 is a beta; verify before shipping a test architecture on it. Xcode 27.2 is the current release.

Xcode 27.3 beta release notes: "Xcode now supports writing UI tests with Swift Testing and `XCUIAutomation`" (Swift Testing, 95593221) and "`XCUIAutomation` supports setting the hinge angle on iPhone Duo with a new `XCUIHinge` class" (UI Automation, 187479559). `XCUIDevice.hinge` returns `XCUIHinge?` (nil when the device has no hinge) and `XCUIHinge.angle` is `CGFloat { get set }`; setting it can switch displays, and opening the hinge programmatically on a closed physical device fails the test. The symbol pages carry no OS version (Xcode 16.3 only), so treat the 27.3 beta notes as the availability source. Pages: `documentation/xcuiautomation/xcuihinge`, `.../xcuidevice/hinge`.

Until 27.3 ships, write UI tests with XCUITest (below). `XCUIVoiceOverService` (iOS 27.0, `@MainActor class`) drives VoiceOver from UI tests.

## XCTest: legacy path

Keep XCTest for UI tests on Xcode 27.2 and earlier, performance metrics (`measure`), and projects not yet migrated. Migrate one file at a time using ST-0021 interop; Apple's guide: https://developer.apple.com/documentation/testing/migratingfromxctest

- Async: mark methods `async` / `async throws`, `await` directly; no expectations needed.
- `@MainActor` on the class or method for `@MainActor` view models.
- Cancellation, actors and async sequences test the same way as in Swift Testing: `await` the actor, `task.cancel()` then expect `CancellationError`, iterate the stream with `for await`.
- XCUITest: accessibility identifiers for queries, `waitForExistence(timeout:)`, launch arguments for configuration, focused and fast tests.
- Snapshot testing (point-free `swift-snapshot-testing`): light/dark, Dynamic Type sizes, device sizes, reference images in git.

## Mocks

Mock the same protocol as the real dependency, stub return values, track calls. Use `@unchecked Sendable` only for mocks with mutable state guarded by a lock or actor.

## Best Practices

- One concept per test; test behavior, not implementation; mock external dependencies.
- Descriptive test names (Swift Testing accepts a display name or a raw identifier test name, Swift 6.2).
- Use `Issue.record(severity: .warning)` for non-failing diagnostics, `Test.cancel()` instead of silent early returns.
- Attach screenshots, JSON or logs on failure paths.
- Do not `sleep()`; use `confirmation`, `await`, or `waitForExistence`.
- Do not test private methods directly.
