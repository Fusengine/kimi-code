# PhotoKit

Verified 2026-11-13 on `https://developer.apple.com/tutorials/data/documentation/photos/<symbol>.json` and the iOS/iPadOS 27 release notes (https://developer.apple.com/documentation/ios-ipados-release-notes/ios-ipados-27-release-notes, section PhotoKit). The `updates/photokit.json` page stops at June 2024.

## Verified symbols

| Symbol | Availability | Note |
|--------|--------------|------|
| `PHAssetResource.filename` | iOS/iPadOS/Mac Catalyst/macOS/tvOS/visionOS 27.0 | `String?` (nullable) |
| `PHAssetResource.originalFilename` | introduced iOS 9.0, **deprecated 27.0** | Declared `String` non-nullable |
| `PHAsset.addedDate` | iOS/iPadOS/macOS/tvOS/visionOS 26.0 | `Date?` |
| `PHAssetResource` | iOS 9.0, macOS 10.15, tvOS 10.0, visionOS 1.0 | |
| `PhotosPicker` (PhotosUI) | iOS 16.0, macOS 13.0, watchOS 9.0 | SwiftUI picker; no PhotoKit authorization needed for picking |

## filename vs originalFilename (27 SDK)

Apple's iOS 27 deprecation note: `originalFilename` is incorrectly marked non-nullable, which misrepresents the value; the new nullable `filename` property replaces it. Rebuilding on the 27 SDK shows a deprecation warning.

```swift
import Photos

/// Display name for a resource; never force-unwrap.
func displayName(of resource: PHAssetResource) -> String {
    resource.filename ?? String(localized: "Untitled photo")
}
```

If your deployment target is below 27.0, `filename` is unavailable: wrap it in `if #available(iOS 27.0, *)` and fall back to `originalFilename`, treating an empty value as missing. iOS 27 notes, PhotoKit, Resolved Issues: "The `addedDate` property on `PHAsset` might return nil even though it's marked as non-nullable"; the 26.0 symbol page now types it `Date?`. Handle `nil` for every optional.

## Rules

- Prefer `PhotosPicker` when you only need the person's selection.
- Never assume a filename exists; show a localized fallback.
- No Apple-dated PhotoKit change other than the above was found for 2025-2026; the updates page being stale is not proof of absence.
