---
name: arkit-spatial
description: visionOS ARKit provider stack, Spatial Preview, USDKit, Foveated Streaming, spatial accessories, SharePlay nearby and TabletopKit
when-to-use: reading hands or world data, tracking handheld accessories, previewing Mac content on Vision Pro, streaming remote-rendered scenes, multiplayer spatial games
keywords: ARKitSession, HandTrackingProvider, WorldTrackingProvider, AccessoryTrackingProvider, SharedCoordinateSpaceProvider, VisualFidelityProvider, FieldOfViewAnchor, SpatialPreview, USDKit, FoveatedStreaming, TabletopKit, groupActivityAssociation
priority: high
requires: spatial-computing.md
related: realitykit-27.md, spatial-web.md
---

# ARKit and the visionOS spatial stack

Every symbol below was read on its Apple documentation JSON page on 2026-11-13 (`https://developer.apple.com/tutorials/data/documentation/<framework>/<symbol>.json`, same content as `https://developer.apple.com/documentation/...`). Availability is the `introducedAt` value shown on that page.

## Overview

On visionOS, ARKit is a provider API: create one `ARKitSession`, run the data providers you need, read their anchor streams. Apps get no gaze data (HIG Eyes); hand and world sensing are gated by permission.

## ARKitSession and providers

`ARKitSession` is "the main entry point for receiving data from ARKit" (visionOS 1.0, macOS 26.0). Sessions need implicit or explicit authorization; people can decline or revoke later, so offer an alternative and handle lost access (https://developer.apple.com/documentation/visionos/setting-up-access-to-arkit-data).

| Provider / type | Purpose | Available | Permission |
|-----------------|---------|-----------|------------|
| `HandTrackingProvider` | Live hand and joint positions; anchors are `HandAnchor` | visionOS 1.0 | `NSHandsTrackingUsageDescription` |
| `WorldTrackingProvider` | Device pose and world anchors | visionOS 1.0, macOS 26.0 | none: world tracking, unlike world sensing, needs no authorization |
| image tracking, plane detection, scene reconstruction | world sensing | visionOS | `NSWorldSensingUsageDescription` |
| `AccessoryTrackingProvider` | Real-time position of accessories in the environment | visionOS 26.0 | - |
| `SharedCoordinateSpaceProvider` | Establish a shared coordinate space among multiple participants | visionOS 26.0 | - |
| `VisualFidelityProvider` | Delivers visual fidelity monitoring data | visionOS 27.0 | - |
| `FieldOfViewAnchor` | Field of view boundary polygon points in immersive space | visionOS 27.0 | - |
| `ARKitCoordinateSpaceProviding` (protocol) | Provides an ARKit coordinate space with an optional correction; `HandAnchor` conforms | macOS 27.0, visionOS 27.0 | n/a |
| `ReferenceObject.Configuration` | Configuration for an individual reference object (object tracking) | visionOS 27.0 | - |

`-` = permission key not read on the symbol page; check the page before shipping.

Rules:
- "ARKit data is available only when your app presents a Full Space and other apps are hidden": present the `ImmersiveSpace` first, then call `ARKitSession.run(_:)` (Apple's sample runs it in a `.task` on the space content and iterates `provider.anchorUpdates`).
- Authorization is implicit when you call `run(_:)`; call `ARKitSession.requestAuthorization(for:)` to control when the prompt appears.
- Design the declined/revoked path first: fade out or recenter dependent content, and keep a non-ARKit input route (trackpad, keyboard, accessibility input) for anything ARKit drives.
- Object tracking changes are described in session 283: https://developer.apple.com/videos/play/wwdc2026/283/ (new ways to track moving and handheld objects, new spatial accessory classes).

## Spatial accessories

"Generic spatial accessories" are purpose-built devices (medical instruments, steering rigs, industrial tooling) that ARKit tracks; they are distinct from spatial controllers and styli, which have dedicated APIs. ARKit keeps tracking orientation when the accessory leaves the field of view; GameController provides input and haptics. Sample code: https://developer.apple.com/documentation/visionos/working-with-generic-spatial-accessories (visionOS 27.0, Xcode 27.0). Manufacturers follow the Accessory Design Guidelines PDF linked from that page.

## Spatial Preview (macOS 27.0, visionOS 27.0)

Preview spatial content from a macOS app on a connected visionOS device in real time, with live syncing and bidirectional editing. `SpatialPreviewEndpoint` represents a visionOS device you can connect to (macOS 27.0; the page also lists visionOS, but the declaration is for macOS). Session 282: https://developer.apple.com/videos/play/wwdc2026/282/ (device discovery, 2D and 3D sessions, Quick Look additions).

## USDKit (27.0, all platforms)

"The Swift API for authoring, composing, and manipulating Universal Scene Description content" (iOS, iPadOS, Mac Catalyst, macOS, tvOS, visionOS 27.0). Session 285: https://developer.apple.com/videos/play/wwdc2026/285/ (USDKit, OpenUSD updates for accessibility, Gaussian splats, compressed geometry).

## Foveated Streaming (visionOS 26.4)

Session-based API to connect Apple Vision Pro to local and cloud streaming endpoints; the endpoint host streams high quality content only where necessary, based on information about the approximate region where the person is looking (framework overview, read 2026-11-13). Session 286 demonstrates an OpenXR scene with NVIDIA CloudXR: https://developer.apple.com/videos/play/wwdc2026/286/. Framework page: https://developer.apple.com/documentation/foveatedstreaming.

## SharePlay nearby

`View.groupActivityAssociation(_:)` (visionOS 26.0, module GroupActivities, takes `GroupActivityAssociationKind?`) specifies how a view associates with the current SharePlay group activity. `SharedCoordinateSpaceProvider` (above) establishes a shared coordinate space among multiple participants.

## TabletopKit (visionOS 2.0)

"Create multiplayer spatial games on a virtual table surface and use FaceTime to invite players": game design, rules, rendering effects and multiplayer state sync over SharePlay (https://developer.apple.com/documentation/tabletopkit).

## visionOS 27 overview

Session 287 "Build next-generation experiences with visionOS 27" is the umbrella session linked from session 393: https://developer.apple.com/videos/play/wwdc2026/287/ (title read, content not summarized here).

## Best Practices

- ✅ Ask for the narrowest ARKit data you need and explain it in the usage description
- ✅ Keep a non-ARKit fallback (gestures, hover) for declined permission
- ✅ Read each symbol page for its platform; several 27 types are visionOS-only
- ❌ Don't promise gaze-based features: visionOS exposes no gaze position
- ❌ Don't call `run(_:)` before a Full Space is presented
