---
name: mapkit
description: MapKit geocoding and addresses (MKGeocodingRequest, MKReverseGeocodingRequest, MKAddress, MKAddressRepresentations) and the native SwiftUI Map
when-to-use: turning text into places or coordinates into addresses, formatting an address for display, choosing between SwiftUI Map and an MKMapView wrapper
keywords: MKGeocodingRequest, MKReverseGeocodingRequest, MKAddress, MKAddressRepresentations, MKMapItem, Map, MapContentBuilder, CLGeocoder
priority: medium
related: ../SKILL.md, ../../ios/references/uikit-integration.md
---

# MapKit

Sources, read 2026-11-13: MapKit updates page https://developer.apple.com/documentation/updates/mapkit (June 2025 entry), symbol pages `developer.apple.com/tutorials/data/documentation/mapkit/<symbol>.json`.

## Geocoding and addresses (iOS 26.0)

| Need | Symbol | Notes |
|------|--------|-------|
| Text to places | `MKGeocodingRequest(addressString:)` (failable init) | `mapItems` (`async throws`) or `getMapItems(completionHandler:)`; `preferredLocale`, `region`, `isLoading`, `cancel()` |
| Coordinates to places | `MKReverseGeocodingRequest(location:)` (failable init, takes `CLLocation`) | Same result API plus `location` |
| Address on a place | `MKMapItem.address` (`MKAddress?`), `MKMapItem.addressRepresentations` (`MKAddressRepresentations?`) | All iOS/iPadOS/macOS/tvOS/watchOS/visionOS 26.0 |
| Raw address strings | `MKAddress.fullAddress`, `shortAddress`; `MKAddress(fullAddress:shortAddress:)` | For place cards and annotations built from an `MKMapItem` |
| Formatted address | `MKAddressRepresentations`: `cityName`, `cityWithContext`, `regionName`, `fullAddress(includingRegion:singleLine:)`, `cityWithContext(_:)` with `ContextStyle` | Controls how much disambiguation is added |
| Cycling | cycling transport type for directions and ETAs (June 2025 updates page) | |

`CLGeocoder` (Core Location) is deprecated at 26.0 on every platform ("Use MapKit"), and `reverseGeocodeLocation(_:completionHandler:)` says "Use MKReverseGeocodingRequest": use the two request classes above, which return `MKMapItem` with the new address types.

```swift
import MapKit

func placeName(for location: CLLocation) async throws -> String? {
    guard let request = MKReverseGeocodingRequest(location: location) else { return nil }
    let items = try await request.mapItems
    return items.first?.addressRepresentations?.cityWithContext(.automatic)
}
```

`MKAddressRepresentations.ContextStyle` cases: `automatic`, `short`, `full`; `cityWithContext(_:)` returns `String?`.

## SwiftUI Map first

`Map` with `@MapContentBuilder` content and `MapCameraPosition` binding (initializers iOS 17.0, macOS 14.0, watchOS 10.0) covers annotations (`Marker`, `Annotation`, `UserAnnotation`), overlays (`MapCircle`, `MapPolygon`, `MapPolyline`), controls (`MapCompass`, `MapScaleView`, `MapUserLocationButton`), selection (`MapSelection`), `LookAroundPreview` and place detail sheets/popovers (`mapItemDetailSheet`, `mapItemDetailPopover`). Wrap `MKMapView` only for deployments below iOS 17 or behavior with no SwiftUI equivalent: [uikit-integration.md](../../ios/references/uikit-integration.md).

## Privacy

Location permission (`CLLocationManager`) is separate from geocoding and needs `NSLocationWhenInUseUsageDescription`; privacy declarations: [privacy-manifest.md](../../build-distribution/references/privacy-manifest.md).
