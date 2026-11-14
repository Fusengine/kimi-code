---
name: foundation-models
description: Foundation Models framework core - availability, model variants, sessions, prompting, context window, errors, safety, languages
when-to-use: Calling the on-device Apple Foundation Model from a Swift app
keywords: FoundationModels, SystemLanguageModel, LanguageModelSession, availability, context window, LanguageModelError, guardrails
priority: high
related: foundation-models-generation.md, foundation-models-pcc.md, design-guidance.md
---

# Foundation Models - Core

Sources (all read 2026-11-13). Each page has a JSON mirror: replace `/documentation/` with `/tutorials/data/documentation/` and append `.json`.
Base: https://developer.apple.com/documentation/foundationmodels (symbol pages below it).

## Overview

`SystemLanguageModel` is the on-device model behind Apple Intelligence; `LanguageModelSession` is the stateful context you prompt it with. Platform pages (read 2026-11-13): `LanguageModelSession` is iOS, iPadOS, macOS, visionOS 26.0+, watchOS 27.0+, tvOS 27.0+ (tvOS page for `SystemLanguageModel` shows 27.3 beta). `SystemLanguageModel` is not listed for watchOS: Watch apps use the server model.

## Check availability

Source: `/foundationmodels/detecting-available-apple-foundation-models`, `/foundationmodels/systemlanguagemodel` (`isAvailable`, `availability`, `Availability`, `UnavailableReason` - iOS 26.0).

```swift
let model = SystemLanguageModel.default
switch model.availability {
case .available:
    break // show the intelligence UI
case .unavailable(.deviceNotEligible):
    break // offer the non-AI path
case .unavailable(.appleIntelligenceNotEnabled):
    break // Apple Intelligence is off (iOS 27+: on by default, cannot be turned off)
case .unavailable(.modelNotReady):
    break // downloading or other system reason
@unknown default:
    break
}
```

- Quick Boolean: `model.isAvailable`. Check `.default` first; specialized models such as `SystemLanguageModel(useCase: .contentTagging)` are not available unless the general model is.
- It can take time for the model to download after Apple Intelligence is enabled.
- Fall back to another model (server LLM, custom `LanguageModel`) for devices that never support it.

### Models and devices (27 generation)

| Model | Size / context (Apple table) | Runs | Symbol |
|-------|------------------------------|------|--------|
| AFM Core Advanced | 20B params, 8K tokens | on device | `SystemLanguageModel` |
| AFM Core | 3B params, 4-8K tokens | on device | `SystemLanguageModel` |
| AFM Cloud | 32K tokens | Private Cloud Compute | `PrivateCloudComputeLanguageModel` |

One on-device model per device, chosen by the system; the app cannot pick. Apple Watch has no on-device model, only AFM Cloud via a paired Apple Intelligence iPhone. Per-device matrix: read the article before promising a variant.

Detect the variant (iOS/iPadOS/macOS/visionOS 27.0+ `variant`, `Variant.core3`, `.coreAdvanced3`, `displayName`); earlier OS: `#available` newest first (26.4 = AFM 2.1 Core, 26.0-26.3 = AFM 2 Core):

```swift
if #available(iOS 27.0, macOS 27.0, visionOS 27.0, *) {
    let name = SystemLanguageModel.default.variant.displayName
}
```

Context size: read `contextSize` (back-deployed before 26.4) and `tokenCount(for:)` (26.4+) instead of hard-coding. Apple's articles still quote 4,096 tokens for the older model while the 27 table says 4-8K: the runtime value wins.

## Sessions and prompting

Source: `/foundationmodels/generating-content-and-performing-tasks-with-foundation-models`, `/foundationmodels/languagemodelsession` (26.0; watchOS 27.0).

```swift
let session = LanguageModelSession(instructions: "Suggest five related topics, three to seven words each.")
let response = try await session.respond(to: "Making homemade bread")
print(response.content)
```

