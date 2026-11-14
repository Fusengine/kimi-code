# Core ML, Create ML, Translation, Natural Language, Music Understanding

Verified 2026-11-13 on `https://developer.apple.com/tutorials/data/documentation/<path>.json`. Core ML and Create ML (no Apple-dated change after June 2024 found; the `updates` page for Core ML stops there and the Create ML, Translation and Natural Language update pages return 404), Translation and Natural Language are stable: absence of a dated change is inferred, not stated by Apple.

## Overview

| Framework | Availability (landing / symbol pages) | Status |
|-----------|---------------------------------------|--------|
| Core ML (`MLModel`, `MLModelConfiguration`) | iOS 11.0 / 12.0, macOS 10.13, tvOS 11.0, visionOS 1.0, watchOS 4.0 | Present, not deprecated |
| Create ML | iOS 15.0, macOS 10.14, tvOS 16.0, visionOS 1.0 | Present |
| Core AI | 27.0, all platforms | New stack; language-model use is in the `apple-intelligence` skill, beyond that not checked here |
| Translation (`TranslationSession` iOS 18.0, `LanguageAvailability`) | framework iOS 17.4, macOS 14.4; Mac Catalyst 26.0 for session APIs; no tvOS, watchOS, visionOS | Stable |
| Natural Language (`NLTagger`, `NLLanguageRecognizer`, `NLEmbedding`) | iOS 12.0 / 13.0, macOS 10.14, tvOS 12.0, visionOS 1.0, watchOS 5.0 | Stable |
| Music Understanding (`MusicUnderstandingSession`, actor) | **27.0**, all platforms | New |

Core AI facts verified: iOS 27 release notes (Core AI section) list "when Metal API Validation is enabled, CoreAI models might fail to execute" as fixed; session 330 shows custom Metal ops integrated into Core AI (see `graphics-games`). Other Core AI topics (MLX, specialization, entitlements) were not checked.

## Translation (SwiftUI)

Built-in UI: `translationPresentation(isPresented:text:attachmentAnchor:arrowEdge:replacementAction:)`. Custom flow: `translationTask(_:action:)` with a `TranslationSession.Configuration(source:target:)`; `TranslationSession` offers `translate(_:)` (the `String` overload is iOS 18.0 / macOS 15.0; the `AttributedString` overload is iOS, iPadOS, Mac Catalyst and macOS 26.4, so gate it) returning a `Response` with `sourceText` and `targetText`, and `translations(from:)` for batches. `LanguageAvailability.status(from:to:)` checks support before offering a translation.

```swift
import SwiftUI
import Translation

struct TranslateView: View {
    @State private var configuration: TranslationSession.Configuration?
    @State private var translated = ""
    let source: String

    var body: some View {
        VStack {
            Text(translated.isEmpty ? source : translated)
            Button("Translate") {
                configuration = .init(source: nil, target: Locale.Language(identifier: "fr"))
            }
        }
        .translationTask(configuration) { session in
            if let response = try? await session.translate(source) { translated = response.targetText }
        }
    }
}
```

`translated` is a `@State` written from the task closure; keep it on the main actor.

## Music Understanding (27.0)

Create `MusicUnderstandingSession(asset:)` (async, throws) for a file or `init(audioProvider:)` for buffers, then `analyze()` or `analyze(for:)` with a set of `AnalysisType` (`.key`, `.rhythm`, `.structure`, `.pace`, `.instrumentActivity`, `.loudness`). `SessionResult` exposes optional `key`, `rhythm`, `structure`, `pace`, `instrumentActivity`, `loudness`. `loudnessResults` streams values while analysis runs; `cancel()` stops.

```swift
import MusicUnderstanding
import AVFoundation

/// Runs key and rhythm analysis on an audio asset.
func analyze(asset: AVAsset & Sendable) async throws -> MusicUnderstandingSession.SessionResult {
    let session = try await MusicUnderstandingSession(asset: asset)
    return try await session.analyze(for: [.key, .rhythm])
}
```

Sources: `musicunderstanding/musicunderstandingsession`, session 253 https://developer.apple.com/videos/play/wwdc2026/253/ (six dimensions, on device, Music Understanding Lab sample), article `musicunderstanding/create-visuals-using-musicunderstanding-analysis-results`.

## Decision guide

| Need | Use |
|------|-----|
| Ship a trained model with classic vision or sound tasks | Core ML (`MLModel`) |
| Train a model on a Mac | Create ML |
| Text translation in a SwiftUI app | Translation |
| Tokenize, tag, detect language, sentence embeddings | Natural Language |
| Tempo, key, structure of a track | Music Understanding |
| Generative language or Apple Intelligence | `apple-intelligence` skill |
