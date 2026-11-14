---
name: system-surfaces
description: "HIG rules for system surfaces an app designs for — Live Activities (limited width, 2026-10-13), widgets (Apple HomeView, appearances, 2026-10-13), plus the reintroduced HIG design principles (2026-06-08) and emphasized Dynamic Type weights (2025-12-16)."
when-to-use: "Mocking up a Live Activity, a widget, or checking a design against Apple's design principles or emphasized text weights."
keywords: live-activities, dynamic-island, widgets, apple-homeview, design-principles, typography, emphasized
priority: medium
related: ../SKILL.md, dynamic-type.md, type-scales-other.md, apple-design-tools.md
---

# System Surfaces and Principles

Read 2026-11-13 from the HIG JSON endpoints. `/slug` =
`https://developer.apple.com/design/human-interface-guidelines/<slug>`.

## Design principles — /design-principles (reintroduced 2026-06-08)
Eight principles, each a one-line test for a critique pass:
Purpose (make something meaningful) · Agency (let people do things their own way) ·
Responsibility (act in people's best interest) · Familiarity (build on what people know) ·
Flexibility (adapt to diverse contexts and needs) · Simplicity (be clear and direct) ·
Craft (care about every detail) · Delight (make it human).
Use them as named lenses in `design-review`; quote the principle, not a paraphrase.

## Emphasized text weights — /typography (2025-12-16)
The Dynamic Type specifications now list an **emphasized weight** per text style
(medium, semibold, bold or heavy), applied through the bold symbolic trait. The tables in
`dynamic-type.md` and `type-scales-other.md` carry that column — spec emphasis as
"`Body`, emphasized", never as a hand-picked weight.

## Live Activities — /live-activities (2026-10-13)
- Platforms: iOS, iPadOS, macOS (appears in the menu bar of a paired Mac; click opens
  iPhone Mirroring), watchOS, CarPlay; not tvOS or visionOS. macOS uses the iOS
  dimensions. All spec values are in points.
- **Limited width** (new): where width is limited, e.g. the Dynamic Island on iPhone in
  landscape, compact and minimal presentations must fit **inside a 28 pt-diameter
  circle** — short abbreviation or graphic, not a full string. If a limited-width
  trailing view makes no sense, ship the leading view only; the system hides the
  trailing one. Specs list limited width as 28×28 pt.
- Compact: narrow, snug against the TrueDepth camera, no padding toward it, leading and
  trailing balanced.
- Prefer one Live Activity with a rotating dynamic layout over several.
- Mock up every presentation (compact, minimal, expanded, Lock Screen, StandBy, limited
  width) at the HIG's point sizes; read the per-device rows on the page — don't copy one
  device's values to another.

## Widgets — /widgets (2026-10-13)
- Contexts now include **Apple HomeView**: widgets from the small system family, sharing
  the iPhone widget appearance; the **Modular face** holds up to four widgets (one per
  household, possibly from different members' iPhones); each enrolled member has a
  personal Home Screen.
- Home Screen appearances on iPhone, iPad and HomeView: **light, dark, clear, tinted**
  (clear = desaturated + translucency + Liquid Glass; tinted = desaturated + the user's
  tint). StandBy and the HomeView Modular face scale the widget up with the background
  removed and turn monochromatic red in low ambient light.
- visionOS widgets are 3D objects placed on surfaces, full-color by default, accented
  when tinted; test every system palette and lighting condition.
- Mockup deliverable: the widget in each appearance it supports, plus StandBy/Modular
  face if supported.
