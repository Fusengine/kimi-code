---
name: build-distribution
description: Use when preparing an Apple release — code signing, TestFlight upload, App Store submission, or app icons/CI across all platforms.
---


<objective>
Covers app build, code signing, and distribution across all Apple platforms: certificate/profile management, TestFlight beta distribution, App Store submission, app icon/asset preparation, and StoreKit 2 in-app purchases/subscriptions.

Includes a release checklist (version/build number, layered Icon Composer app icon checked in default/dark/clear/tinted appearances, privacy manifest, release configuration, archive validation, TestFlight testing, screenshots, App Store metadata) and guidance on automating releases with fastlane and CI/CD (e.g. GitHub Actions).

Best practices favor automatic signing, TestFlight testing before any public release, incrementing the build number on every upload, and a mandatory privacy manifest for App Store submission.
</objective>

# Build & Distribution

App build, signing, and distribution for all Apple platforms.

## Agent Workflow (MANDATORY)

Before ANY distribution, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Check existing build configuration
2. **research-expert** - Verify latest App Store requirements
3. **mcp__XcodeBuildMCP__show_build_settings** - Review build settings

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Preparing app for release
- Configuring code signing
- Uploading to TestFlight
- Submitting to App Store
- Creating app icons
- CI/CD pipeline setup

### Why Build Distribution Skill

| Feature | Benefit |
|---------|---------|
| Automatic signing | Simplifies certificate management |
| TestFlight | Beta testing with users |
| App Store | Public distribution |
| CI/CD | Automated releases |

---

## Reference Guide

| Need | Reference |
|------|-----------|
| Certificates, profiles | [code-signing.md](references/code-signing.md) |
| Beta testing | [testflight.md](references/testflight.md) |
| App Store submission | [app-store.md](references/app-store.md) |
| Icons, assets | [app-icons.md](references/app-icons.md) |
| In-app purchases, subscriptions | [storekit2.md](references/storekit2.md) |
| IAP/subscription changes 2025-2026 (offer codes, retention, multiseat, Bundles) | [storekit-2026-updates.md](references/storekit-2026-updates.md) |
| Review guidelines revisions, rejections | [app-review-guidelines.md](references/app-review-guidelines.md) |
| Age ratings, new declarations, regional age laws | [age-ratings.md](references/age-ratings.md) |
| Privacy manifest, required-reason API, SDK rule | [privacy-manifest.md](references/privacy-manifest.md) |
| EU DMA terms, trader status, Japan/Brazil | [eu-alternative-distribution.md](references/eu-alternative-distribution.md) |
| Nutrition Labels, Xcode Cloud, webhooks, product page assets | [app-store-connect-2026.md](references/app-store-connect-2026.md) |
| macOS Developer ID, notarization (macos skill) | `macos` skill `references/notarization.md` |

---

## Deadlines (read 2026-11-13, sources in each reference)

| Date | Action |
|------|--------|
| 2027-01-12 | Complete the Shared Location and Dating and Relationships age rating declarations ([age-ratings.md](references/age-ratings.md)) |
| 2027-02-01 | Developer ID certificates from the old Sub-CA stop working, `.pkg` signed with them stop installing: move to G2 ([code-signing.md](references/code-signing.md)) |
| Early 2027 | Regulated medical device status (EEA/UK/US) or updates are blocked; no new On-Demand Resources uploads ([app-store-connect-2026.md](references/app-store-connect-2026.md)) |
| April 2027 | Upload with the iOS/iPadOS/tvOS/visionOS/watchOS 27 SDK, iOS 15+ target; iPhone Duo screenshots (specs page: apps on the iOS 27.1 SDK or later; news: all submissions) ([app-store.md](references/app-store.md)). Today the minimum is the 26 SDK and iOS 13 |

---

## Release Checklist

- [ ] Version and build number updated
- [ ] Layered app icon (Icon Composer) checked in default/dark/clear/tinted appearances, incl. alternate icons ([HIG app icons](https://developer.apple.com/design/human-interface-guidelines/app-icons))
- [ ] Privacy manifest (PrivacyInfo.xcprivacy) valid, SDK manifests covered ([privacy-manifest.md](references/privacy-manifest.md))
- [ ] Release configuration
- [ ] Archive validates
- [ ] TestFlight tested
- [ ] Screenshots updated (no alpha, required sizes)
- [ ] Age rating, trader, medical device declarations ([age-ratings.md](references/age-ratings.md))
- [ ] App Store metadata complete

---

## Best Practices

1. **Automatic signing** - Let Xcode manage
2. **TestFlight first** - Always beta test
3. **Increment build** - Every upload needs new build number
4. **Privacy manifest** - Required for App Store
5. **fastlane** - Automate repetitive tasks
6. **CI/CD** - GitHub Actions for automation