- Single-turn: new session per call. Multi-turn: reuse the session; it keeps a `Transcript`.
- **Instructions** outrank the prompt; keep them trusted (role, task, style, safety). **Prompt**: one specific task, imperative, bounded length ("in three sentences").
- `respond` is async; a session handles one request at a time. Check `isResponding`.
- `GenerationOptions(temperature:)`, `samplingMode: .greedy` for deterministic picks, `maximumResponseTokens` only to stop runaway output (can yield truncated text).
- Good fits: summarize, extract entities, classify, refine text, tags, game dialog. Poor fits: basic math, code generation, logical reasoning.
- `SystemLanguageModel(useCase: .contentTagging)` for tag generation.
- `prewarm(promptPrefix:)` when the user is likely to prompt within seconds (needs >= 1 s lead).
- Background work: prefer non-streaming `respond` to reduce `rateLimited` errors.

## Context window

Source: `/foundationmodels/managing-the-context-window`.

Everything counts: instructions, prompts, tool definitions and I/O, `@Generable` schemas, responses. On overflow the session throws `LanguageModelError.contextSizeExceeded`; start a new session seeded from a trimmed `Transcript`:

```swift
func trimmed(_ old: LanguageModelSession) -> LanguageModelSession {
    let entries = [old.transcript.first, old.transcript.last].compactMap { $0 }
    let session = LanguageModelSession(transcript: Transcript(entries: entries))
    session.prewarm()
    return session
}
```

Tactics: concise prompts; `@Guide(.maximumCount)` on arrays; short property names; 3-5 tools max; split big jobs across sessions and chain summaries. Profile token use with Instruments > Foundation Models template.

## Errors

Source: `/foundationmodels/languagemodelerror` (27.0, `@nonexhaustive`). `GenerationError` is deprecated 27.0: Xcode 27 builds throw `LanguageModelError`, `SystemLanguageModel.Error` or `LanguageModelSession.Error` instead (`/foundationmodels/languagemodelsession/generationerror`).

Cases: `contextSizeExceeded`, `rateLimited`, `refusal`, `timeout`, `guardrailViolation`, `unsupportedCapability`, `unsupportedTranscriptContent`, `unsupportedGenerationGuide`, `unsupportedLanguageOrLocale`. Built with Xcode 27 the framework can also throw `SystemLanguageModel.Error` (e.g. `assetsUnavailable`) and `LanguageModelSession.Error`; PCC errors (`quotaLimitReached`, `networkFailure`, `serviceUnavailable`) are `PrivateCloudComputeLanguageModel.Error` ([foundation-models-pcc.md](foundation-models-pcc.md)). Tool failures surface as `LanguageModelSession.ToolCallError`. For OS 26 targets catch `LanguageModelSession.GenerationError` under an `#available(iOS 27.0, ...)` split.

## Safety

Source: `/foundationmodels/improving-the-safety-of-generative-model-output`.

- Two built-in layers: trained models + guardrails (`SystemLanguageModel.Guardrails`: `.default`, `.permissiveContentTransformations`). Input and output are both checked; violation throws `guardrailViolation`.
- String requests: a refusal arrives as text ("Sorry, I can't help"). Guided generation: it throws `refusal`; `refusal.explanation` gets a message (async, can fail; fall back to `debugDescription`).
- Prefer bounded input (fixed prompt choices) or bounded output (`@Generable` enum). Treat webpage or user text as untrusted. Multimodal: check each media item and the combination.

## Languages

Source: `/foundationmodels/supporting-languages-and-locales-with-foundation-models`.

The model is multilingual. Call `SystemLanguageModel.default.supportsLocale()` (uses the current, app-specific locale) before prompting; `supportedLanguages` lists them. Unsupported language throws `unsupportedLanguageOrLocale`; guardrails only cover supported languages. Put the target language in instructions; prompts and `@Generable` names/descriptions must be in a language the model supports.

## Prompt versioning

Source: `/foundationmodels/updating-prompts-for-new-model-versions`. Apple updates the model in OS releases. Record outputs per model version, keep prompts as versioned text or String Catalog keys (`String(localized:table:)`), gate with `#available`, or fetch prompts from a server.

## Testing

Xcode scheme option "Simulated Apple Foundation Models Availability"; Evaluations framework (`/evaluations`, 27.0) for datasets, metrics, prompt comparison; `#Playground` for quick trials.
