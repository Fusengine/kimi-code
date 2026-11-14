---
name: graphics-games
description: Use when building GPU rendering or games on Apple platforms — Metal 4 (command model, ML command encoder, tensors), MetalFX upscaling and frame interpolation, GameKit activities and challenges, Game Controller input, Game Porting Toolkit 4 — or when choosing between Metal, RealityKit, SpriteKit and SceneKit.
---

<objective>
Covers the graphics and game surface of the Apple SDKs, verified against Apple's documentation JSON on 2026-11-13: the Metal 4 command model (MTL4CommandQueue, MTL4CommandBuffer, MTL4CommandAllocator, MTL4ArgumentTable, MTL4MachineLearningCommandEncoder, tensors), MetalFX (MTL4FXSpatialScaler, MTL4FXFrameInterpolator, MTL4FXTemporalDenoisedScaler), GameKit (GKGameActivity, GKChallengeDefinition, the deprecation of GKChallenge), Game Controller (GCController, GCControllerLiveInput, the 27.0 Home button settings manager), Game Porting Toolkit 4, the Apple Games app, and a decision table for Metal vs RealityKit vs SpriteKit vs SceneKit (deprecated 26.0).

Every symbol cites its JSON page and availability; symbols known only from a WWDC26 session are labelled as session claims. RealityKit and visionOS 3D content are not duplicated: the table links to the visionos references.
</objective>

# Graphics and Games

Metal, MetalFX, GameKit, Game Controller and porting for iOS, iPadOS, macOS, tvOS and visionOS.

## Agent Workflow (MANDATORY)

Before ANY implementation, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Find existing Metal, MetalFX, GameKit and GameController usage and which Metal family the renderer targets
2. **research-expert** - Re-verify every symbol on its Apple JSON page (`https://developer.apple.com/tutorials/data/documentation/<path>.json`); the apple-docs MCP search is unreliable, never conclude absence from it
3. **mcp__apple-docs__search_apple_docs** - Cross-check only; confirm availability on the JSON page

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Writing or porting a renderer, adding ML to the frame, upscaling or frame generation
- Adding Game Center activities, challenges, or Games app visibility
- Supporting game controllers, virtual controllers, spatial controllers
- Choosing between Metal, RealityKit, SpriteKit and SceneKit

### Why this skill

| Feature | Benefit |
|---------|---------|
| Verified availability per symbol | No Metal 4 or 27.x API used on a target that lacks it |
| SceneKit deprecation (26.0) | No new 3D work started on a deprecated framework |
| Session claims labelled | Session-only facts are never presented as API fact |

---

## Key Concepts

### Metal 4
New `MTL4*` command types, argument tables instead of per-encoder binding, and explicit barriers. Gate on `device.supportsFamily(.metal4)`.

### MetalFX
Descriptors create scalers and the interpolator; Metal 4 variants take an `MTL4Compiler`. Always check `supportsMetal4FX(_:)`.

### GameKit
`GKGameActivity` (26.0) and `GKChallengeDefinition` (26.0) are configured in the GameKit Configuration file; `GKChallenge` is deprecated since 26.0.

### Game Controller
Poll `GCControllerLiveInput` in the game loop; keep non-controller input paths playable.

---

## Reference Guide

| Need | Reference |
|------|-----------|
| Metal 4 command model, ML encoder, tensors, profiling | [metal4.md](references/metal4.md) |
| Spatial scaler, frame interpolator, denoised scaler | [metalfx.md](references/metalfx.md) |
| Game Center activities, challenges, Games app | [gamekit.md](references/gamekit.md) |
| GCController, virtual and spatial controllers, Home button settings | [game-controller.md](references/game-controller.md) |
| Metal vs RealityKit vs SpriteKit vs SceneKit, Game Porting Toolkit 4 | [engines-and-porting.md](references/engines-and-porting.md) |
| RealityKit entities and RealityKit 27 | [../visionos/references/realitykit.md](../visionos/references/realitykit.md), [../visionos/references/realitykit-27.md](../visionos/references/realitykit-27.md) |
| Foundation Models, Core AI language model | `apple-intelligence` skill |

---

## Best Practices

1. **Gate by capability** - `supportsFamily(.metal4)`, `supportsMetal4FX(_:)`, never by OS version alone
2. **One allocator per frame in flight** - reset it only after the GPU finished that frame
3. **Barriers are yours** - Metal 4 resources are untracked
4. **No new SceneKit code** - deprecated 26.0 on every platform
5. **Configure activities and challenges in Xcode** - not in code; use `GKGameActivity` and `GKChallengeDefinition`
6. **Keep a non-controller path** - keyboard, touch or `GCVirtualController` where the platform has it
7. **Label session claims** - cite session number and say symbols were not checked
