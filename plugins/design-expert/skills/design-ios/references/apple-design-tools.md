---
name: apple-design-tools
description: "Current official Apple design tools and kits (state 2026-11-14) — SF Symbols 27 (announced as SF Symbols 8 beta), Icon Composer 2, Pass Designer, UI kits per platform, product bezels — with the version each one targets."
when-to-use: "Choosing which Apple UI kit, symbol library, icon tool or bezel to build a mockup, icon or marketing frame with, or checking that a cited version is current."
keywords: sf-symbols, icon-composer, pass-designer, ui-kit, figma, sketch, bezels, design-resources
priority: high
related: ../SKILL.md, app-icons.md, app-store-assets.md
---

# Apple Design Tools and Kits

All facts read 2026-11-13. Dated entries come from
https://developer.apple.com/design/whats-new/ (page meta 2026-11-06). Versions change
each WWDC — re-read these pages before quoting a version in a deliverable.

## Tools

| Tool | Current state | Use in this skill | Source |
|---|---|---|---|
| **SF Symbols 27** (announced at WWDC26 as "SF Symbols 8 beta", 2026-06-08) | "over 7,000 symbols", 9 weights × 3 scales; new symbols for iOS/iPadOS/macOS/watchOS/tvOS/visionOS 27; Enhanced Search (semantic); Draw On/Off presets; Annotation (guide points for custom-symbol Draw); Variable Rendering (Variable Color, Variable Draw); 4 rendering modes + optional gradient rendering. Download `SF-Symbols-27.dmg`, requires macOS Sonoma or later. | Name symbols by their SF Symbols name in the spec; prefer them over custom icons in tab bars, sidebars, toolbars. | https://developer.apple.com/sf-symbols/ · https://developer.apple.com/design/resources/ ("Download SF Symbols 27", read 2026-11-14) · What's new 2026-06-08 ("SF Symbols 8 beta") |
| **Icon Composer 2** (beta at WWDC26, 2026-06-08) | Layered Liquid Glass icons from one design for iPhone, iPad, Mac, Apple Watch; Refraction (per-layer strength); new specular highlights (inside/outside/automatic, vertical light angle); updated annotation; Default / Dark / Mono rendering modes in one file; Xcode integration; flattened export "for marketing and communication needs". Requires macOS Tahoe 26.4 or later. | App icon production — see `app-icons.md`. | https://developer.apple.com/icon-composer/ · What's new 2026-06-08 ("Icon Composer 2 beta") |
| **Pass Designer** (new, WWDC26, 2026-06-08; beta) | Build Wallet passes from Apple or own templates; live preview for iPhone and Apple Watch using the system renderer; colors (background/foreground/label), adaptable layouts, standard fields, validation, semantic tags with backward-compatible output. Beta requires macOS 27 or later. | Wallet pass mockups: design images (logo, background, strip) in a design tool, finish and preview in Pass Designer instead of hand-drawing a pass frame. | https://developer.apple.com/pass-designer/ · HIG /wallet updated 2026-06-08 |
| **Parallax Previewer** | Preview parallax effects for tvOS and visionOS images/icons. | tvOS/visionOS layered icons. | https://developer.apple.com/design/resources/ |

## UI kits (Design Resources page, read 2026-11-13)

| Platform | Kit version | Formats |
|---|---|---|
| iOS + iPadOS | **27** (Figma kit 2026-09-17: components, system colors, app icons) | Figma, Sketch; App Icon Template |
| macOS | **27** (Figma kit 2026-09-17) | Figma, Sketch |
| watchOS | **26** | Figma, Sketch |
| tvOS | **18** | UI kit, Sketch design templates, production templates |
| visionOS | **26** (also a legacy visionOS 2 kit) | Figma, Sketch (visionOS 2: Sketch) |
| Live Activities | template updated for iOS 27, with macOS components (2026-11-06) | Figma, Sketch |

Source: https://developer.apple.com/design/resources/. A watchOS or tvOS mockup built on
a newer-numbered kit does not exist — use the listed version and say so in the spec.

## Product bezels (marketing frames)
Current set includes iPhone Duo and iPhone 18 (added 2026-09-18), iPad mini (A20 Pro),
Apple Watch Ultra 4 and MacBook Pro PROLED XDR Display bezels (2026-11-06), plus iPhone 16/17, iPad (A16),
iPad Air (M4), iPad Pro (M5), iMac, Studio Displays, Apple TV, Watch Series 11. Use them
only for marketing frames, under Apple's Marketing Resources and Identity Guidelines
(https://developer.apple.com/app-store/marketing/guidelines/). A design mockup itself
uses the plain frame from `mockup.md`, not a photographic bezel.

## Fonts
SF Pro (iOS, iPadOS, macOS, tvOS), SF Compact (watchOS), SF Mono, New York, plus SF
Arabic/Armenian/Georgian/Hebrew — downloads on the Design Resources page.

Known inconsistency (2026-11-13): the Design Resources page still says Icon Composer
"Requires macOS Sequoia or later"; the Icon Composer page (Icon Composer 2) says macOS
Tahoe 26.4 or later. Quote the Icon Composer page for version 2.

## Rule
Cite the tool and its version as read on the page above, with the read date. Never write
"latest" without a version, and never carry a version from memory.
