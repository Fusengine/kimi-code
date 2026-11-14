# Game Controller

Verified 2026-11-13: `https://developer.apple.com/tutorials/data/documentation/gamecontroller/<symbol>.json`, `.../updates/gamecontroller.json`, iOS 27 release notes (https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes).

## Overview

| Symbol | Availability (symbol page) | Note |
|--------|----------------------------|------|
| `GCController` | iOS 7.0, macOS 10.9, tvOS 9.0, visionOS 1.0 | `controllers()`, `current` (14.0), `extendedGamepad`, `input` (17.0) |
| `GCControllerLiveInput` | iOS 17.0, macOS 14.0, tvOS 17.0, visionOS 1.0 | Poll in your game loop: `nextInputState()`, `capture()` |
| `GCController.DidConnectMessage` | 26.0 | Message type with the connected `controller`; the classic `NSNotification.Name.GCControllerDidConnect` also exists |
| `GCVirtualController` | iOS 15.0, iPadOS 15.0, Mac Catalyst 15.0 only | On-screen controls for games that support controllers (`connect(replyHandler:)`, `disconnect()`) |
| `GCStylus` | visionOS 26.0 | Physical stylus (`styli`, `input`, `haptics`) |
| `GCSpatialAccessory` | visionOS 27.0 | No abstract on its page; see [visionos arkit-spatial.md](../../visionos/references/arkit-spatial.md) for spatial accessories |
| `GCControllerHomeButtonSettingsManager` | iOS/iPadOS/macOS/visionOS 27.0 | Reads the system Home button settings: `controllerHomeButtonInAppAction`, `controllerHomeButtonSystemAction`, `settingsUpdates`, `openControllerHomeButtonSettings(for:)` |
| `GCRacingWheel` | macOS 13.0, Mac Catalyst 16.0 | Racing wheels |

Info.plist keys (landing page `gamecontroller`): `GCSupportedGameControllers`, `GCSupportsControllerUserInteraction`, `GCSupportsMultipleMicroGamepads`. Apple's June 2025 entry adds spatial controller support (product category check), `GCStylus`, and `NSAccessoryTrackingUsageDescription` when you need accessory-tracking data; its `GCSupportedGameControllers` value for spatial controllers is `SpatialGamepad`.

## Connect and poll (Swift 6)

```swift
import GameController

/// Observes controller connections and exposes the current controller.
@MainActor
final class ControllerMonitor {
    private var token: (any NSObjectProtocol)?

    func start() {
        token = NotificationCenter.default.addObserver(
            forName: .GCControllerDidConnect, object: nil, queue: .main
        ) { note in
            guard let controller = note.object as? GCController else { return }
            // Capture only Sendable values; read input from the game loop, not here.
            _ = controller.vendorName
        }
        GCController.startWirelessControllerDiscovery()
    }

    /// Called once per frame by the game loop.
    func poll() {
        guard let input = GCController.current?.input else { return }
        if let state = input.nextInputState() { _ = state }   // read buttons and sticks from the state
    }
}
```

Use `GCController.controllers()` for controllers that are already connected at launch. `startWirelessControllerDiscovery(completionHandler:)` has an optional handler (verified).

## Changes to know

| Change | Source |
|--------|--------|
| PlayStation Access controller supported on macOS, iPadOS and iOS; players can save custom input profiles in game controller settings | iOS 27 release notes, Game Controller section |
| Home button settings API (27.0) | symbol page above |
| visionOS: game controller events can be delivered through Game Controller instead of the responder chain by adding a user interaction (June 2024 entry) | `updates/gamecontroller` |

## Rules

- Never assume a controller: keyboard, mouse, touch or `GCVirtualController` must stay playable.
- tvOS focus-driven menus: see the `tvos` skill; this file covers gameplay input only.
