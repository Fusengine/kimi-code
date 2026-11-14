---
name: app-store-assets
description: "Design side of App Store distribution (state 2026-11-13) — screenshot specifications incl. iPhone Duo, app previews, product page, custom product pages (up to 70), creative assets and Asset Library (2026-10-05), App Review 2.3.x incl. 2.3.14 creative assets (2026-10-16), marketing icon."
when-to-use: "Designing App Store screenshots, app previews, product page headers, search-result or In-App Event creative assets, or custom product pages for an Apple-platform app."
keywords: app-store, screenshots, app-previews, product-page, custom-product-pages, creative-assets, asset-library, iphone-duo, review-guidelines
priority: high
related: ../SKILL.md, app-icons.md, apple-design-tools.md, ipados-iphone-duo.md
---

# App Store Assets — Design Side

All facts read 2026-11-13. Submission mechanics (binaries, signing, review flow) belong
to swift-expert's `build-distribution` skill, not here. Pixel values below are **asset
sizes in pixels**, not mockup canvas sizes in points (`viewports.md`).

## Screenshots
Source: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- 1 to 10 screenshots per device size; `.jpeg`, `.jpg` or `.png`; **"Images can't
  include alpha channels or transparencies."** Must follow the App Review Guidelines.
- **Required sizes**: iPhone with Dynamic Island (**medium display**) — at least one;
  **iPad 13-inch** — at least one, if the app runs on iPadOS. Mac (16:10), Apple TV,
  Apple Vision Pro and Apple Watch are required for apps on those platforms.
- One UI across sizes → provide the highest required resolution; App Store Connect
  scales down. Otherwise upload per size and per localization.

| Class | Accepted sizes (portrait; landscape is the swap) |
|---|---|
| iPhone Duo outer display | 1398 × 2034 |
| iPhone Duo inner display | 2007 × 2853 |
| iPhone, Dynamic Island, large | 1260 × 2736 · 1290 × 2796 · 1320 × 2868 |
| iPhone, Dynamic Island, medium (required) | 1179 × 2556 · 1206 × 2622 |
| iPad 13" (required for iPad apps) | 2064 × 2752 · 2048 × 2732 |
| Mac (16:10) | 1280 × 800 · 1440 × 900 · 2560 × 1600 · 2880 × 1800 (landscape) |
| Apple TV | 1920 × 1080 · 3840 × 2160 |
| Apple Vision Pro | 3840 × 2160 |
| Apple Watch (one size, same across localizations) | 422 × 514 (Ultra 4/3) · 410 × 502 · 416 × 496 · 396 × 484 · 368 × 448 · 312 × 390 |

Older iPhone/iPad classes and their fallbacks are listed on the page — read them there.

