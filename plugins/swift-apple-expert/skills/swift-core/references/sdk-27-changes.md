---
name: sdk-27-changes
description: Xcode 27.0-27.2 and OS 27.0-27.2 SDK changes that break or deprecate older guidance - scene lifecycle, launch screen, Intel, deprecations, 27.1/27.2 notes
when-to-use: migrating an app to the 27 SDK, debugging a 27.x build or launch failure, choosing deployment targets, replacing a deprecated API
keywords: Xcode 27.2, iOS 27.2, scene lifecycle, launch screen, Intel, ARCHS_STANDARD, ld64, FileDocument, PreviewProvider, On Demand Resources, WKExtension, Mac Catalyst
priority: high
related: swift-6-4.md, ../../build-distribution/references/app-store.md
---

# 27 SDK Changes (current release: Xcode 27.2, OS 27.2)

Xcode 27.2 ships Swift 6.4.2 and the iOS, iPadOS, macOS, tvOS, watchOS and visionOS 27.2 SDKs; it requires macOS Tahoe 26.6 or later and runs on Apple silicon only. Xcode 27.1 carried the iOS 27.1 SDK (iPhone Duo); 27.2 aligned every platform on 27.2.

Keep two things apart: the **SDK you build with** (27.2) and the **minimum deployment target** you support (your choice, often much lower). Deprecations below usually key off the SDK or off the deployment target, as stated.

Sources: Xcode 27 / 27.1 / 27.2 and iOS, macOS, tvOS, watchOS, visionOS 27 / 27.2 release notes on https://developer.apple.com/documentation/xcode-release-notes and https://developer.apple.com/documentation/ios-ipados-release-notes (each platform has its own `*-release-notes` collection).

## Breaking for apps built with the 27 SDK

| Change | Action |
|--------|--------|
| **Scene-based life cycle is mandatory** (iOS, iPadOS, tvOS, visionOS): apps built with the latest SDK that still use the app-delegate-only life cycle fail to launch | SwiftUI `App` is already scene-based. UIKit apps: adopt `UIScene` / `UISceneDelegate`, move window setup out of `application(_:didFinishLaunchingWithOptions:)`. Guide: https://developer.apple.com/documentation/uikit/transitioning-to-the-uikit-scene-based-life-cycle |
| **Launch screen required** for iOS/iPadOS apps built with the 27.0 SDK: `Info.plist` needs `UILaunchStoryboardName`, `UILaunchStoryboards`, `UILaunchScreen` or `UILaunchScreens`; apps without one are rejected once the App Store accepts 27 SDK builds | Add `UILaunchScreen` (see build-distribution/app-icons.md) |
| **Intel**: `ARCHS_STANDARD` no longer includes `x86_64` when `MACOSX_DEPLOYMENT_TARGET` or `DRIVERKIT_DEPLOYMENT_TARGET` >= 27.0; the macOS 27 SDK still back-deploys Universal apps to macOS 12+ | Add `x86_64` to `ARCHS` explicitly if you ship Universal. All Intel software is incompatible with macOS 28 (except legacy games) |
| **ld64 removed**, `-ld_classic` unsupported | Remove the flag from build settings and scripts |
| `@State` is now a macro (back-deploys to iOS 17-aligned OSes): initial value expression evaluated once | See swiftui-core/state-management.md; do not give an initial value and assign in `init`; no composing with other wrappers |
| UIKit (27.1+): default `layoutMargins` of a `UIView` are zero; view controllers still give their root view `systemMinimumLayoutMargins` | To inherit them in a subview set `preservesSuperviewLayoutMargins = true` |
| External displays (27 SDK): `windowExternalDisplayNonInteractive` scenes are no longer offered automatically | UIKit: `UIViewController.registerSceneAccessory(_:)` with `UISceneAccessory.externalNonInteractive`; SwiftUI: `.sceneAccessory` with `ExternalNonInteractiveAccessory` |
| Stricter system TLS (27.0 OSes) for MDM, DDM, ADE, profile / app install, software update processes | Servers need TLS 1.2 at minimum plus Apple's listed requirements ("Prepare your network environment for stricter security requirements"); relevant to enterprise backends |

