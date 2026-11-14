---
name: app-icons
description: Layered app icons with Icon Composer (Liquid Glass), appearance variants, SF Symbols, launch screens and asset catalogs for all Apple platforms
when-to-use: creating or updating app icons, using SF Symbols, configuring launch screens, managing assets
keywords: app icon, Icon Composer, layered icon, Liquid Glass, dark icon, clear icon, tinted icon, SF Symbols, launch screen, asset catalog
priority: medium
related: code-signing.md, app-store.md
---

# App Icons & Assets

Source: https://developer.apple.com/design/human-interface-guidelines/app-icons

## Icon Formats (HIG update 2026-10-28)

In iOS, iPadOS, macOS and watchOS you provide the icon in **one of two formats**: a nonlayered bitmap image (such as PNG) or a layered Icon Composer file. Apple recommends Icon Composer for more control over how Liquid Glass applies to individual elements and how color applies across appearance variants. Vector layers (SVG, PDF) stay crisp at any size; use PNG for mesh gradients and raster artwork. Icon Composer lets you annotate default, dark and mono variants. Source: https://developer.apple.com/design/human-interface-guidelines/app-icons (revision entry "October 28, 2026: Added guidance for app icon format options", read 2026-11-13).

## Layered Icons (Liquid Glass)

- iOS, iPadOS, macOS and watchOS icons are a **background layer + one or more foreground layers**. The system applies Liquid Glass effects (specular highlights, refraction, translucency), adapting per size and system version.
- A flattened image is still accepted, but layers give the most control.
- tvOS: 2-5 layers (parallax). visionOS: background + 1-2 layers (3D, embossed).

## Icon Composer Workflow (iOS, iPadOS, macOS, watchOS)

1. Draw foreground layers in your design tool - prefer **vector (SVG/PDF)**; PNG for raster or mesh gradients. Outline text.
2. Import layers into **Icon Composer** (included with Xcode).
3. Define the background there (solid color or gradient - no custom background image needed in most cases; if imported: full-bleed, opaque).
4. Adjust layer placement, opacity, effects; group layers to apply effects at group level.
5. Annotate appearance variants, preview across system versions, export for Xcode.

tvOS/visionOS: add layers directly to an image stack in Xcode (Parallax Previewer/Exporter for tvOS).

## Layer Rules

- Provide **square, unmasked layers** (tvOS: rectangular). The system masks corners (iOS/iPadOS/macOS rounded rect; watchOS/visionOS circle). Pre-masked layers break highlights and edges.
- Crisp edges on foreground shapes (no feathering). Vary opacity across foreground layers for depth.
- **Don't bake effects**: no specular highlights, drop shadows, bevels, blurs or glows - the system adds dynamic ones.
- Keep primary content centered (masking, watchOS/visionOS circles). Use the production template grids (Apple Design Resources).
- Simple concept, few shapes, simple background; no photos, no UI replicas, no Apple hardware, no text unless essential to the brand.
- tvOS: keep a safe zone (focus scaling crops edges); avoid black backgrounds.

## Appearances (iOS, iPadOS, macOS)

Two different lists, both from Apple, both current (read 2026-11-13):

- **What people choose on the Home Screen** (HIG app-icons, "Appearances"): "In iOS, iPadOS, and macOS, people can choose whether their Home Screen app icons are default, dark, clear, or tinted in appearance. [...] You can design app icon variants for every appearance variant, and the system automatically generates variants you don't provide." HIG sizes table: "Default, dark, clear light, clear dark, tinted light, tinted dark".
- **What you annotate in Icon Composer** (HIG app-icons "Icon Composer" paragraph: "annotate for default, dark, and mono appearance variants"; https://developer.apple.com/icon-composer/ "Annotate Across Rendering Modes": "choose how your icon looks in Default, Dark, and Mono modes"). Apple names these "rendering modes" on the product page and "appearance variants" in the HIG.

Apple's pages never map Icon Composer's three modes onto the four Home Screen choices. Do not claim that "Mono" equals "Clear" or "Tinted": check the exported icon in Icon Composer and in Device Hub for all four choices. Icon Composer 2 is in beta and requires macOS Tahoe 26.4 or later (https://developer.apple.com/design/whats-new/ lists "Icon Composer 2 beta"; the Icon Composer page states the macOS requirement).

For a bitmap icon the system segments it into two layers (foreground, background) so it works with dark and tinted variants (HIG, "Icon formats").

Layouts per platform:

| Platform | Layout | Mask | Size | Appearances |
|----------|--------|------|------|-------------|
| iOS, iPadOS, macOS | Square | Rounded rectangle | 1024x1024 px | Default, dark, clear light, clear dark, tinted light, tinted dark |
| tvOS | Rectangle (landscape) | Rounded rectangle | 800x480 px | N/A (parallax) |
| visionOS | Square | Circle | 1024x1024 px | N/A (3D) |
| watchOS | Square | Circle | 1088x1088 px | N/A |

- Keep core features identical across appearances; don't swap elements per variant.
- Base the dark icon on the light one; dark is more subdued, clear/tinted even more. The system generates any variant you don't provide.
- **Alternate icons** (iOS/iPadOS) need their own dark, clear and tinted variants; all are subject to App Review.
- Color spaces: sRGB, Gray Gamma 2.2, Display P3 (not visionOS).

## SF Symbols

Source: https://developer.apple.com/design/human-interface-guidelines/sf-symbols

- Thousands of symbols aligned with San Francisco at every weight and size; availability depends on the OS version targeted.
- Four rendering modes: monochrome, hierarchical, palette, multicolor. Gradients ("SF Symbols 7 and later", HIG revision 2025-07-28) and variable color work across modes.
- Animations (incl. Draw On/Off, SF Symbols 7 and later): use judiciously, honour Reduce Motion.
- **Current release naming**: Apple's design What's new page (published 2026-11-06, https://developer.apple.com/design/whats-new/, read 2026-11-13) lists "Download SF Symbols 8 beta" (dated June 8, 2026), in the WWDC26 group next to the HIG "App icons: Refined guidance for Liquid Glass" entry (HIG revision June 8, 2026). The current Design Resources page https://developer.apple.com/design/resources/ (read 2026-11-14) says "Download SF Symbols 27 - Requires macOS Sonoma or later", and https://developer.apple.com/sf-symbols/ shows no "beta" in its text; its download link is `SF-Symbols-27.dmg`, and it says new symbols are available in apps running iOS 27, iPadOS 27, macOS 27, watchOS 27, tvOS 27 and visionOS 27. The HIG sf-symbols page (last revision July 28, 2025) names only SF Symbols 7 and earlier. So: write "SF Symbols 27 (announced at WWDC26 as 'SF Symbols 8 beta')"; both names point to the same app, and symbols are available from OS 27.
- Icon-only symbols need an accessibility label; symbols get RTL variants automatically.

## Launch Screen (iOS/iPadOS)

`UILaunchScreen` dictionary in Info.plist (`UIColorName`, `UIImageName`, iOS 14+).
HIG (https://developer.apple.com/design/human-interface-guidelines/launching): nearly identical to the first screen, no text, no logo/branding, matches orientation and appearance.

## Best Practices

- ✅ Layered icon built in Icon Composer, square unmasked layers
- ✅ Check every appearance (default/dark/clear/tinted) in Icon Composer or Device Hub
- ✅ SF Symbols for interface icons, with labels
- ❌ Don't pre-round corners or bake highlights/shadows
- ❌ Don't put text, photos or UI screenshots in the icon
- ❌ Don't put branding on the launch screen
