# Vision

Verified 2026-11-13 on `https://developer.apple.com/tutorials/data/documentation/vision/<symbol>.json` and WWDC26 session 237 (https://developer.apple.com/videos/play/wwdc2026/237/).

## Verified symbols (Swift-native async API)

| Symbol | Availability | Note |
|--------|--------------|------|
| `RecognizeDocumentsRequest` | iOS/iPadOS/Mac Catalyst/macOS/tvOS/visionOS 26.0 | Document structure: text, tables, lists, barcodes; result `DocumentObservation` |
| `DetectLensSmudgeRequest` | 26.0, watchOS 27.0 | Detects lens smudge |
| `GenerateIterativeSegmentationRequest` | 27.0 (all but watchOS) | Mask from a point, rectangle or scribble, then refine |
| `RecognizeTextRequest`, `ImageRequestHandler`, `VisionRequest`, `ImageProcessingRequest` | iOS 18.0 / macOS 15.0, ImageRequestHandler and the protocols also watchOS 27.0 | Base types |

Vision runs on watchOS from 27.0 (session 237 and the watchOS availability on `ImageRequestHandler`, `VisionRequest`, `ImageProcessingRequest`, `DetectLensSmudgeRequest`). Not every request exists on watchOS: check each symbol page.

## Recognize a document (26.0)

`RecognizeDocumentsRequest` conforms to `ImageProcessingRequest`, whose `perform(on:orientation:)` accepts `URL`, `Data`, `CGImage`, `CVPixelBuffer`, `CMSampleBuffer` or `CIImage` and returns `Self.Result`.

```swift
import Vision

/// Returns the plain transcript of the first document found in an image file.
func transcript(of imageURL: URL) async throws -> String? {
    let request = RecognizeDocumentsRequest()
    let observations = try await request.perform(on: imageURL, orientation: nil)
    return observations.first?.document.text.transcript
}
```

`DocumentObservation.document` is a `Container` with `text`, `title`, `paragraphs`, `lists`, `tables`, `barcodes` (all 26.0). Configure `textRecognitionOptions` and `barcodeDetectionOptions`; `supportedRecognitionLanguages` lists languages. Use it for receipts, forms, labels and textbook pages; `RecognizeTextRequest` stays the lighter choice for plain text. WWDC25 session 272 (https://developer.apple.com/videos/play/wwdc2025/272/, read 2026-11-13): Vision returns one `DocumentObservation` per image, text is readable as `transcript`, lines, paragraphs or words (words unsupported for Chinese, Japanese, Korean, Thai), and tables expose cells by row and column. The `Result` typealias is not shown on the symbol page; the `observations.first` call shape above was not compiled here, so build it before relying on it.

## Iterative segmentation (27.0)

Initializers (verified): `init(seedPoint:_:)`, `init(seedBox:_:)`, `init(seedScribbleBuffer:_:)`; refine with `addIncludedPoint(_:)` / `addExcludedPoint(_:)` (both throwing). Apple's limit: at most 13 points when seeded with a point or scribble, 11 when seeded with a box. `qualityLevel` and `revision` exist; the request conforms to `DownloadableAssetsRequest`, so model assets may need downloading before first use. Sample project: `vision/segmenting-objects-using-taps-scribbles-or-rectangles` (its JSON page has no inline code).

## Rules

- Run requests off the main actor; update UI from the result.
- Handle an empty observation array.
- Foundation Models image input and Vision tools belong to the `apple-intelligence` skill; session 237 also covers them.
- Core Image RAW and `CIRAWFilter` (WWDC26 session 305) were not symbol-checked: session claim only.
