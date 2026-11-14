---
name: foundation-models-pcc
description: Private Cloud Compute model, quota UI, reasoning levels, dynamic profiles and custom LanguageModel providers
when-to-use: A feature needs more context or reasoning than the on-device model, or must swap models and tools at runtime
keywords: PrivateCloudComputeLanguageModel, quotaUsage, ContextOptions, reasoningLevel, DynamicProfile, Profile, LanguageModel, CoreAILanguageModel
priority: medium
related: foundation-models.md, foundation-models-generation.md
---

# Foundation Models - Private Cloud Compute, profiles, custom models

Sources (read 2026-11-13), base https://developer.apple.com/documentation/foundationmodels : `/adding-server-side-intelligence-with-private-cloud-compute`, `/privatecloudcomputelanguagemodel`, `/detecting-available-apple-foundation-models`, `/composing-dynamic-sessions-with-instructions-and-profiles`, `/running-a-core-ai-model-in-a-foundation-models-session`, `/languagemodel`. JSON mirror: `/tutorials/data/documentation/...json`.

## Private Cloud Compute (PCC)

`PrivateCloudComputeLanguageModel` (iOS, iPadOS, macOS, visionOS, watchOS 27.0+; not listed for tvOS) runs AFM Cloud: 32K-token context, reasoning levels, no API keys or authentication to manage, privacy preserved per Apple, network required, per-day request limit (people can upgrade iCloud+).

| | `SystemLanguageModel` | `PrivateCloudComputeLanguageModel` |
|---|---|---|
| Offline | yes | no |
| Usage limit | unlimited | per day |
| Reasoning | not supported | light / moderate / deep |
| Context | read `contextSize` (4-8K per the models article; this article's table says 4K) | 32K |

Apple's rule: build on-device first, evaluate (Evaluations framework), move up only if quality needs it.

### Setup

1. Request the managed entitlement `com.apple.developer.private-cloud-compute` (eligibility requirements apply). Without it the app **crashes with a fatal error on the first prompt**, even though `availability` reports `.available` (it only checks OS readiness).
2. Create one shared instance (creation starts an authentication and readiness check; a missing entitlement logs a warning).
3. Gate by OS and fall back to on-device when the network fails.

```swift
// PrivateCloudComputeLanguageModel exists from 27.0: keep creation behind the
// availability check when the deployment target is lower. Share one instance app-wide.
@available(iOS 27.0, macOS 27.0, watchOS 27.0, visionOS 27.0, *)
let pcc = PrivateCloudComputeLanguageModel()

func makeSession() -> LanguageModelSession {
    if #available(iOS 27.0, macOS 27.0, watchOS 27.0, visionOS 27.0, *), pcc.isAvailable {
        return LanguageModelSession(model: pcc)      // same respond/stream/tools API
    }
    return LanguageModelSession()                    // on-device (no on-device model on watchOS)
}
```

`pcc.availability` cases: `.available`, `.unavailable(.deviceNotEligible)`, `.unavailable(.systemNotReady)`, plus `@unknown default`.

`LanguageModelSession(model:)` with a `some LanguageModel` is one of several 27.0 overloads (`/foundationmodels/languagemodelsession/init(model:tools:instructions:)`, per Apple's PCC article).

### Quota

Treat quota as a final availability check: `pcc.quotaUsage.isLimitReached`. Show status UI, not a dismissible alert:

```swift
if pcc.quotaUsage.isLimitReached {
    Text("Usage limit exceeded")
} else if case .belowLimit(let info) = pcc.quotaUsage.status, info.isApproachingLimit {
    Text("Nearing usage limit")
}
if let suggestion = pcc.quotaUsage.limitIncreaseSuggestion {
    Button("Show options") { suggestion.show() }       // system upgrade UI
}
```

Mid-session the framework throws `PrivateCloudComputeLanguageModel.Error.quotaLimitReached` (same enum: `networkFailure`, `serviceUnavailable`; `/foundationmodels/privatecloudcomputelanguagemodel/error`, 27.0); `resetDate` says when it refreshes (empty if unknown). Not a rate limit: waiting a short time does not help. Test with the Xcode scheme option (Run > Options > "Simulated Apple Foundation Models Availability": approaching / reached).

### Reasoning

```swift
let response = try await session.respond(
    to: "What are the tradeoffs in this architecture?",
    contextOptions: ContextOptions(reasoningLevel: .deep)
)
```

`ContextOptions.ReasoningLevel`: `.light`, `.moderate`, `.deep`. Start at `.moderate`; `.deep` is slower and uses more context. Reasoning appears as `.reasoning` transcript entries, not in `response.content`.

## Dynamic profiles (27.0)

Swap instructions, tools, model and options per app state within one continuous session. Layers: `DynamicInstructions` (body re-evaluated before each request) -> `Profile` (instructions + modifiers `.model(_:)`, `.temperature(_:)`, `.samplingMode(_:)`, `.reasoningLevel(_:)`, `.maximumResponseTokens(_:)`, `.toolCallingMode(_:)`, `.transcriptErrorHandlingPolicy(_:)`) -> `LanguageModelSession.DynamicProfile` (exactly one `Profile` active, chosen with `if/else`).

```swift
struct EditorProfile: LanguageModelSession.DynamicProfile {
    var pcc = PrivateCloudComputeLanguageModel()
    var isEditingAnimation = false
    var body: some LanguageModelSession.DynamicProfile {
        if isEditingAnimation {
            Profile { AnimationEditingInstructions() }.model(pcc).reasoningLevel(.light)
        } else {
            Profile { ImageEditingInstructions() }.temperature(0.8)
        }
    }
}
let session = LanguageModelSession(profile: EditorProfile())
```

Modifier precedence: call-site `GenerationOptions` > innermost profile modifier > outer dynamic-profile modifier. Append conditional instructions and tools in place to keep prompt caching effective (`/optimizing-key-value-caching-in-language-model-sessions`). Per-session custom state: `SessionProperty`, `SessionPropertyKey`, `@SessionPropertyEntry`. Full worked sample: Apple's "Origami" tutorial linked from the framework page.

## Custom model providers

`LanguageModel` protocol (27.0, `Sendable`) lets any provider plug into the same session API: `LanguageModelSession(model: MyProvider())`, with an `Executor` and `LanguageModelExecutorGenerationChannel`; distribute through Swift Package Manager. Capability checks: `capabilities` (e.g. `.reasoning`).

Core AI (iOS/macOS 27, Xcode 27) runs open-source models you export with the `coreai-models` package: `CoreAILanguageModel(resourcesAt:)` (async load, `import CoreAILanguageModels`) then `LanguageModelSession(model: model)`. Load ahead of use; reasoning output goes to the transcript. Use this for devices without Apple Intelligence or cross-platform needs. Privacy then depends on the model you bundle.

WWDC26 (video pages titles read 2026-11-13): 242 "Build agentic app experiences with the Foundation Models framework", 339 "Bring an LLM provider to the Foundation Models framework", 243 "Debug and profile agentic app experiences with Instruments" (https://developer.apple.com/videos/play/wwdc2026/<id>/).
