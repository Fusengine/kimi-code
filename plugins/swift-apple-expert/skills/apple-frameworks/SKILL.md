---
name: apple-frameworks
description: Use when adding an Apple system framework to an app - passkeys and credential exchange, MapKit geocoding, CloudKit, Core Data, TipKit, local notifications, continued background tasks, MetricKit state reporting, App Attest, HealthKit workout zones, CarPlay map panels, or Chart3D.
---

<objective>
Reference skill for Apple system frameworks outside SwiftUI, UIKit and AppKit. Each reference holds the symbols verified on Apple's documentation JSON (availability, deprecations), the current-year changes (2025-2026 updates pages and iOS 27 release notes) and a minimal Swift 6 sample.

Covers AuthenticationServices (passkeys, account creation, Credential Exchange, `ASCredentialDataManager`), MapKit (geocoding, `MKAddress`), CloudKit, Core Data (current role next to SwiftData), TipKit, UserNotifications, `BGContinuedProcessingTask`, MetricKit and StateReporting, App Attest, HealthKit (iOS workout sessions, medications, workout zones, limited-history permission), CarPlay (`CPMapPanel`) and Chart3D.

Every fact carries its Apple URL and the date it was read; a symbol that could not be verified is not written.
</objective>

# Apple Frameworks

System frameworks an app adopts next to its UI layer.

## Agent Workflow (MANDATORY)

Before ANY implementation, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Find existing framework usage, entitlements, Info.plist keys
2. **research-expert** - Verify the symbol and its availability on `developer.apple.com/tutorials/data/documentation/<framework>/<symbol>.json`
3. **mcp__apple-docs__search_apple_docs** - Cross-check (search is unreliable: confirm on the JSON page)

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Passwordless sign-in, passkey sign-up, moving credentials between password managers
- Address lookup or place names from text or coordinates
- Syncing app data through iCloud, or maintaining an existing Core Data stack
- Teaching features with tips, scheduling or showing notifications
- Finishing a user-started job after the app leaves the foreground
- Collecting performance data per feature, proving app integrity to a server
- Workout zones, medications, or limited-history permission in HealthKit
- A navigation overlay in CarPlay, a 3D chart

### Why this skill

| Problem | What this skill gives |
|---------|-----------------------|
| Deprecated or renamed APIs in samples and videos (`ASCredentialUpdater`) | Current symbol with the deprecation date |
| Capability and entitlement gaps | Required Info.plist keys and entitlements per framework |
| Platform gaps (App Attest, `HKLiveWorkoutBuilder` on iOS) | Availability copied from Apple's pages, not memory |

---

## Reference Guide

| Need | Reference |
|------|-----------|
| Passkeys, account creation, Credential Exchange, `ASCredentialDataManager` | [authentication-services.md](references/authentication-services.md) |
| Geocoding, reverse geocoding, `MKAddress`, SwiftUI `Map` | [mapkit.md](references/mapkit.md) |
| `CKSyncEngine`, share access requests | [cloudkit.md](references/cloudkit.md) |
| Core Data stack, history, staged migrations, vs SwiftData | [core-data.md](references/core-data.md) |
| Tips, rules, groups, CloudKit sync of tips | [tipkit.md](references/tipkit.md) |
| Authorization, scheduling, delegate, interruption levels | [user-notifications.md](references/user-notifications.md) |
| `BGContinuedProcessingTask` | [background-tasks.md](references/background-tasks.md) |
| `MetricManager`, `StateReporter` | [metrickit.md](references/metrickit.md) |
| `DCAppAttestService` | [app-attest.md](references/app-attest.md) |
| Workout sessions on iOS, medications, zones, history permission | [healthkit.md](references/healthkit.md) |
| `CPMapPanel`, map template panels | [carplay.md](references/carplay.md) |
| `Chart3D`, `SurfacePlot` | [charts-3d.md](references/charts-3d.md) |

Related: SwiftData and `@Query` in [data-swiftdata.md](../swiftui-core/references/data-swiftdata.md); App Intents in [app-intents.md](../swiftui-core/references/app-intents.md); widgets and Live Activities HIG in [hig-system-surfaces.md](../swiftui-core/references/hig-system-surfaces.md); App Store privacy manifests in [privacy-manifest.md](../build-distribution/references/privacy-manifest.md).

---

## Best Practices

1. **Verify before writing** - Check the symbol on Apple's JSON page; read `introducedAt`, `deprecatedAt` and the `beta` flag
2. **Prefer async variants** - HealthKit, UserNotifications, App Attest, MapKit and CloudKit expose `async throws` forms of the callback methods
3. **Declare capabilities first** - Entitlement, Info.plist key or Associated Domains before the first call
4. **Gate by deployment target** - A 27.x symbol needs `#available`; the 27.3 items in these references are beta
5. **Never trust the client alone** - App Attest and passkey results are verified on your server
6. **Privacy by design** - Ask for the least data (HealthKit limited history, notification provisional authorization)
