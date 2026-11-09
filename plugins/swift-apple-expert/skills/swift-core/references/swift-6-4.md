---
name: swift-6-4
description: Swift 6.4.x language, library and tooling additions (6.4.2 ships with Xcode 27.2) - SwiftPM on Swift Build, Subprocess 1.0, source-break notes
when-to-use: using Swift 6.4 syntax or libraries, running swift build/test/package, spawning processes, migrating a project to Xcode 27
keywords: Swift 6.4, Swift Build, SwiftPM, Subprocess, SBOM, SE-0521, SE-0522, SE-0491, SE-0508, Iterable, UniqueArray, Span, std::span
priority: medium
related: concurrency.md, testing.md, performance.md
---

# Swift 6.4.x

Swift 6.4.0 shipped 2026-09-14/15; 6.4.1 on 2026-10-12; 6.4.2 on 2026-10-30. Xcode 27.2 bundles Swift 6.4.2 (`swift --version` shows "Apple Swift version 6.4.2"). Patch releases are bug fixes: write against the 6.4 language mode.

Sources: https://www.swift.org/blog/swift-6.4-released/ , https://www.swift.org/install/macos/ , https://github.com/swiftlang/swift/releases , Xcode 27 release notes (https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes).

## Tooling

| Change | What to do |
|--------|-----------|
| **Swift Build is the default SwiftPM build system** | `swift build` / `swift test` / `swift run` behave the same on macOS, Linux, Windows; SwiftPM and Xcode share one engine. Do not assume the old native build system's flags or output layout; verify custom scripts and CI caches. |
| SBOM generation from SwiftPM (SE-0509) | Emit SPDX or CycloneDX documents; see https://docs.swift.org/latest/documentation/packagemanagerdocs/generatingsboms |
| `swift test` repetition (ST-0024) | `swift test --maximum-repetitions N --repeat-until pass\|fail` repeats only matching test cases (flaky-test triage) |
| Test failure summary | `swift test` summarizes failing test targets at the end |
| Module tracking in debug info | LLDB resolves explicitly-built modules precisely; dSYMs are smaller. No code change. |
| Xcode 27 Swift dependency scanner | Every Clang module reachable from one scan must have a unique module name; duplicated module names (vendored `module.modulemap` redeclaring an SDK module) can now error. |

## Language

- **Optional `some` / `any` without parentheses** (SE-0521): `some Rocket?` instead of `(some Rocket)?`.
- **`@diagnose`** (SE-0522): set warning behavior (ignore / warn / error) in source instead of only in build settings.
- **Module selectors** (SE-0491): `ModuleA::CommonThing` disambiguates a type exported by two imported modules.
- **Source break, SE-0508**: a computed property with both an `init` accessor and an array/dictionary-literal initial value no longer compiles if the getter is declared before the `init` accessor. Declare the `init` accessor first (Xcode 27 known issue).
- Async `defer`, cancellation shields, `@Observable` tracking: see [concurrency.md](concurrency.md).

## Performance and memory safety

- `Span` / `RawSpan` bridge to C++20 `std::span` (no manual conversion at the boundary).
- Borrow / mutate accessors for `Span` and `InlineArray` properties (SE-0507); `Ref` / `MutableRef` (SE-0519); non-copyable types can be `Equatable`, `Comparable`, `Hashable`; Optional of non-copyable improved (SE-0532).
- `UniqueBox` (SE-0517) and `UniqueArray` (SE-0527): heap value / array of non-copyable elements without copy-on-write or reference counting.
- `Iterable` protocol (SE-0516): iterate and borrow elements without copying; broader than `Sequence`.
- `withTemporaryAllocation` scratch buffer (SE-0524); safe `RawSpan` load/store APIs replace the unsafe-flagged ones (SE-0525).
- C interop: `@c` plus `@implementation` implements a C header function in Swift.

## Subprocess 1.0

`swift-subprocess` reached 1.0: cross-platform, built on Swift concurrency. Prefer it over `Process` / `NSTask` for new code that runs and streams external programs (CLI tools, build scripts, agents on macOS/Linux/Windows). It is a SwiftPM dependency, not part of Foundation.

```swift
import Subprocess

let result = try await Subprocess.run(
    .name("ls"),
    arguments: ["-la"],
    output: .string(limit: 4096)
)
print(result.standardOutput)
```

Docs: https://swiftpackageindex.com/swiftlang/swift-subprocess/documentation/subprocess . iOS, tvOS, watchOS and visionOS apps cannot spawn arbitrary processes: Subprocess targets macOS (and Linux/Windows tooling).

## Foundation

`ProgressManager` gained async/await support (SF-0023).

## Embedded / Wasm (non-Apple targets)

Embedded Swift supports existential types (`any Protocol`), including throwing and catching any `Error`; `EmbeddedRestrictions` warning via `swiftSettings: [.treatWarning("EmbeddedRestrictions", as: .warning)]`. The Wasm SDK installs from swift.org; JavaScriptKit bridging is up to 40x faster. Outside this plugin's Apple-app scope: mention only when asked.
