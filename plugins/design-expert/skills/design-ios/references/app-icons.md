---
name: app-icons
description: "Apple app icon rules from the HIG App icons page (format options 2026-10-28) — layered Icon Composer file preferred over a bitmap, appearances default/dark/clear/tinted, per-platform layout sizes, layer rules."
when-to-use: "Designing or specifying an app icon (or its alternate icons) for iOS, iPadOS, macOS, watchOS, tvOS or visionOS, including the App Store marketing icon."
keywords: app-icon, icon-composer, liquid-glass, layers, dark, tinted, clear, appearances
priority: high
related: ../SKILL.md, apple-design-tools.md, app-store-assets.md, liquid-glass.md
---

# App Icons

Source: https://developer.apple.com/design/human-interface-guidelines/app-icons — change
log 2026-10-28 "Added guidance for app icon format options" (also 2026-06-08 "refined for
Liquid Glass"). Read 2026-11-13 via the page's JSON endpoint.

## Format — layered Icon Composer file is the stated preference
- iOS, iPadOS, macOS and watchOS accept "nonlayered bitmap images (such as PNG) or
  layered Icon Composer files". The HIG: "Provide your icon in the Icon Composer format
  for more flexibility and control."
- A bitmap is segmented by the system into two layers; Liquid Glass is applied only to
  large, simple foreground shapes, **not** to text and thin lines. To control which
  elements get Liquid Glass, ship a layered Icon Composer file.
- tvOS and visionOS icons are built as an image stack in Xcode (tvOS 2–5 layers with
  parallax; visionOS background + one or two layers, 3D).

## Layers
- Background layer + one or more foreground layers; the system adds specular highlights,
  refraction, translucency, shadows — **don't paint them in** (no baked highlights, drop
  shadows, bevels, blurs, glows).
- Clearly defined edges (no feathering); vary opacity across foreground layers for depth;
  prefer vector (SVG/PDF) layers, PNG for mesh gradients and raster art; outline text.
- Icon Composer backgrounds: solid colors or gradients; an imported background must be
  full-bleed and opaque.
- Provide **square, unmasked** layers (iOS/iPadOS/macOS rounded rectangle, watchOS and
  visionOS circle are applied by the system; tvOS rectangular). Pre-masked layers break
  specular highlights.
- Text only when essential; prefer illustrations to photos; never replicate UI or a
  screenshot.

## Appearances
- iOS, iPadOS, macOS: people choose **default, dark, clear or tinted** Home Screen icons;
  the system generates the variants you don't provide. Spec table lists six:
  default, dark, clear light, clear dark, tinted light, tinted dark.
- Keep the same core features in every appearance; base the dark icon on the light one;
  dark is more subdued, clear and tinted even more so.
- Alternate app icons (iOS/iPadOS) need their own dark, clear and tinted variants and go
  through App Review.
- Icon Composer annotates **Default, Dark and Mono** rendering modes in one file
  (https://developer.apple.com/icon-composer/).

## Specifications (HIG table)

| Platform | Layout size | Masked shape | Style | Appearances |
|---|---|---|---|---|
| iOS, iPadOS, macOS | 1024×1024 px | rounded rectangle | layered | default, dark, clear light/dark, tinted light/dark |
| tvOS | 800×480 px | rounded rectangle (landscape) | layered (parallax) | n/a |
| visionOS | 1024×1024 px | circle | layered (3D) | n/a |
| watchOS | 1088×1088 px | circle | layered | n/a |

Color spaces: sRGB (color), Gray Gamma 2.2 (grayscale). The system scales smaller
variants automatically.

## Marketing icon
Icon Composer "provides the option to export a flattened version of your icon for
marketing and communication needs" (https://developer.apple.com/icon-composer/) — use that
export for App Store and marketing surfaces (`app-store-assets.md`), never a re-drawn copy.

## Mockup deliverable
Show the icon in all four appearances at Home Screen size, on a light and a dark
wallpaper, and state the source file format (layered Icon Composer file vs bitmap) in the spec.