**iPhone Duo screenshots.** The spec page: "Starting in April 2027, screenshots will be
required for any app using the iOS 27.1 SDK or later." The news post of 2026-10-05
(https://developer.apple.com/news/?id=kkphp5qo) words it: "Starting April 2027, any apps
or games submitted will need to include screenshots for iPhone Duo." Submitting them
adds a "made for iPhone Duo" badge to the product page. Plan both displays; the two
Apple sources differ on scope, so quote both until Apple aligns them.

## App previews
Source: https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications
- Optional; up to **3** per device size and language (iOS, macOS, tvOS, visionOS).
  15–30 s, ≤500 MB, ≤30 fps, H.264 or ProRes 422 (HQ); poster frame defaults to 5 s.
- Shown **before** screenshots; a different aspect ratio than the screenshots moves it to
  "A Closer Look". macOS/tvOS/visionOS landscape only.
- iPhone Duo previews use the standard iPhone 19.5:9 dimensions (886 × 1920 portrait).
- Guideline 2.3.4: "previews may only use video screen captures of the app itself"
  (narration and overlays allowed). Autoplay is muted — the first seconds must work
  without sound (https://developer.apple.com/app-store/product-page/).

## Product page — https://developer.apple.com/app-store/product-page/
- Name ≤30 characters; subtitle ≤30 characters (no generic claims).
- Up to 10 screenshots; with no preview, the **first one to three** appear in search
  results — they carry the essence. One screenshot in Dark Mode if supported.
- Guideline 2.3.3: screenshots show the app in use, not only title art, login or splash;
  overlays allowed to explain input.

## Custom product pages — https://developer.apple.com/app-store/custom-product-pages/
- Up to **70** additional product pages (iPhone, iPad), each varying screenshots,
  promotional text and/or app previews; unique URL, usable in Apple Ads, can appear in
  search for assigned keywords; optional deep link (iOS/iPadOS 18+); reviewed
  independently of an app update. Design them as a set from one visual system.

## Creative assets and Asset Library (2026-10-05)
Sources: https://developer.apple.com/news/?id=ljpl7kyn ·
https://developer.apple.com/app-store/asset-best-practices/ ·
https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications ·
https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets
- New image/video assets beyond in-use visuals: **product page header**, **search
  results**, **In-App Event** cards; shown in iOS 27 / iPadOS 27 and later.
- Image specs (creative-assets spec page, Last-Modified 2026-11-12, read 2026-11-13; no
  alpha or transparency):

| Placement | Ratio | Resolution (px) | Art safe area (px) | Formats |
|---|---|---|---|---|
| Product page header | 21:9 | 3840 × 1646 | 1646 × 661 at x 1097, y 493 | jpeg, jpg, png |
| Search results | 3:2 | 1920 × 1280 → 3840 × 2560 | max 2168 × 1030 at x 836, y 765 | jpeg, jpg, png |
| Universal asset (header + search) | 16:9 | 5244 × 2950 | 1402 × 962 at x 1921, y 660 | png only |
| In-App Event card | 16:9 | 1920 × 1080 → 3840 × 2160 | — | jpeg, jpg, png (≤500 MB) |
| In-App Event details page | 9:16 | 1080 × 1920 → 2160 × 3840 | — | jpeg, jpg, png (≤500 MB) |

- Composition: key characters and talent inside the **Art Safe Area**; atmospheric art
  across the full canvas (**Auxiliary Art Area**). Start from Apple's Figma / Photoshop /
  Pixelmator / Sketch templates.
- Video (header, search, events): same ratios and resolutions, 30 or 60 fps, 5–30 s,
  `.mov`/`.m4v`/`.mp4`; muted by default (cannot be unmuted in search), looping.
- Best practices: one clear idea per header; search asset makes the purpose obvious; no
  pricing, discounts, URLs, copyright symbols, other platforms' logos, Apple
  recognitions or unverifiable awards; 4+ imagery; videos loop seamlessly and work muted;
  a universal asset can serve both header and search results.
- **Asset Library** in App Store Connect stores creative assets, screenshots and previews
  and lets creative assets be approved ahead of use; a **preview tool** shows them on the
  product page and in search, including Dark Mode, devices and orientations.

## App Review guidelines on metadata — https://developer.apple.com/app-store/review/guidelines/ (last updated 2026-10-16)
- **2.3.14 (new 2026-10-16, https://developer.apple.com/news/?id=92th7e5i)**: creative
  assets "must pertain to your app's content and functionality or overarching brand,
  follow standard metadata guidelines, and be appropriate for all audiences. They should
  not include inappropriate content, references to other apps with an intent to mislead,
  unverifiable product claims, or specific or discounted pricing information."
- 2.3.7: no prices or irrelevant terms in names, subtitles, screenshots, previews.
- 2.3.8: icons, screenshots, previews meet **4+**; keep app name and icons consistent
  across sizes and alternate icons.
- 2.3.9: secure rights to all materials; show **fictional account data**, never a real
  person's.

## Marketing icon
Export the flattened icon from Icon Composer (`app-icons.md`); 2.3.8 asks that app name
and icons (small, large, Apple Watch, alternate) stay similar to avoid confusion.

## Deliverable
A screenshot set per required class (plus iPhone Duo outer + inner), opaque PNG/JPEG at
an accepted size, light and dark variants where relevant, text localized, no alpha.
