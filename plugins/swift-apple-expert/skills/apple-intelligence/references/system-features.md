---
name: system-features
description: Writing Tools, Genmoji, Image Playground and Visual Intelligence integration, plus the App Intents hand-off for Siri AI
when-to-use: Supporting Apple Intelligence system features in text views, image creation UI or visual search
keywords: Writing Tools, UIWritingToolsCoordinator, writingToolsBehavior, NSAdaptiveImageGlyph, Genmoji, imagePlaygroundSheet, ImagePlaygroundViewController, IntentValueQuery, SemanticContentDescriptor
priority: medium
related: foundation-models.md, design-guidance.md
---

# Apple Intelligence system features

Entry pages (read 2026-11-13): https://developer.apple.com/apple-intelligence/ , /get-started/ , /whats-new/. Symbol pages below https://developer.apple.com/documentation ; JSON mirror: `/tutorials/data/documentation/...json`.

## Writing Tools (rewrite, proofread, summarize)

Standard views get it automatically: `UITextView`, `UITextField`, `NSTextView`, `NSTextField`, SwiftUI `Text` (selectable), `TextField`, `TextEditor`, `WKWebView` (Get Started names `Text`, `UITextView`, `NSTextView`, `WKWebView`; the UIKit/AppKit/SwiftUI Writing Tools pages add the field and editor types). Do nothing unless you need to tune it.

| Goal | API | Availability |
|------|-----|--------------|
| Pick experience or disable (SwiftUI) | `.writingToolsBehavior(_:)` with `WritingToolsBehavior` `.automatic/.complete/.limited/.disabled` | iOS/iPadOS 18.0, macOS 15.0, visionOS 2.4 |
| Pick experience or disable (UIKit) | `writingToolsBehavior` = `UIWritingToolsBehavior` `.default/.complete/.limited/.none` | iOS/iPadOS 18.0, visionOS 2.4 |
| AppKit equivalent | `NSWritingToolsBehavior` (see `/appkit/writing-tools`) | platform not opened; check the page |
| Custom text view | `UIWritingToolsCoordinator(delegate:)` + `addInteraction(_:)`; AppKit `NSWritingToolsCoordinator` via the view's `writingToolsCoordinator` | iOS 18.2 / macOS 15.2 |
| Is it supported on this device | `UIWritingToolsCoordinator.isWritingToolsAvailable` (true even if the user has it off) | iOS 18.2 |

```swift
TextEditor(text: $notes)
    .writingToolsBehavior(.disabled)      // e.g. a code listing editor
```

- Limited experience keeps changes in the Writing Tools panel until approved; complete shows them inline with accept/reject.
- While active the system edits your content temporarily: suspend cloud sync/autosave. UIKit hooks: `textViewWritingToolsWillBegin(_:)` / `textViewWritingToolsDidEnd(_:)` (complete) and `willPresentWritingTools()` / `didDismissWritingTools()` (limited). Protect ranges (code, names, quotes) with `textView(_:writingToolsIgnoredRangesInEnclosingRange:)`.
- Custom engines also see pasteboard-based support: `/appkit/supporting-writing-tools-via-the-pasteboard`.
- Siri: the overview page says writing and editing with Siri works systemwide in standard text controls; custom controls adopt the same Writing Tools APIs.
- Source: `/uikit/writing-tools`, `/appkit/writing-tools`, `/uikit/customizing-writing-tools-behavior-for-system-views`, `/swiftui/view/writingtoolsbehavior(_:)`.

## Genmoji

Genmoji are inline images, not text. Per Apple's overview, Genmoji are supported automatically as stickers in your app when you use system text controls. For a custom text engine, preserve the `adaptiveImageGlyph` attribute (`NSAdaptiveImageGlyphAttributeName` in Objective-C) when you filter or rewrite attributed strings, and persist `NSAdaptiveImageGlyph.imageContent` with your content. Never strip unknown attributes in a custom text storage.

- `NSAdaptiveImageGlyph` (UIKit page: iOS/iPadOS 18.0, tvOS 18.0, visionOS 2.0, watchOS 11.0; an AppKit twin exists): `init(imageContent:)`, `imageContent`, `contentIdentifier`, `contentDescription`, `contentType`.
- You normally receive instances only from the text input system.
- Source: `/uikit/nsadaptiveimageglyph`, `/appkit/nsadaptiveimageglyph`. The exact opt-in trait for custom text inputs was not verified (the page I tried returned no data): check `UITextInputTraits` docs.

## Image Playground

