---
name: resizing-and-mirroring
description: iPad window resizing and iPhone Mirroring rules for apps built with the iOS 27 SDK - orientation handling, UIRequiresFullScreen, UIScreen bounds, resize delivery
when-to-use: an app misbehaves when an iPad window is resized, an iPhone-only app runs on iPad, testing iPhone Mirroring on a Mac, deciding whether to keep UIRequiresFullScreen
keywords: UIRequiresFullScreen, UISupportedInterfaceOrientations, UIScreen.main, continuous resize, iPhone Mirroring, supportedInterfaceOrientations, windowed
priority: high
related: multitasking.md, adaptive-layouts.md, menu-bar-windows.md
---

# iPad Resizing and iPhone Mirroring (iOS 27 SDK)

Source: iPadOS and iOS 27 release notes, UIKit "Resolved Issues" (https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes, JSON `.../tutorials/data/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes.json`, read 2026-11-13). Each rule applies to apps **built with the iOS 27 SDK**; radar numbers are Apple's.

## Resizing on iPad

| Situation | Rule from Apple's notes | Radar |
|-----------|-------------------------|-------|
| iPad app whose `UISupportedInterfaceOrientations` lacks some of the four orientations | No longer treated as non-continuously resizable: "supported interface orientations should no longer be a condition for continuous resizability" | 166422120 |
| iPhone-only app on iPad | After the first resize the scene ignores supported interface orientations | 178561952 |
| iPhone-only app limited to portrait or landscape | Layout no longer breaks when the iPad sits in an unsupported orientation | 178573319 |
| App sets `UIRequiresFullScreen` | Each resize is delivered as a discrete change to a **new `UIScreen`** with updated bounds, not as continuous resize updates; `UIScreen.main.bounds` stays fixed once the screen connects | 178560235, 178562971, 178559386 |

## WWDC26 session 278 "Modernize your UIKit app" (https://developer.apple.com/videos/play/wwdc2026/278/, transcript and code read 2026-11-13)

- iPhone Mirroring windows are fully resizable; an iPhone-only app on iPad is fully resizable but still runs under the **phone idiom**. Apps must adapt to any scene size at runtime.
- Scene life cycle is required with the latest SDKs (no launch otherwise).
- Do not reference the main screen: use `window?.windowScene?.screen`, or pass a screen in. Replace screen scale with `traitCollection.displayScale` (tracked automatically inside `layoutSubviews`, `updateProperties`, `draw`; elsewhere `registerForTraitChanges`).
- Do not use screen bounds: read `windowScene.effectiveGeometry.coordinateSpace.bounds`, observe `windowScene(_:didUpdateEffectiveGeometry:)`, and inside views use the view's own size.
- `UIRequiresFullScreen` is honored on iPhone in resizable environments from iOS 27 and no longer opts out of resizing: it enables **discrete resizing**, each size change moves the scene to a new screen configuration and honors the supported orientations (meant for games).
- The user-interface idiom is no longer meaningful for layout: use size classes. Supported interface orientation is only a preference and is ignored in resizable environments; in iPhone Mirroring the app always reports portrait whatever the scene's aspect ratio.
- `UIView` conforms to the new Core Location and Core Motion body protocols: `motionManager.deviceMotionBody = view`, `locationManager.headingBody = view` (iOS 27.0).
- Testing: Device Hub and Xcode Previews have a resize mode; still test iPhone Mirroring and iPad on real devices. Xcode 27 ships an app-modernization agent skill (`xcrun agent skills export` exports Xcode's skills as markdown).

Consequences for code:

- Never derive layout from `UIScreen.main.bounds` or device orientation; read the window or scene geometry (size classes, `windowScene(_:didUpdateEffectiveGeometry:)` iOS 26.0, see [menu-bar-windows.md](menu-bar-windows.md)). Under `UIRequiresFullScreen`, Apple's notes say a resize arrives as a change to a new `UIScreen`, not as a continuous resize; verify your resize handling on that path on a device.
- Do not use `UISupportedInterfaceOrientations` to keep an iPad app from resizing; design the layout for any size ([adaptive-layouts.md](adaptive-layouts.md)).

## iPhone Mirroring (Mac showing an iPhone app)

| Situation | Rule from Apple's notes | Radar |
|-----------|-------------------------|-------|
| Supported orientations | Fixed behavior: the declared orientations are honored until the user starts resizing the window, after which the scene supports all orientations regardless of `UISupportedInterfaceOrientations` / `supportedInterfaceOrientations` | 178555304 |
| `UIRequiresFullScreen` | Same discrete-`UIScreen` resize delivery as on iPad | 178558224 |
| Initial screen | The scene starts on `UIScreen.main` (before, it connected to another screen) | 178558897 |

Other fixes the same notes list under "iPhone Mirroring": resizing may fail after pressing Home in the mirrored app (180961142), restarting an app while mirroring could freeze the screen and disable resizing (181023494), iPhone Mini did not resize properly (181057810). Test the mirrored window at several sizes; do not assume a fixed iPhone size.
