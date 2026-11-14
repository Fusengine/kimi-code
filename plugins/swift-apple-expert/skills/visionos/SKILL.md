---
name: visionos
description: Use when building Vision Pro apps — spatial computing, RealityKit 3D content, immersive spaces, or volumes.
---


<objective>
Covers visionOS-specific development for Apple Vision Pro spatial computing: 3D spatial interaction, RealityKit-based 3D content rendering (RealityKit 27 components and Reality Composer Pro 3), immersive environments, mixed-reality features, the ARKit provider stack (hand tracking with permission, world tracking, accessory tracking), Spatial Preview, Foveated Streaming, the spatial web, and SharePlay.

Covers the three scene types available — WindowGroup (2D windows in space), Volume (3D bounded content), and ImmersiveSpace (full immersive experience) — with references on windows/volumes/spaces, RealityView/3D content, and ornament-based 2D UI attachments.

Gaze: visionOS does not give apps gaze data. Eye input is system-handled hover; apps learn only about the tap (HIG Eyes). Hand tracking is an ARKit provider that needs an ImmersiveSpace and the person's permission.

Best practices: start with familiar 2D windows before adding depth, introduce volumes gradually for 3D content, use ornaments to attach 2D UI to 3D scenes, respect the user's physical space rather than overwhelming it, use system hover and gestures first and ARKit hand tracking only when you need joints, and avoid rapid movements that cause eye discomfort.
</objective>

# visionOS Platform

visionOS-specific development for Apple Vision Pro spatial computing.

## Agent Workflow (MANDATORY)

Before ANY implementation, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Analyze existing visionOS patterns
2. **research-expert** - Verify latest visionOS 27.2 docs via Context7/Exa
3. **mcp__apple-docs__search_apple_docs** - Check spatial computing patterns

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Building Vision Pro applications
- Creating 3D spatial experiences
- Mixed reality features
- Immersive environments
- Hand tracking (ARKit, with permission) and system hover/gesture input
- Spatial accessories, Mac-to-Vision Pro preview, remote rendering, spatial web

### Why visionOS Skill

| Feature | Benefit |
|---------|---------|
| Spatial computing | 3D interaction |
| RealityKit | 3D content rendering |
| Immersive spaces | Full environment |
| Volumes | 3D bounded content |
| ARKit providers | Hands, world, accessories |

---

## Eyes and hands (read before designing input)

Source: HIG Eyes, https://developer.apple.com/design/human-interface-guidelines/eyes (JSON read 2026-11-13).

- Looking at an interactive element highlights it with a hover effect; the person then taps (indirect gesture). The HIG states: "To help preserve people's privacy, visionOS doesn't provide direct information about where people are looking before they tap." With system components visionOS tells you when the component is tapped.
- There is no eye-tracking API. Do not plan features that need gaze position.
- Hand tracking is `HandTrackingProvider` (ARKit, visionOS 1.0), run in an `ARKitSession` while your app presents a Full Space (on visionOS, ARKit data is unavailable otherwise). Add `NSHandsTrackingUsageDescription`; people can decline or revoke, so provide an alternative and handle lost access (https://developer.apple.com/documentation/visionos/setting-up-access-to-arkit-data, read 2026-11-13). Details: [arkit-spatial.md](references/arkit-spatial.md).

---

## Scene Types

| Scene | Description |
|-------|-------------|
| WindowGroup | 2D windows in space |
| Volume | 3D bounded content |
| ImmersiveSpace | Full immersive experience |

---

## Reference Guide

| Need | Reference |
|------|-----------|
| Windows, volumes, spaces | [spatial-computing.md](references/spatial-computing.md) |
| RealityView, 3D content, ManipulationComponent, Entity.animate | [realitykit.md](references/realitykit.md) |
| RealityKit 27 components, Reality Composer Pro 3 | [realitykit-27.md](references/realitykit-27.md) |
| ARKit providers, Spatial Preview, USDKit, Foveated Streaming, accessories, SharePlay, TabletopKit | [arkit-spatial.md](references/arkit-spatial.md) |
| HTML model element, immersive website environments | [spatial-web.md](references/spatial-web.md) |
| Attachments, UI ornaments | [ornaments.md](references/ornaments.md) |

---

## Best Practices

1. **Start with windows** - Familiar 2D first
2. **Add depth gradually** - Volumes for 3D
3. **Use ornaments** - Attach 2D UI to 3D
4. **Respect space** - Don't overwhelm user
5. **System input first** - Hover effects and gestures; ARKit hand tracking only for joint-level input, with a fallback
6. **Eye comfort** - Avoid rapid movements
7. **Symbols per platform** - RealityKit 27 types differ in availability (e.g. `ClothSimulationComponent` is not on macOS/tvOS); check each page ([realitykit-27.md](references/realitykit-27.md))
