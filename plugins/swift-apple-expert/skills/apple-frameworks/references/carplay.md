---
name: carplay
description: CarPlay framework for iOS 26.4 and 27 - map panels (CPMapPanel), video browsing, thumbnails and details headers, MiniPlayer, voice control overlay, route sharing
when-to-use: building or extending a CarPlay navigation, audio, video or voice app; adding panels to the map template
keywords: CPMapPanel, CPMapPanelItem, CPMapPanelButtonConfiguration, CPMapTemplate, pushPanel, CPPlaybackConfiguration, CPListTemplateDetailsHeader, allowsMiniPlayer, showOverlayTemplate, route sharing, supportsVideoPlayback
priority: medium
related: ../SKILL.md, ../../swiftui-core/references/hig-system-surfaces.md
---

# CarPlay

Sources, read 2026-11-13: WWDC26 session 212 "Rev up your CarPlay app" (https://developer.apple.com/videos/play/wwdc2026/212/, transcript and code read on the page); CarPlay landing page https://developer.apple.com/documentation/carplay (no framework updates page: 404); symbol pages `.../tutorials/data/documentation/carplay/<symbol>.json`. CarPlay apps need a CarPlay entitlement per category (https://developer.apple.com/documentation/carplay/requesting-carplay-entitlements, not read in detail). Widgets and Live Activities appear in CarPlay for any app: [hig-system-surfaces.md](../../swiftui-core/references/hig-system-surfaces.md).

## Symbols

| Need | Symbol | Availability |
|------|--------|--------------|
| Map panel | `CPMapPanel(title:sections:buttonConfiguration:)`, `CPMapPanelSection(title:items:)`, `CPMapPanelItem` (inits for `trip`, `routeChoice`, `routeDetails`, `mapTemplateWaypoint`, `travelEstimates`, `chargingStationConnection`), `CPMapPanelButtonConfiguration(primaryAction:secondaryButton:travelEstimates:)`, delegate `panelDidShow(_:)` / `panelDidHide(_:)` | iOS 27.0 |
| Show panels | `CPMapTemplate.showPanel(_:)`, `pushPanel(_:)`, `popPanel`, `hidePanel` (all with `async throws -> Bool` forms) | 27.0 |
| EV charging | `CPChargingStationConnection(connector:voltage:power:)` | 27.0 |
| Overlay template | `CPInterfaceController.showOverlayTemplate(_:animated:)` / `hideOverlayTemplate` | 27.0 |
| MiniPlayer | `CPNowPlayingTemplate.allowsMiniPlayer` (default on; set `false` to show the now-playing icon in the navigation bar) | 27.0 |
| Video support | `CPSessionConfiguration.supportsVideoPlayback` | 26.4 |
| Rich lists | `CPPlaybackConfiguration`, `CPListTemplateDetailsHeader`, `CPThumbnailImage`, `CPImageOverlay`, `CPSportsOverlay` | 26.4 |
| Route sharing | `CPMapTemplateDelegate.mapTemplateShouldProvideRouteSharing(_:)` (return `true`), `CPTrip.routeSegmentsAvailableForRegion = false` to opt a trip out | 26.4 |
| 3D coordinates | `CPLocationCoordinate3D` | 26.4 |

## Rules (session 212)

- **Panels** let a navigation app build its own primary area of the map template independently of trip and route-choice presentation; combine trips, grids, route choices, route details, waypoints and list items; the button configuration adds the actions at the bottom (Go, End). Build and push panels while the map stays visible.
- **Route sharing** (iOS 26.4 and a supported vehicle): the app sends route segments (geographic coordinates) to the vehicle whenever the trip changes; the vehicle may propose a charging waypoint through the map template. Return updated travel estimates to prompt the driver, or manage confirmation yourself.
- **Video**: needs the CarPlay video entitlement and AirPlay video streaming support; apps with only the video entitlement appear on the home screen only in cars with the video-in-car feature; the car can switch to audio-only at any time. If content suits both, hold the audio and video entitlements. Add the videos tab only when `supportsVideoPlayback` is true. Provide subtitles and audio languages.
- **Lists**: thumbnails accept portrait or landscape images, overlays (title text, image badge, sports teams and score), playback progress through `CPPlaybackConfiguration` (preferred presentation video or audio, elapsed time, duration, play/pause/replay action). Update the thumbnail's and details header's playback configuration on every playback state change.
- **Voice control**: the template is available to all categories in iOS 27; optional prompt and animated icon, up to two action buttons plus leading and trailing navigation bar buttons; present it as an overlay over another template and give shorter text for the overlay. For feedback sounds set `AVAudioSession` to the play-and-record category, default mode, mixing disabled. To start navigation or a call from it, open the URL through `CPTemplateApplicationScene`.
- The CarPlay Simulator can be configured as a video-capable vehicle (session 212). Xcode 27 notes list as fixed: "Cannot start a CarPlay connection with CarPlay Simulator when accessed via Device Hub" (radar 179523697).

```swift
import CarPlay

// Keep the MiniPlayer unless your design needs the icon in the bar.
CPNowPlayingTemplate.shared.allowsMiniPlayer = false

// Route sharing: opt in for the map template.
func mapTemplateShouldProvideRouteSharing(_ mapTemplate: CPMapTemplate) -> Bool { true }

// Panels (iOS 27): build sections from items you already use, then push.
func showTripPanel(on mapTemplate: CPMapTemplate, trip: CPTrip,
                   go: CPTextButton, estimates: CPTravelEstimates) async throws {
    let item = CPMapPanelItem(trip: trip)
    let section = CPMapPanelSection(title: "Route", items: [item])
    let buttons = CPMapPanelButtonConfiguration(
        primaryAction: go, secondaryButton: nil, travelEstimates: estimates)
    let panel = CPMapPanel(title: "Trip", sections: [section], buttonConfiguration: buttons)
    _ = try await mapTemplate.pushPanel(panel)
}
```

The first two snippets are Apple's session code; the panel function composes the initializers verified on their symbol pages and is not compiled against the SDK here.
