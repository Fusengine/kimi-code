---
name: generative-ai
description: "HIG Generative AI rules for mocking up AI features (update 2026-06-08: refine/revert results, specific feedback during generation, model choice) and what Apple publishes on Writing Tools, Genmoji and Image Playground surfaces."
when-to-use: "Mocking up any screen that generates or transforms content with a model, or that hosts Writing Tools, Genmoji or Image Playground."
keywords: generative-ai, apple-intelligence, writing-tools, genmoji, image-playground, foundation-models, transparency, feedback
priority: medium
related: ../SKILL.md, system-surfaces.md, handoff-swiftui.md
---

# Generative AI Surfaces

Source: https://developer.apple.com/design/human-interface-guidelines/generative-ai —
change log 2026-06-08 "Added guidance for letting people refine results and providing
feedback during content generation, and updated guidance for choosing a model type"
(page new 2025-06-09). Read 2026-11-13 via its JSON endpoint. No platform-specific
considerations on any Apple platform.

## What the mockup must show
| HIG rule | Mockup obligation |
|---|---|
| Communicate where your app uses AI; never pass AI output off as human | A visible AI indicator or label on the feature and its output |
| Set clear expectations of capabilities and limits | Onboarding hint or example inputs for open-ended prompts |
| Keep people in control; let them dismiss new content | Dismiss/discard affordance on every generated result |
| **Refine or revert results, and acknowledge corrections** (2026-06-08) | Controls such as **Edit, Undo, Retry, Adjust next to the generated content**, plus a confirmation state when a correction takes effect |
| **Specific, reassuring feedback during generation** (2026-06-08) | A progress state with a concrete message ("Summarizing key themes from your notes"), never a bare "Processing…" |
| Factor processing time into the design | Loading / partial-result state for slow generation |
| Help people improve blocked or undesirable requests | A blocked-request state that coaches (Image Playground: "Unable to use that description") with example requests |
| Consider offering alternate versions | A choice of meaningfully different results where it fits |
| Get permission before irreversible tasks; don't automate destructive actions | A confirmation step before any destructive or hard-to-undo action |
| Ask permission before using personal data; disclose use | Permission and disclosure screens, with an opt-out |
| Let people share feedback on outputs | A feedback control on results |
| Raise awareness of hallucinations | A notice where output may be factually wrong |
| Great experience when AI is unavailable or declined | A non-AI path or state for the same screen |

Model choice (on-device vs server, privacy and latency) is an implementation decision —
record the assumption in the handoff, don't design around a guess.

## Writing Tools, Genmoji, Image Playground
- The HIG has **no dedicated pages** for these surfaces (JSON slugs `writing-tools`,
  `genmoji`, `image-playground` return 404, checked 2026-11-13). They appear only as
  examples: on the Generative AI page (Genmoji as an optional addition beside regular
  emoji; Image Playground's blocked-request message and multiple-image choice) and on
  /machine-learning ("Image Playground lets people describe an image, adjust it
  visually, or remix results through quick edits").
- Apple Intelligence "Get started"
  (https://developer.apple.com/apple-intelligence/get-started/, read 2026-11-13): Writing
  Tools (rewrite, proofread, summarize) work automatically in standard text views;
  Genmoji work in standard text fields and are **inline images**, not text; Image
  Playground provides a system experience parallel to the Image Playground app. That
  page says images are generated on device, but Apple's pages disagree: the
  /apple-intelligence/ overview says "Images are generated on Private Cloud Compute, so
  photos are never stored or shared" and /apple-intelligence/whats-new/ says the new
  model runs on Private Cloud Compute (both read 2026-11-14). Treat generation as Private
  Cloud Compute and show a disclosure in the mockup (same rule as
  swift-apple-expert `apple-intelligence/references/system-features.md`).
- Mockup rule: these are **system UI** — don't redraw their panels. Use standard text
  views/fields in the mockup, mark where the system Writing Tools / Genmoji / Image
  Playground entry points appear, and size text layouts to accept an inline Genmoji
  glyph. Implementation belongs to swift-expert.
