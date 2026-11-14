---
name: watch-tv-vision
description: "Design basics for watchOS, tvOS and visionOS mockups — device context, layout, controls, focus, materials — each rule cited to its HIG page."
when-to-use: "Mocking up a watchOS, tvOS or visionOS screen; use alongside touch-targets.md and type-scales-other.md."
keywords: watchos, tvos, visionos, apple-watch, apple-tv, vision-pro, focus, ornaments, glass
priority: high
related: ../SKILL.md, touch-targets.md, type-scales-other.md, liquid-glass.md
---

# watchOS, tvOS, visionOS — Basics

Fetched 2026-10-12. `/slug` = `https://developer.apple.com/design/human-interface-guidelines/<slug>`.

## watchOS
- Context: worn on the wrist, viewed within about a foot, sessions often under a minute;
  complications and notifications are used more than the app. — /designing-for-watchos
- Glanceable, single-screen interactions; **minimize hierarchy depth**; Digital Crown for
  vertical navigation. — /designing-for-watchos
- At most **three glyph buttons or two text buttons** in a row; primary actions as
  full-width buttons; same height for buttons sharing a row or a vertical stack.
  — /layout, /buttons
- Toolbar buttons sit in the corners (system moves time and title). — /buttons
- Keep the default material background of full-screen modal sheets. — /materials
- Controls 44×44 pt default, 28×28 minimum; SF Compact; text enlargement ≥140%.
  — /accessibility, /typography

## tvOS
- Context: viewed from 8 feet or more, Siri Remote; long immersive sessions.
  — /designing-for-tvos
- **Safe area**: inset primary content 60 pt from top and bottom, 80 pt from the sides
  (overscan). — /layout (tvOS)
- Focus is the interaction model: the focused item usually gets the **parallax** effect;
  selecting is a separate gesture. Leave room for items that grow on focus so they don't
  overlap other content. — /focus-and-selection, /layout
- Grids (unfocused content width, 40 pt horizontal spacing, ≥100 pt vertical spacing):
  2 columns 860 pt · 3 → 560 · 4 → 410 · 5 → 320 · 6 → 260 · 7 → 217 · 8 → 184 · 9 → 160.
  — /layout (tvOS Grids)
- Buttons and image views adopt Liquid Glass on focus automatically. — /materials
- Controls 66×66 pt default, 56×56 minimum; Body 29 pt. — /accessibility, /typography

## visionOS
- Context: Shared Space by default, Full Space on demand; eyes look + indirect tap; keep
  content in the field of view, relative to the head; use the **minimum immersion** each
  moment needs. — /designing-for-visionos
- Windows use the unmodifiable **glass** material — keep it; prefer translucency to opaque
  areas; there is no separate Dark Mode. — /windows, /materials
- Support resizing; keep content horizontally centered at large sizes; min/max sizes
  only to prevent overlap, never to block resizing. — /layout (visionOS)
- **Ornaments** hold app-specific controls (toolbars, playback), never supplemental
  content — that goes in an adjacent window. — /layout (visionOS)
- Buttons: prefer circular or capsule shapes with a visible background; sizes mini 28,
  small 32, regular 44, large 52, extra large 64 pt; centers ≥60 pt apart (+4 pt padding
  for buttons ≥60 pt); no custom hover effects; no white-fill/black-label custom buttons
  (reserved for toggled state). — /buttons
- Controls 60×60 pt default, 28×28 minimum. — /accessibility
- Text: prefer 2D, white default, billboard spatial labels. — /typography
- **Look to Scroll** (scroll by gaze, opt-in per scroll view; HIG 2026-03-24): reading
  and browsing views only, not dense/control-heavy ones — `bars-menus-scroll.md`.
  — /scroll-views

## Rule
A watchOS/tvOS/visionOS value not on these pages is marked "to reconfirm on
developer.apple.com" in the spec, never borrowed from iOS.
