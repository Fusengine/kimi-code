---
name: apple-intelligence
description: Use when adding Apple Intelligence features to an Apple-platform app — Foundation Models framework (on-device and Private Cloud Compute language models, guided generation, tools), Writing Tools, Genmoji, Image Playground, Visual Intelligence — or when choosing between them and App Intents / Siri AI.
---

<objective>
Covers the Apple Intelligence surface a third-party app can adopt, verified against Apple's documentation JSON on 2026-11-13: the Foundation Models framework (SystemLanguageModel on device, PrivateCloudComputeLanguageModel on server, LanguageModelSession, @Generable guided generation, Tool calling, streaming, multimodal prompts, dynamic profiles, errors and availability), the system features (Writing Tools, Genmoji via NSAdaptiveImageGlyph, Image Playground, Visual Intelligence), and the HIG generative-AI rules.

A decision table routes each need to the right framework. App Intents, app schemas and Siri AI are already covered by `swiftui-core/references/app-intents.md` and `hig-system-surfaces.md`; this skill links to them instead of repeating them.
</objective>

# Apple Intelligence

Apple Intelligence integration for iOS, iPadOS, macOS, visionOS, watchOS and tvOS apps.

## Agent Workflow (MANDATORY)

Before ANY implementation, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Find existing Foundation Models, Writing Tools and App Intents usage
2. **research-expert** - Re-verify every symbol on its Apple JSON page (`https://developer.apple.com/tutorials/data/documentation/<path>.json`); the apple-docs MCP search is unreliable, never conclude absence from it
3. **mcp__apple-docs__search_apple_docs** - Cross-check only; confirm availability on the JSON page

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Generating, summarizing, extracting or classifying text with a language model
- Getting typed Swift output from a model (`@Generable`) or letting it call app code (`Tool`)
- Prompting with images, or routing hard requests to Private Cloud Compute
- Supporting Writing Tools, Genmoji or Image Playground in text and image UI
- Surfacing app content in Visual Intelligence search

### Decision table

| Need | Use | Reference |
|------|-----|-----------|
| Text generation or understanding inside your own feature, offline, private | `SystemLanguageModel` + `LanguageModelSession` | [foundation-models.md](references/foundation-models.md) |
| Typed output, tool calling, streaming, images in prompts | `@Generable`, `Tool`, `streamResponse`, `Attachment` | [foundation-models-generation.md](references/foundation-models-generation.md) |
| Long documents or deeper reasoning (32K context, reasoning levels) | `PrivateCloudComputeLanguageModel` (iOS 27+, entitlement, daily quota) | [foundation-models-pcc.md](references/foundation-models-pcc.md) |
| Users rewrite, proofread, summarize their own text | Writing Tools (free in standard text views) | [system-features.md](references/system-features.md) |
| Custom emoji inside text | Genmoji (`NSAdaptiveImageGlyph` for custom text engines) | [system-features.md](references/system-features.md) |
| Users create images in your app | Image Playground sheet or view controller | [system-features.md](references/system-features.md) |
| Camera or screenshot search that shows your content | Visual Intelligence (`IntentValueQuery`) | [system-features.md](references/system-features.md) |
| Siri AI, Spotlight semantic index, Shortcuts, on-screen awareness | App Intents + schemas, not the model APIs | `swiftui-core/references/app-intents.md`, `swiftui-core/references/hig-system-surfaces.md` |
| Bring your own or open-source model behind the same API | `LanguageModel` protocol, Core AI | [foundation-models-pcc.md](references/foundation-models-pcc.md) |
| UX rules: transparency, refine/undo, feedback, safety | HIG generative AI | [design-guidance.md](references/design-guidance.md) |

Rule of thumb from Apple: start on-device, evaluate with the Evaluations framework, move to Private Cloud Compute only when the feature needs more reasoning or context.

---

## Critical Rules

1. **Check availability first.** `SystemLanguageModel.default.availability` (or `isAvailable`) before any UI that depends on it; always ship a non-AI fallback ([HIG](references/design-guidance.md)).
2. **Switch on `availability` with `@unknown default`.** Reasons can be added later.
3. **One request per session at a time.** A second call before the first finishes is a runtime error; check `isResponding`.
4. **Gate by OS.** FoundationModels starts at 26.0; `PrivateCloudComputeLanguageModel`, `Attachment`, `LanguageModelError`, dynamic profiles start at 27.0. Use `#available`, newest first.
5. **Private Cloud Compute needs the `com.apple.developer.private-cloud-compute` entitlement.** Without it the app crashes on the first prompt, even though `availability` says available.
6. **Never trust model output blindly.** Constrain it with `@Generable` enums/ranges, handle `guardrailViolation` and `refusal`, keep instructions to trusted content.
7. **Do not use the on-device model for** basic math, code generation or logical reasoning (Apple's own list).
8. **Localize.** Prompts, `@Guide` descriptions and UI text go through String Catalogs; check `supportsLocale()` before calling the model.

---

## Privacy

| Path | Where data goes | Source |
|------|-----------------|--------|
| `SystemLanguageModel` | Stays on device, works offline | Foundation Models overview |
| `PrivateCloudComputeLanguageModel` | Apple's Private Cloud Compute; network required; Apple states it preserves privacy | PCC article |
| Image Playground (27) | Apple pages disagree: the 27-era overview and What's New say images are generated on Private Cloud Compute; the Get Started page still says on device. Treat as PCC and disclose it | see system-features.md |
| Third-party `LanguageModel` providers | Provider's policy; HIG: get to know their privacy features before sending photos or personal data | Safety article |

HIG: ask permission before using personal information, minimize what is sent, tell people when data may leave the device ([design-guidance.md](references/design-guidance.md)).

---

## Reference Guide

| Need | Reference |
|------|-----------|
| Availability, model variants, sessions, prompting, context window, errors, safety, languages | [foundation-models.md](references/foundation-models.md) |
| `@Generable`, `@Guide`, streaming, tools, tool-calling modes, images, Vision tools | [foundation-models-generation.md](references/foundation-models-generation.md) |
| Private Cloud Compute, quota UI, reasoning levels, dynamic profiles, custom models | [foundation-models-pcc.md](references/foundation-models-pcc.md) |
| Writing Tools, Genmoji, Image Playground, Visual Intelligence | [system-features.md](references/system-features.md) |
| HIG generative-AI summary and links | [design-guidance.md](references/design-guidance.md) |

---

## Best Practices

1. **Smallest model first** - On-device, then PCC after evaluation
2. **Typed output** - `@Generable` with short names and few `@Guide` descriptions (they cost context tokens)
3. **Short prompts** - One task per prompt, at most three paragraphs
4. **Fresh sessions** - New `LanguageModelSession` per unrelated task; reseed from a trimmed `Transcript` after `contextSizeExceeded`
5. **Prewarm** - `prewarm(promptPrefix:)` only with at least 1 second of lead time
6. **Test for real** - Foundation Models instrument in Instruments, Evaluations framework, simulated availability and quota in the Xcode scheme
7. **Let people stay in control** - Undo, retry, edit near generated content; label AI output
