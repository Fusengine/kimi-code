---
name: design-guidance
description: HIG generative-AI rules - transparency, privacy, inputs, outputs, refining results, feedback during generation, continuous improvement
when-to-use: Designing or reviewing any UI that shows model-generated content
keywords: HIG, generative AI, transparency, privacy, hallucination, refine, undo, feedback, latency
priority: high
related: foundation-models.md, system-features.md
---

# Generative AI design guidance

Source: https://developer.apple.com/design/human-interface-guidelines/generative-ai (JSON: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/generative-ai.json), read 2026-11-13. Change log on the page: June 8, 2026 added "letting people refine results and providing feedback during content generation" and updated "choosing a model type"; June 9, 2025 first version. No platform-specific considerations. Related pages named there: machine-learning, inclusion, accessibility, privacy, loading, and the acceptable-use requirements for the Foundation Models framework (read it before shipping).

## Best practices

| Topic | Rule | Implement with |
|-------|------|----------------|
| Control | Let people dismiss, revert, retry; say when AI is used | Edit / Undo / Retry / Adjust controls beside the result |
| Fallback | Great experience when the feature is unavailable or declined; non-AI alternative when possible | `availability` switch ([foundation-models.md](foundation-models.md)) |
| Inclusion | Do not infer personal or cultural traits; ask for what the feature needs; test across diverse people | Explicit inputs, `@Generable` enums |
| Value | Offer it only where it saves time or adds creativity | Scope each feature narrowly |

## Transparency

- Say where the app uses AI; never imply human authorship; follow regional disclosure rules.
- Set expectations: capabilities, limits, how to get good results, why weak results happen. Curated example prompts for open-ended input.

## Privacy

- Choose the model type for the data: on-device keeps data local, fast, offline; server models for more power or context. Weigh privacy with capability.
- For server processing: process locally first, minimize what is sent, show what is shared, disclose storage and training use.
- Ask permission before using personal information or usage data; use the minimum; always provide an opt-out; explicit consent for model-improvement data.

## Inputs

- Teach people what works (predefined examples).
- Reduce hallucinations: scope the task, avoid requesting facts the model cannot verify, state that output may contain errors, avoid AI content where a mistake could harm.
- Ask confirmation before irreversible or significant actions (deleting photos, purchases); respect model usage policies and local regulation.

## Outputs

- **Refine or revert** (new 2026-06-08): expose Edit, Undo, Retry, Adjust near generated content; acknowledge when a correction takes effect.
- Coach people after blocked or poor results (Image Playground says "Unable to use that description."); suggest better requests.
- Test misuse and out-of-scope requests; avoid reproducing copyrighted content (pre-approved prompts, instruct the model to avoid mimicry).
- **Latency**: generative models are slow; design a loading state or generate in the background (`loading` HIG page).
- **Specific feedback during generation** (new 2026-06-08): "Finding substitutions for ingredients", not "Processing..."; on failure explain in plain language with a next step.
- Offer alternate versions when meaningful (Image Playground generates several).

## Continuous improvement

- Version prompts and retest on model updates ([foundation-models.md](foundation-models.md) prompt versioning).
- Optional, unobtrusive feedback (thumbs up/down, plus detail for complex issues); take it seriously. The framework logs feedback attachments with `LanguageModelSession.logFeedbackAttachment(sentiment:issues:desiredOutput:)` variants.
- Decouple the model from the UX so models can be swapped (`LanguageModel` protocol, [foundation-models-pcc.md](foundation-models-pcc.md)).

## Verification in this repo

Any UI that shows generated content also runs the HIG UI gate in `swiftui-core` (`hig-accessibility.md`, `hig-modality.md`): VoiceOver labels on Edit/Undo/Retry, AX5 layout, loading and error states, RTL.
