---
name: foundation-models-generation
description: Guided generation with @Generable and @Guide, streaming, tool calling, multimodal prompts and Vision tools
when-to-use: Getting typed output from a model, streaming partial results, letting the model call app code, prompting with images
keywords: Generable, Guide, streamResponse, Tool, ToolCallingMode, Attachment, OCRTool, BarcodeReaderTool, DynamicGenerationSchema
priority: high
related: foundation-models.md, foundation-models-pcc.md
---

# Foundation Models - Typed output, tools, images

Sources (read 2026-11-13), base https://developer.apple.com/documentation/foundationmodels : `/generating-swift-data-structures-with-guided-generation`, `/generable`, `/expanding-generation-with-tool-calling`, `/tool`, `/analyzing-images-with-multimodal-prompting`, `/languagemodelsession/streamresponse(to:generating:includeschemainprompt:options:)`. JSON mirror: `/tutorials/data/documentation/...json`.

## Guided generation

`@Generable` (structs, enums with associated values, actors; iOS 26.0, watchOS 27.0) makes the framework use constrained sampling, so the model cannot return malformed data. `@Guide(description:, constraints)` only on stored properties. Properties generate in declaration order.

```swift
@Generable(description: "Basic profile information about a cat")
struct CatProfile {
    var name: String                                   // clear name: no guide needed
    @Guide(description: "The age of the cat", .range(0...20))
    var age: Int
    @Guide(description: "A one sentence profile about the cat's personality")
    var profile: String
}

let response = try await session.respond(to: "Generate a cute rescue cat", generating: CatProfile.self)
let cat: CatProfile = response.content
```

- Supported basics: `Bool`, `Int`, `Float`, `Double`, `Decimal`, `Array`, nested `@Generable`. Use `GenerationID` for framework-generated identifiers.
- Guides seen in Apple samples: `.range(_:)`, `.count(_:)`, `.minimumCount(_:)`, `.maximumCount(_:)`, `.minimum(_:)`, `.maximum(_:)`.
- Schemas cost context tokens: short names, `@Guide` only where quality needs it, descriptions as short as possible. Test without guides first.
- Safety/accuracy trick: output a `@Generable enum` so the answer is always one of your cases. Use `GenerationOptions(samplingMode: .greedy)` to always pick the most likely case.
- Unknown at compile time (e.g. a restaurant menu): `DynamicGenerationSchema` -> `try GenerationSchema(root:dependencies:)` -> `respond(to:schema:)` returns `GeneratedContent`; read with `value(_:forProperty:)`.

## Streaming

Apple's page gives the declaration; it returns `LanguageModelSession.ResponseStream<Content>`, an `AsyncSequence` of `Snapshot` values whose `content` is the partially generated value (`Generable.PartiallyGenerated`).

```swift
let stream = session.streamResponse(to: "Generate a cute rescue cat", generating: CatProfile.self)
for try await snapshot in stream {
    partial = snapshot.content          // update @Observable state on the main actor
}
```

`ResponseStream.collect()` waits for the final response. `includeSchemaInPrompt` defaults to `true`; keep it unless the model has seen the format. In the background, use non-streaming `respond` (rate limiting).

## Tool calling

`Tool` (protocol, `Sendable`, iOS 26.0, watchOS 27.0): `name`, `description`, `@Generable struct Arguments`, `call(arguments:) async throws -> Output` where `Output` is `String`, `GeneratedContent` or a `@Generable` type. The framework puts name, description and parameters in the prompt; calls may run concurrently and in parallel.

```swift
struct BreadDatabaseTool: Tool {
    let name = "searchBreadDatabase"
    let description = "Searches a local database for bread recipes."

    @Generable
    struct Arguments {
        @Guide(description: "The type of bread to search for") var searchTerm: String
        @Guide(description: "The number of recipes to get", .range(1...6)) var limit: Int
    }

    func call(arguments: Arguments) async throws -> String {
        // query your store; return a short string or a @Generable value
        "..."
    }
}

let session = LanguageModelSession(tools: [BreadDatabaseTool()])
let answer = try await session.respond(to: "Find three sourdough bread recipes")
```

- Keep 3-5 tools, short descriptions. If the model always needs a piece of data, put it in the prompt instead of a tool.
- **Tool calling mode** (`ToolCallingMode`, 27.0): `.allowed`, `.required`, `.disallowed` (without it the model decides) via `GenerationOptions(toolCallingMode:)`. With `.required` you must define an exit (throw from the tool, or change the mode in a `DynamicProfile`), otherwise the model keeps calling.
- Errors: throw to abort (not authorized, network too slow) or return a short failure string. The session throws `LanguageModelSession.ToolCallError` (`tool`, `underlyingError`) and rolls the transcript back; `transcriptErrorHandlingPolicy` (`.preserveTranscript`) changes that.
- Integrate existing frameworks (Contacts, HealthKit) inside tools so their permissions still apply.
- `session.transcript` is observable (entries: `.instructions`, `.prompt`, `.toolCalls`, `.toolOutput`, `.response`, `.reasoning`) - useful to render a call graph in SwiftUI.

## Images (27.0)

`Attachment` (27.0 all platforms) inside a prompt builder; supports `CGImage`, `CIImage`, `CVPixelBuffer`, image URLs; the framework scales and converts. `orientation:` fixes untransformed images; `.label(_:)` names an image for tools.

```swift
@Generable enum ImageLabel { case cat, dog, frog, bird }

func classify(_ image: CGImage) async throws -> ImageLabel {
    let session = LanguageModelSession()
    let response = try await session.respond(
        generating: ImageLabel.self,
        options: GenerationOptions(samplingMode: .greedy)
    ) {
        "Choose the label that best represents the following image:"
        Attachment(image)
    }
    return response.content
}
```

- Be specific ("List all food items in this photo"), crop to the region of interest, constrain output with `@Generable`.
- Vision tools (`import Vision`; `ToolCallingMode` is `GenerationOptions.ToolCallingMode`) plug into a session: `OCRTool` (iOS/iPadOS/macOS/visionOS 27.0, not in Simulator) and `BarcodeReaderTool` (27.0, incl. watchOS): `LanguageModelSession(tools: [OCRTool()])`, then label the attachment.
- Custom image tools receive an `ImageReference` argument and resolve it with `resolved(in: Transcript)`.
- Run on-device first; use `PrivateCloudComputeLanguageModel` if more reasoning or context is needed ([foundation-models-pcc.md](foundation-models-pcc.md)). Check multimodal safety ([foundation-models.md](foundation-models.md)).

## Swift 6 composition

Keep model calls out of views: an `@MainActor @Observable` view model owns the session and published state; tools are `Sendable` value types (or actors) and protocols live in `Protocols/` per `solid-swift`.