Source: `/imageplayground`, `/whats-new` (Apple Intelligence). WWDC26 session 375 "Create high-quality images using Image Playground" (https://developer.apple.com/videos/play/wwdc2026/375/).

- **SwiftUI**: `.imagePlaygroundSheet(isPresented:concepts:sourceImage:onCompletion:onCancellation:)` (iOS/iPadOS 18.1, macOS 15.1, visionOS 2.4). Completion returns a file `URL`. Gate the button with `@Environment(\.supportsImagePlayground)`.
- **UIKit/AppKit**: `ImagePlaygroundViewController` (delegate delivers the image or cancel; `concepts`, `sourceImage`, `allowedGenerationStyles`, `selectedGenerationStyle`, `personalizationPolicy`); `ImagePlaygroundViewController.isAvailable` (class var).
- **Input**: `ImagePlaygroundConcept.text(_:)`, `.extracted(from:title:)`, `.drawing(_:)`, `.image(_:)`.
- **Options** (`ImagePlaygroundOptions`, 26.4; apply with `.imagePlaygroundOptions(_:)` or the controller's `options`): `creationVariety` (26.4), `personalization` `.automatic/.enabled/.disabled` (26.4), and new in 27.0 `creationStrategy` `.automatic/.editExisting/.generateNew` and `sizeSpecification` via `SizeSpecification.closest(to:)`.
- **`ImageCreator` is deprecated in 27.0** ("Use ImagePlaygroundViewController or imagePlaygroundSheet"). Do not build new code on it, even though the Get Started page still advertises it.
- Where it runs: the 27-era Apple Intelligence overview and What's New say the new model runs on Private Cloud Compute and images are not stored or shared; the Get Started page still says generation is on device. Disclose possible server processing ([design-guidance.md](design-guidance.md)).

```swift
@Environment(\.supportsImagePlayground) private var supportsImagePlayground
@State private var showSheet = false

if supportsImagePlayground {
    Button("Create image") { showSheet = true }
        .imagePlaygroundSheet(isPresented: $showSheet) { url in imageURL = url }
}
```

## Visual Intelligence

Users search with the camera (iPhone), onscreen content (Mac, iPad) or objects around them (Vision Pro); your app returns matching content as `AppEntity` values and opens it from an `OpenIntent`. Source: `/visualintelligence`, `/visualintelligence/integrating-your-app-with-visual-intelligence`.

1. Make a localized `DisplayRepresentation` (title, subtitle, image) on an `AppEntity` (`IndexedEntity` in Apple's sample).
2. Implement `IntentValueQuery` (26.0 on all platforms) and `values(for: SemanticContentDescriptor)`.
3. Read `labels` (high-level en_US terms such as "tower"; not translated, may change; never the proper name) and `pixelBuffer`, search your content, return entities. Return fast; cap the list (about 100) and link to the full list in-app.
4. Provide an `OpenIntent` per entity type (one per `@UnionValue` member).

```swift
struct LandmarkIntentValueQuery: IntentValueQuery {
    @Dependency var modelData: ModelData
    func values(for input: SemanticContentDescriptor) async throws -> [VisualSearchResult] {
        guard let pixelBuffer = input.pixelBuffer else { return [] }
        return try await modelData.search(matching: pixelBuffer)
    }
}
```

`SemanticContentDescriptor`: iOS/iPadOS 26.0, macOS/Mac Catalyst 27.0. The `VisualSearchResult` type is used in Apple's sample; its declaration was not opened.

## App Intents, schemas, Siri AI (do not duplicate)

Code and rules live in `swiftui-core/references/app-intents.md` and `hig-system-surfaces.md`. Facts from the App Intents pages (read 2026-11-13) that decide routing:

- Apple Intelligence uses your intents/entities/enums; steps: index entities for Spotlight, choose `Transferable` types, adopt **schemas** (`@AppIntent(schema:)`, `@AppEntity(schema:)`, `@AppEnum(schema:)`; domains in `/appintents/app-schema-domains`), associate entities with onscreen views (`appEntityIdentifier(_:)` SwiftUI 18.4+, `appEntityIdentifier` property on UIKit/AppKit responders), donate actions.
- The Apple Intelligence overview and What's New pages name a new View Annotations API and an App Intents Testing framework (`AppIntentsTesting`); I did not verify those symbols.
- **Siri AI Developer Preview** (`/appintents/siri-ai-developer-preview`): custom actions/content for Siri; may change; not available to external TestFlight testers or App Store builds; test with a development profile or internal TestFlight on an Apple Intelligence device.
