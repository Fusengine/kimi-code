# Core Location, WeatherKit, EventKit (brief)

Verified 2026-11-13 on `https://developer.apple.com/tutorials/data/documentation/<path>.json`. **No Apple-dated change for these three frameworks was found for June 2025 to today**: their `updates` pages stop at June 2024 (or are absent) and the 27 release notes have no section for them. That is inference from stale pages, not an Apple statement of "no change". The only 2026 item that touches weather is a first-party Weather Highlights feature (US English), not an API.

## Verified symbols

| Symbol | Availability | Use |
|--------|--------------|-----|
| `CLLocationUpdate` | iOS 17.0, macOS 14.0, tvOS 17.0, visionOS 1.0, watchOS 10.0 | `liveUpdates(_:)` returns an async sequence of updates; `location`, `isStationary` |
| `CLMonitor` (actor) | iOS 17.0, iPadOS 17.0, macOS 14.0 | Condition monitoring (geofencing-style), Swift concurrency |
| `CLServiceSession` | iOS 18.0, tvOS 18.0, visionOS 1.0 (Swift class), watchOS 11.0 | Declares that the app needs location services; authorization diagnostics via `CLLocationUpdate` flags such as `authorizationDenied`, `accuracyLimited` |
| `CLLocationManager` | iOS 2.0 and later, all platforms | Delegate-based API, still present |
| `WeatherService.shared`, `weather(for:)` (async, throws) | iOS 16.0, macOS 13.0, tvOS 16.0, visionOS 1.0, watchOS 9.0 | Needs the WeatherKit capability |
| `EKEventStore.requestFullAccessToEvents(completion:)`, `requestWriteOnlyAccessToEvents(completion:)` | iOS 17.0, macOS 14.0, visionOS 1.0, watchOS 10.0; no tvOS | Calendar access levels |

## Patterns

```swift
import CoreLocation
import WeatherKit

/// Current weather at the latest live location.
func currentWeather() async throws -> Weather? {
    for try await update in CLLocationUpdate.liveUpdates(.default) {
        guard let location = update.location else { continue }
        return try await WeatherService.shared.weather(for: location)
    }
    return nil
}
```

`CLLocationUpdate.LiveConfiguration` cases (verified): `default`, `airborne`, `automotiveNavigation`, `fitness`, `maritime`, `otherNavigation`. Hold a `CLServiceSession` for as long as the feature runs; check `CLLocationUpdate` authorization flags and show a localized explanation instead of failing silently.

Calendar: choose write-only access when the app only adds events; full access only when it reads existing ones. Usage strings: `NSCalendarsWriteOnlyAccessUsageDescription`, `NSCalendarsFullAccessUsageDescription` (both iOS 17.0, verified).

## Rules

- Ask for the least access that works (write-only calendar access, when-in-use location).
- WeatherKit setup (capability, attribution) was not re-read here; check Apple's WeatherKit pages before release.
- Foundation Models tools can wrap these frameworks; see `apple-intelligence`.
