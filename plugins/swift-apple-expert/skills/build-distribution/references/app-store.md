---
name: app-store
description: App Store submission requirements (SDK and deployment minimums today and April 2027, screenshots incl. iPhone Duo), metadata checklist and pointers to guidelines, age ratings, privacy manifest
when-to-use: submitting to App Store, preparing metadata and screenshots, checking upload minimums, handling review feedback
keywords: App Store, submission, SDK minimum, April 2027, screenshots, iPhone Duo, metadata, App Store Connect
priority: high
requires: code-signing.md, testflight.md
related: app-icons.md, app-review-guidelines.md, age-ratings.md, privacy-manifest.md, eu-alternative-distribution.md, app-store-connect-2026.md
---

# App Store Submission

## When to Use

- Submitting new app
- Updating existing app
- Preparing metadata
- Handling review rejection
- Managing app versions

## Key Concepts

### Submission Requirements

**Technical:**
- Valid code signature
- Privacy manifest (PrivacyInfo.xcprivacy)
- App icons (all variants)
- Launch screen (mandatory in `Info.plist` for iOS/iPadOS apps built with the 27 SDK: `UILaunchStoryboardName`, `UILaunchStoryboards`, `UILaunchScreen` or `UILaunchScreens`)
- Correct deployment target (never 27.1 for macOS/watchOS/tvOS/visionOS with Xcode 27.2: the SDK lists it by mistake)
- **Today (2026-11-13)**: built with Xcode 26+ and the iOS/iPadOS/tvOS/visionOS/watchOS 26 SDK or later (minimum since 2026-04-28); iOS and iPadOS apps must target iOS 13 or later (since 2026-09-09). Source: https://developer.apple.com/news/upcoming-requirements/. Xcode 27.2 ships the 27.2 SDKs.
- **Starting April 2027**: iOS/iPadOS apps must be built with the iOS & iPadOS **27 SDK** or later **and target iOS 15 or later**; tvOS, visionOS and watchOS apps with the 27 SDK or later. SDK minimums: https://developer.apple.com/news/?id=k1mtkt1k (2026-09-09); the iOS 15 target: only https://developer.apple.com/app-store/submitting/ (read 2026-11-13). The upcoming-requirements page does not list this yet; plan the move to Xcode 27 now.
- 27 SDK builds: scene-based life cycle required (UIKit apps), `ARCHS_STANDARD` excludes `x86_64` at macOS 27.0+ deployment, On Demand Resources deprecated (Background Assets; uploads from new ODR apps refused from early 2027). See swift-core `references/sdk-27-changes.md`
- macOS builds: no `com.apple.quarantine` attribute in TestFlight/App Store apps; Apple states macOS 26 is the last release supporting Intel Macs (news k1mtkt1k) and macOS 27 the final release supporting Rosetta (news w5ngl9k2); see [notarization.md](../../macos/references/notarization.md). A universal app with minimum macOS 13+ may drop `x86_64` for the Mac App Store (ASC release notes 2026-06-18)

### Screenshots (https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications, read 2026-11-13)

- At least one, up to 10 per device size; `.jpeg`, `.jpg` or `.png`; **no alpha channel or transparency**
- Required sizes: iPhone with Dynamic Island (medium display) and, if the app supports iPadOS, iPad 13-inch. Mac, Apple TV, Apple Vision Pro and Apple Watch apps need their own set (Mac 16:10: 1280x800, 1440x900, 2560x1600 or 2880x1800; Apple TV 1920x1080 or 3840x2160; Vision Pro 3840x2160; Watch sizes per model, identical across localizations)
- If the UI is consistent across sizes, supply the highest required resolution and App Store Connect scales it down
- **iPhone Duo**: 1398x2034 / 2034x1398 px (outer display) and 2007x2853 / 2853x2007 px (inner display). The specifications page says that from April 2027 screenshots are **required for any app using the iOS 27.1 SDK or later**; the news post (https://developer.apple.com/news/?id=kkphp5qo) words it more broadly: "any apps or games submitted will need to include screenshots for iPhone Duo". Plan for the broader reading. Submitting them adds a "made for iPhone Duo" badge

**Metadata:**
- App name and subtitle
- Description (short and long)
- Keywords
- Screenshots per device
- App preview videos (optional)
- Privacy policy URL

### Privacy Manifest
`PrivacyInfo.xcprivacy` with required-reason API entries (`NSPrivacyAccessedAPITypes`) is enforced by App Store Connect since 2024-05-01. Workflow, SDK rule and placement: [privacy-manifest.md](privacy-manifest.md).

### Compliance declarations
Age rating questionnaire ([age-ratings.md](age-ratings.md)), EU trader status and regional terms ([eu-alternative-distribution.md](eu-alternative-distribution.md)), regulated medical device status, Accessibility Nutrition Labels ([app-store-connect-2026.md](app-store-connect-2026.md)).

### Review Process
No review duration is published: Apple says App Review examines an app "as soon as we can", with longer times for complex apps or repeated rejections. Track status in App Store Connect; "Pending Developer Release" lasts until you release. Details and sources: [app-review-guidelines.md](app-review-guidelines.md).

---

## Submission Checklist

### Before Upload
- [ ] Version number correct
- [ ] Build number unique
- [ ] Privacy manifest complete ([privacy-manifest.md](privacy-manifest.md))
- [ ] Export compliance answered
- [ ] All capabilities configured
- [ ] SDK/deployment minimums met (today vs April 2027, above)
- [ ] macOS: no quarantine attribute, Developer ID certificates from G2 if also distributing outside the store

### In App Store Connect
- [ ] App name and subtitle
- [ ] Description
- [ ] Keywords (up to 100 bytes, https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
- [ ] Screenshots (required sizes, no alpha; iPhone Duo set from April 2027)
- [ ] App preview (optional)
- [ ] Category selected
- [ ] Age rating questionnaire, incl. Shared Location and Dating declarations by 2027-01-12
- [ ] Trader status (EU), regulated medical device status where in scope
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Copyright

---

## Guidelines and Rejections

The rejection list is maintained against the live guidelines (last updated 2026-10-16) in [app-review-guidelines.md](app-review-guidelines.md): revision log 2025-06 to 2026-10, the sections that decide most submissions (2.1, 2.3, 3.1, 4.2, 4.3, 5.1), and how to answer a rejection.

---

## Best Practices

- ✅ Test thoroughly before submission
- ✅ Complete all metadata
- ✅ Accurate screenshots
- ✅ Clear privacy policy
- ✅ Respond quickly to reviewer
- ❌ Don't submit broken builds
- ❌ Don't use placeholder content
- ❌ Don't ignore guideline feedback
