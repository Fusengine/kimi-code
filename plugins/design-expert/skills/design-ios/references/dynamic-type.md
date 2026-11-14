---
name: dynamic-type
description: "Canonical iOS/iPadOS Dynamic Type scale from the HIG Typography page — Large (default) and AX5 tables, per-platform default/minimum sizes, layout rules at large sizes."
when-to-use: "Mapping design-system.md typography to iOS/iPadOS text styles for a mockup or handoff spec, or checking a layout at the largest accessibility size."
keywords: ios, ipados, dynamic-type, typography, sf-pro, accessibility, ax5
priority: critical
related: ../SKILL.md, type-scales-other.md, semantic-colors.md
---

# Dynamic Type — iOS / iPadOS

Source: https://developer.apple.com/design/human-interface-guidelines/typography
(Specifications > iOS, iPadOS Dynamic Type sizes, and larger accessibility type sizes).
Fetched 2026-10-12. Other platforms: `type-scales-other.md`.

## Default and minimum text size per platform (HIG table)

| Platform | Default size | Minimum size |
|---|---|---|
| iOS, iPadOS | 17 pt | 11 pt |
| macOS | 13 pt | 10 pt |
| tvOS | 29 pt | 23 pt |
| visionOS | 17 pt | 12 pt |
| watchOS | 16 pt | 12 pt |

## Large (default) — design at this size

| Style | Weight | Size (pt) | Leading (pt) | Emphasized |
|---|---|---|---|---|
| Large Title | Regular | 34 | 41 | Bold |
| Title 1 | Regular | 28 | 34 | Bold |
| Title 2 | Regular | 22 | 28 | Bold |
| Title 3 | Regular | 20 | 25 | Semibold |
| Headline | Semibold | 17 | 22 | Semibold |
| Body | Regular | 17 | 22 | Semibold |
| Callout | Regular | 16 | 21 | Semibold |
| Subhead | Regular | 15 | 20 | Semibold |
| Footnote | Regular | 13 | 18 | Semibold |
| Caption 1 | Regular | 12 | 16 | Semibold |
| Caption 2 | Regular | 11 | 13 | Semibold |

The **Emphasized** column is the weight the system applies with the bold trait (HIG
change 2025-12-16 "Added emphasized weights to the Dynamic Type style specifications for
each platform", re-checked 2026-11-13). Spec emphasis as "`Body`, emphasized".

## AX5 (largest accessibility size) — stress-test at this size

| Style | Size (pt) | Leading (pt) |
|---|---|---|
| Large Title | 60 | 70 |
| Title 1 | 58 | 68 |
| Title 2 | 56 | 66 |
| Title 3 | 55 | 65 |
| Headline / Body | 53 | 62 |
| Callout | 51 | 60 |
| Subhead | 49 | 58 |
| Footnote | 44 | 52 |
| Caption 1 | 43 | 51 |
| Caption 2 | 40 | 48 |

The HIG page also publishes xSmall, Small, Medium, xLarge, xxLarge, xxxLarge and AX1–AX4;
read them there when a spec needs an intermediate size — do not interpolate.

## Fonts
SF Pro is the iOS/iPadOS system font; apps can also use New York (NY). SF Compact is the
**watchOS** system font (SF Compact Rounded in complications) — not an iOS small-control
font.

## Layout rules at large sizes (HIG Typography > Supporting Dynamic Type)
- Mock up the key screen at **Large and AX5**; the layout must adapt to all sizes.
- Keep truncation minimal; avoid truncating text in scrollable regions unless a separate
  view shows the rest.
- In horizontally constrained rows, switch to a **stacked layout** (text above secondary
  items such as glyphs and timestamps); reduce column count as size grows.
- Keep primary elements toward the top at any size; scale meaningful icons with text.
- Not every element must grow (e.g. tab titles don't) — prioritize the content people read.
- Offer enlargement of at least 200% (140% on watchOS) — HIG Accessibility.

## Rule
Reference text styles by name in the handoff spec (`Body`, `Headline`, …) — never a fixed
point size. That is what makes the implemented spec Dynamic-Type-compliant.
