---
name: realitykit-27
description: RealityKit 27 components (navigation mesh, cloth, behavior tree, animation graph, compute graph, Gaussian splat) and Reality Composer Pro 3
when-to-use: adding pathfinding, cloth, AI behavior, skeletal animation graphs, GPU particles or Gaussian splats; authoring with Reality Composer Pro 3
keywords: RealityKit, NavigationMeshComponent, ClothSimulationComponent, BehaviorTreeComponent, AnimationGraphComponent, ComputeGraphComponent, GaussianSplatComponent, Reality Composer Pro, ScriptGraph
priority: high
requires: realitykit.md
related: arkit-spatial.md
---

# RealityKit 27 and Reality Composer Pro 3

All symbol facts below were read on 2026-11-13 from the Apple documentation JSON (`https://developer.apple.com/tutorials/data/documentation/realitykit/<symbol>.json`, same content as `https://developer.apple.com/documentation/realitykit/<symbol>`). The 27 components are not visionOS-only; availability differs per symbol, so check the page before using one on another platform.

## Overview

RealityKit 27 adds component-based systems for pathfinding, cloth, behavior trees, animation graphs, GPU compute graphs and Gaussian splat rendering. Reality Composer Pro 3 authors most of them visually and can be extended with project plugins.

## Components (all introduced in 27.0)

| Component | What Apple says it does | Platforms (27.0) |
|-----------|--------------------------|------------------|
| `NavigationMeshComponent` | Provides the navigation meshes an entity uses to find paths through a scene | iOS, iPadOS, Mac Catalyst, macOS, tvOS, visionOS |
| `ClothSimulationComponent` | Marks an entity as the simulation root of a localized cloth simulation; each entity belongs to at most one cloth simulation (the closest ancestor) | iOS, iPadOS, visionOS (declaration also lists Mac Catalyst); not macOS, not tvOS |
| `BehaviorTreeComponent` | Manages which behavior tree is active for the entity | iOS, iPadOS, Mac Catalyst, macOS, tvOS, visionOS |
| `AnimationGraphComponent` | Drives skeletal animation on an entity using an animation graph | iOS, iPadOS, Mac Catalyst, macOS, tvOS, visionOS |
| `ComputeGraphComponent` | Drives a compute graph-based particle simulation on an entity | iOS, iPadOS, macOS, tvOS, visionOS |
| `GaussianSplatComponent` | Renders 3D Gaussian splat data | iOS, iPadOS, Mac Catalyst, macOS, visionOS; not tvOS |

Add each like any RealityKit component (`entity.components.set(...)`). Configure the data they consume (navigation mesh, cloth setup, trees, graphs, splat data) in Reality Composer Pro 3 or with the types referenced on each symbol page; do not invent initializers, open the page.

Gaussian splat guidance (https://developer.apple.com/documentation/realitykit/gaussian-splat-rendering-guidelines, read 2026-11-13): splat data can be very large and needs alpha blending, so rendering is costly and can overheat the device. Monitor the device thermal state and reduce rendering load in response: per review of the page, the system throttles to protect frame rate but does not automatically limit splat rendering on thermal state, so that is the app's job.

## Reality Composer Pro 3

Sessions (WWDC26, titles read on each page 2026-11-13):

| Session | Topic | URL |
|---------|-------|-----|
| 252 | Design no-code games with Reality Composer Pro 3: ScriptGraph visual nodes for animation, interaction, SwiftUI elements such as speech bubbles | https://developer.apple.com/videos/play/wwdc2026/252/ |
| 279 | Advances in RealityKit: interactive cloth, NavMesh pathfinding, mixed reality lighting, customizable reverb meshes, improved shadows, character rendering, Gaussian splats | https://developer.apple.com/videos/play/wwdc2026/279/ |
| 280 | Iterate faster: add content, effects, lighting and interactivity inside the editor, AI-assisted features | https://developer.apple.com/videos/play/wwdc2026/280/ |
| 281 | Extend Reality Composer Pro 3 with Xcode: project-specific plugins that edit custom components, run custom systems, build your own ScriptGraph nodes | https://developer.apple.com/videos/play/wwdc2026/281/ |
| 393 | Graph tools: Shader Graph materials, Animation Graph skeletal blending, Compute Graph particles, Script Graph interactivity | https://developer.apple.com/videos/play/wwdc2026/393/ |

Chapters and descriptions read on the session pages: session 280 covers entities and components, prototypes and instances, live preview, lightmaps and the Reality Composer Pro Assistant; session 393 covers Animation Graph, Behavior Tree, Script Graph, Navigation Mesh, Compute Graph, Shader Graph enhancements, and coordinating scene events with Sequencer. Mapping by name: Animation Graph ↔ `AnimationGraphComponent`, Behavior Tree ↔ `BehaviorTreeComponent`, Navigation Mesh ↔ `NavigationMeshComponent`, Compute Graph ↔ `ComputeGraphComponent`. The tool-to-runtime link is inferred from names; the session pages do not state symbol names in what was read.

## Best Practices

- ✅ Check the symbol page for the target platform before using a 27 component outside visionOS
- ✅ Author graphs in Reality Composer Pro 3, keep runtime Swift for wiring and state
- ✅ Put custom components and systems in a project plugin so Reality Composer Pro can edit them
- ❌ Don't assume cloth or Gaussian splats exist on every RealityKit platform
- ❌ Don't write initializer calls you have not read on the symbol page
