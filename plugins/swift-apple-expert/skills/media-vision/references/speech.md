# Speech: SpeechAnalyzer, SpeechTranscriber, input providers

Verified 2026-11-13 on `https://developer.apple.com/tutorials/data/documentation/speech/<symbol>.json` and `.../updates/speech.json` (June 2026 entry).

## Verified symbols

| Symbol | Availability (symbol page) | Role |
|--------|----------------------------|------|
| `SpeechAnalyzer` (actor) | iOS/iPadOS/Mac Catalyst/macOS/tvOS/visionOS 26.0 | Manages one analysis session over modules |
| `SpeechTranscriber` | 26.0 | Speech-to-text module; `Preset`, `results`, `isAvailable`, `supportedLocales`, `installedLocales` |
| `AssetInventory`, `AssetInstallationRequest` | 26.0 | Check and install on-device models |
| `AnalyzerInput` | 26.0 | One chunk of audio for the analyzer |
| `AssetInputSequenceProvider` | **27.0** | Audio from a file or `AVAsset` as `analyzerInputs` |
| `CaptureInputSequenceProvider` | **27.0** | Audio from an `AVCaptureDevice` such as a microphone |
| `AnalyzerInputConverter` | **27.0** | Converts `AVAudioBuffer` to `[AnalyzerInput]` |
| `SFSpeechRecognizer` | iOS 10.0, macOS 10.15, visionOS 1.0; no deprecation flag | Legacy recognizer, still present |

Apple's June 2026 update line: access audio from a file, asset or capture device with `AssetInputSequenceProvider` or `CaptureInputSequenceProvider`, and convert buffers with `AnalyzerInputConverter`. `DictationTranscriber` and `SpeechDetector` also exist as modules (landing page).

## Transcribe a file (26.0 API)

Use the preset constants: `.transcription`, `.transcriptionWithAlternatives`, `.timeIndexedTranscriptionWithAlternatives`, `.progressiveTranscription`, `.timeIndexedProgressiveTranscription`.

```swift
import Speech
import AVFoundation

/// Transcribes an audio file with the on-device transcriber.
func transcribe(file url: URL, locale: Locale) async throws -> String {
    let transcriber = SpeechTranscriber(locale: locale, preset: .transcription)
    if let request = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
        try await request.downloadAndInstall()
    }
    let analyzer = SpeechAnalyzer(modules: [transcriber], options: nil)

    async let text: String = transcriber.results.reduce(into: "") { partial, result in
        partial += String(result.text.characters)
    }
    let audio = try AVAudioFile(forReading: url)
    if let last = try await analyzer.analyzeSequence(from: audio) {
        try await analyzer.finalizeAndFinish(through: last)
    } else {
        await analyzer.cancelAndFinishNow()
    }
    return try await text
}
```

Consume `results` concurrently with the analysis; it is an `AsyncSequence` of `SpeechTranscriber.Result` (`text` is an `AttributedString`, `alternatives`, `range`). Check `SpeechTranscriber.isAvailable` and `supportedLocales` first; if the device is unsupported, disable the feature or fall back to `DictationTranscriber` or `SFSpeechRecognizer` (the page names a fallback type but its name is stripped in the JSON; confirm in Xcode). Neither fallback exists on tvOS: `SpeechTranscriber` is tvOS 26.0, `DictationTranscriber` is iOS, iPadOS, Mac Catalyst, macOS and visionOS 26.0, `SFSpeechRecognizer` is iOS, macOS and visionOS only.

## Live capture (27.0)

`CaptureInputSequenceProvider.providerWithSession(from:compatibleWith:priority:)` (async, throws) or `provider(from:in:compatibleWith:priority:)` returns a provider whose `analyzerInputs` you pass to `SpeechAnalyzer.start(inputSequence:)`; it exposes `captureSession` and `captureAudioDataOutput`. For raw buffers you already own, `AnalyzerInputConverter.converter(compatibleWith:)` then `convert(_:at:)` / `flush()`. Pair with [avfoundation-capture.md](avfoundation-capture.md) for authorization and session rules. On 26.x deployment targets build the `AnalyzerInput` stream yourself; the providers do not exist there.

## Not verified

The sample above was not compiled in this task. `AnalyzerInput` construction from `AVAudioPCMBuffer` was not checked; session-level tuning advice for Speech at WWDC26 was not read.
