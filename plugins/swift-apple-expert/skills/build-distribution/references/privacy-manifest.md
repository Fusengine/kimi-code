---
name: privacy-manifest
description: PrivacyInfo.xcprivacy workflow for the app and third-party SDKs - data collection, required-reason API categories, bundle placement, App Store Connect validation rules
when-to-use: adding or auditing a privacy manifest, adopting a third-party SDK, fixing an App Store Connect privacy manifest email or rejection
keywords: PrivacyInfo.xcprivacy, privacy manifest, required reason API, NSPrivacyAccessedAPITypes, third-party SDK, tracking domains, privacy report
priority: high
requires: app-store.md
related: app-review-guidelines.md, code-signing.md
---

# Privacy Manifest

All text below was read 2026-11-13 from Apple documentation (JSON endpoints behind developer.apple.com/documentation).

## What it records

Source: https://developer.apple.com/documentation/bundleresources/privacy-manifest-files

"Apps and third-party SDKs - distributed as XCFrameworks, Swift packages, or Xcode projects - can contain a privacy manifest file, named `PrivacyInfo.xcprivacy`." It records:
- the **types of data collected** (all platforms);
- the **required reason APIs** used (iOS, iPadOS, tvOS, visionOS, watchOS).

`PrivacyInfo.xcprivacy` is the required file name. Create it in Xcode with File > New File > Resource > App Privacy File and check the target; it must be in the target's resources for Xcode to use it in a privacy report. A static-library SDK ships it by using a static framework target (Xcode 15+) with Mach-O type "Static Library".

## Required-reason API workflow

Source: https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api

1. Find every use of covered API, in your code **and in third-party SDKs**.
2. For each category used, add a dictionary to the `NSPrivacyAccessedAPITypes` array with `NSPrivacyAccessedAPIType` (the category) and `NSPrivacyAccessedAPITypeReasons` (approved reason codes).
3. Categories (https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype): `NSPrivacyAccessedAPICategoryFileTimestamp`, `NSPrivacyAccessedAPICategorySystemBootTime`, `NSPrivacyAccessedAPICategoryDiskSpace`, `NSPrivacyAccessedAPICategoryActiveKeyboards`, `NSPrivacyAccessedAPICategoryUserDefaults`. Take reason codes and the API list from the key's page; Apple updates them over time.
4. Declared reasons must accurately reflect the use and be consistent with functionality shown to users; you may use the API and derived data **for the declared reasons only**, never for tracking. Fingerprinting is not allowed whether or not the user grants tracking permission.
5. Each executable or dynamic library that uses a required-reason API needs its bundle to carry a manifest that reports it.
6. No listed reason fits and the use benefits the user: submit a request for a new approved reason (Apple's note on that page).

Enforcement: "Starting May 1, 2024, apps that don't describe their use of required reason API in their privacy manifest file aren't accepted by App Store Connect." (same page; also https://developer.apple.com/news/upcoming-requirements/).

## Placement

Source: https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk

| Product | Location |
|---------|----------|
| iOS/iPadOS/tvOS/visionOS/watchOS app | `App.app/PrivacyInfo.xcprivacy` (bundle root) |
| macOS and Mac Catalyst app | `App.app/Contents/Resources/PrivacyInfo.xcprivacy` |
| iOS-family framework | `Framework.framework/PrivacyInfo.xcprivacy` |
| macOS and Mac Catalyst framework | `Framework.framework/Versions/A/Resources/PrivacyInfo.xcprivacy` |

Xcode places it correctly; check the paths if you build without Xcode.

## Third-party SDK rule (Apple's exact scope)

Source: https://developer.apple.com/support/third-party-SDK-requirements/ ("SDKs that require a privacy manifest and signature")

> "You must include the privacy manifest for any SDK listed below when you submit new apps in App Store Connect that include those SDKs, or when you submit an app update that adds one of the listed SDKs as part of the update. Signatures are also required in these cases where the listed SDKs are used as binary dependencies. Any version of a listed SDK, as well as any SDKs that repackage those on the list, are included in the requirement."

The list includes Alamofire, Firebase pods, Flutter, GoogleSignIn, Kingfisher, Lottie, OneSignal, RxSwift, SDWebImage, SnapKit and others: read the page for the full list. For an SDK **you author**: "include a privacy manifest file in your third-party SDK if it uses a required reasons API, collects data about the person using apps that include the third-party SDK, enables the app to collect data about people using the app, or contacts tracking domains" (privacy-manifest-files page).

Validity: "App Store Connect rejects app submissions that include invalid privacy manifest files" (unexpected keys or values; email names the file path). For an invalid file from an SDK, get an updated SDK; troubleshooting is TN3181. Since 2025-02-12 apps must contain a valid manifest for the listed SDKs.

## Checklist

- [ ] App manifest present with data collection and required-reason entries
- [ ] Every embedded SDK either listed on Apple's page (manifest + signature) or carrying its own manifest when it matches the scope above
- [ ] Reasons truthful and not reused for tracking
- [ ] Generate Xcode's privacy report (it combines the SDK manifests) and use it for accurate Privacy Nutrition Label answers