## Deprecated or removed

| Deprecated / removed | Replacement |
|----------------------|-------------|
| On Demand Resources, `NSBundleResourceRequest` (iOS, tvOS, visionOS) | Background Assets |
| `FileDocument` / `ReferenceFileDocument` (SwiftUI) | `ReadableDocument` (read-only) or `Document` (read and write), iOS 27+ |
| `PreviewProvider` and its modifiers | `#Preview` macro (already mandatory in solid-swift) |
| `canOpenURL:` | Attempt `open(_:)` and handle failure; prefer universal links |
| `WKExtension`, `WKExtensionDelegate` (watchOS; when minimum deployment >= 9.2) | SwiftUI `App` life cycle, or `WKApplication` / `WKApplicationDelegate` (verify on developer.apple.com before migrating) |
| `.squareBorder` / `.roundedBorder` text field styles (soft deprecated) | `.bordered` style, `textInputBorderShape(_:)` |
| UIApplication status-bar accessors (`statusBarFrame`, ...) | Scene-based APIs (`UIWindowScene.statusBarManager`) |
| `DVDPlayback` framework (removed from macOS 27 SDK) | None |

## 27.1 and 27.2 specifics

- **Deployment target pitfall (Xcode 27.2)**: the macOS, watchOS, tvOS and visionOS SDKs wrongly list 27.1 as a valid deployment target (release note 187160501). Use 27.0 or 27.2, never 27.1, for those platforms. Mac Catalyst 27.1/27.2 deployment targets may not see newly introduced API.
- **Mac Catalyst + iOS 27.1 API**: code using iOS 27.1-only APIs fails to compile for Mac Catalyst. Isolate with `#if !targetEnvironment(macCatalyst)` or set a Mac Catalyst 27.0 minimum deployment.
- **iOS 27.2 ATT**: `AppTrackingTransparency` supports an alternative expanded prompt and yearly re-prompting for EU users; the alternative prompt is required for France, Germany, Italy, Poland and Romania. API: `requestTrackingAuthorization(preferExpandedInterface:additionalInformationAction:completionHandler:)` (renamed during the beta; verify the final signature on developer.apple.com before writing code).
- **Xcode 27.2 JSON project format**: opt-in (File inspector), more merge-friendly and easier for agents to edit; such projects still open in earlier Xcode 27 releases. Convert only when every contributor is on Xcode 27.x.
- **iPhone Duo** (27.1 SDK): Duo simulator runtime lacks StandBy and most app extensions; a `CameraCaptureAccessory` app can use both displays without a capture session (known issue 190155353). `ArrangementView` is available from 27.1 on every platform (see swiftui-core/hig-iphone-duo.md).
- **Device Hub** (27.2): pinch/rotate via Sidecar or MacBook with Touch, input to iOS 17 simulators, Secure keyboard entry; CarPlay needs a USB-connected device. Previews: the RenderPreview MCP tool now returns render destinations and accepts one.
- **StoreKit testing**: `SKTestSession.clearTransactions()` resets intro-offer eligibility, storefront/locale changes propagate through `Storefront.updates`, `dialogsDisabled` is honored (fixed in 27.2). Purchasing a subscription bundle member still allows unbundling instead of throwing (known issue).
- **Simulator**: cloning a 27.2 runtime device can fail on file permissions; delete the `*.sb-????????-??????` files under the source device's `data` directory (workaround in the iOS 27.2 notes).
- **Testing (Xcode 27)**: `XCUIVoiceOverService` drives VoiceOver from UI tests (focus, spoken output, navigation); a failed XCTest assertion inside a Swift Testing test (or vice versa) surfaces as a runtime-issue warning, controlled by the test plan's interoperability setting.
- **Icon Composer 2.0** (Xcode 27): preview new sharper rendering (refractivity, outside specular, deeper shadows) for the 2027 OSes; one icon can serve both design generations.
- **App Store upload minimum is still Xcode 26 / SDK 26** (https://developer.apple.com/news/upcoming-requirements/, checked 2026-11-08); building with Xcode 27.2 is allowed and the 27 SDK requirements above apply when you do.
