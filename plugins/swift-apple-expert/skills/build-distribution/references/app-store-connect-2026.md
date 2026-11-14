---
name: app-store-connect-2026
description: App Store Connect features and requirements 2025-2026 - Accessibility Nutrition Labels, Xcode Cloud, webhooks, custom product pages, creative assets, medical device status, Sign in with Apple domain, On-Demand Resources cut-off
when-to-use: setting up a release pipeline, filling product page metadata, answering compliance declarations, planning for early 2027 requirements
keywords: Accessibility Nutrition Labels, Xcode Cloud, webhooks, custom product pages, creative assets, Asset Library, regulated medical device, Sign in with Apple, private.icloud.com, On-Demand Resources
priority: medium
requires: app-store.md
related: age-ratings.md, testflight.md, storekit-2026-updates.md
---

# App Store Connect 2025-2026

All entries: App Store Connect release notes (https://developer.apple.com/help/app-store-connect/release-notes/) and Apple Developer News, read 2026-11-13.

## Deadlines and cut-offs

| When | What | Source |
|------|------|--------|
| Early 2027 | **Regulated medical device status** required for existing apps in the EEA, UK or US that are in Health & Fitness or Medical, or that report "frequent" Medical or Treatment Information in the age questionnaire. Without it you cannot submit updates. New apps need it since 2026-03-26. "If your app is not a regulated medical device, you can select No" | https://developer.apple.com/news/?id=nyqbfz1y |
| Early 2027 | App Store Connect stops accepting **On-Demand Resources** uploads from new apps or apps that never used them; migrate to Background Assets | ASC release notes 2026-11-12 |
| 2027-01-12 | Age rating declarations | [age-ratings.md](age-ratings.md) |
| Later in 2026 | New Sign in with Apple addresses issued on `private.icloud.com` | https://developer.apple.com/news/?id=1ptvdtcm (2026-08-24) |

## Sign in with Apple private relay domain

Existing `privaterelay.appleid.com` addresses keep forwarding. Make account systems, email validation and allowlists accept **both** `privaterelay.appleid.com` and `private.icloud.com`. Hide My Email stays on `icloud.com`. Developers based in Korea must register a server-to-server notification endpoint for new or updated Services IDs from 2026-01-01 (https://developer.apple.com/news/?id=j9zukcr6).

## Accessibility Nutrition Labels

- Labels show on the product page for devices on iOS 26, iPadOS 26, macOS 26, tvOS 26, visionOS 26, watchOS 26 or later (ASC release notes 2025-09-03). Overview: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels
- You declare per device which features the app supports: VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate Without Color Alone, Sufficient Contrast, Reduced Motion, Captions, Audio Descriptions (not every label applies to every device). Apple recommends evaluating in that order.
- A device with no answer still shows the section and says you haven't indicated support yet; an optional accessibility URL (not shown on Apple TV) explains details.
- Audit the app on each supported device against Apple's evaluation criteria before answering. Implementation checks: `swiftui-core` `references/hig-accessibility.md`.

## Xcode Cloud

- Apple Developer Program membership includes **25 compute hours per month**; larger monthly plans (100, 250, 1,000 and 10,000 hours) are sold separately (https://developer.apple.com/xcode-cloud/).
- Since 2026-10-21 Xcode Cloud has its **own section in App Store Connect** (https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-sections).
- Xcode Cloud can create and upload builds directly ([testflight.md](testflight.md)).

## Webhooks

Since 2025-10-01 you can configure webhooks in App Store Connect so your server is notified when a build upload, beta build or Apple-hosted asset pack version changes status. Build upload status (warnings, errors) is also visible in the app. Use it instead of polling in CI.

## Product page assets

- **Custom product pages**: up to **70** per app (since 2025-10-28), each can carry keywords so it can appear in search results for them (https://developer.apple.com/news/?id=gf6mgrs6).
- You can submit extra items to App Review independently of an app version under review: In-App Events, a bug-fix version separate from custom product pages, Game Center features (same news).
- **Creative assets** and the **Asset Library** (2026-10-05): product page headers, search result assets and in-app events, with a live preview. Guideline 2.3.14 governs content ([app-review-guidelines.md](app-review-guidelines.md)). Specs: https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications
- Screenshot rules: [app-store.md](app-store.md).
