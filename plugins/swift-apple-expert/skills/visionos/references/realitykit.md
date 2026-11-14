---
name: realitykit
description: RealityKit for visionOS with RealityView, 3D entities, gestures, and animations
when-to-use: rendering 3D content, adding models, implementing spatial gestures, animating entities
keywords: RealityKit, RealityView, Entity, ModelEntity, gesture, 3D, animation
priority: high
requires: spatial-computing.md
related: ornaments.md, realitykit-27.md
---

# RealityKit for visionOS

## When to Use

- Rendering 3D content
- Loading 3D models
- Spatial gestures (tap, drag, rotate)
- 3D animations
- Physics simulations

## Key Concepts

### RealityView
SwiftUI view for 3D content.

**Key Points:**
- Bridge between SwiftUI and RealityKit
- Create entities in closure
- Update on SwiftUI state change
- Supports attachments

### Entity
Base class for 3D objects.

**Types:**
- `ModelEntity` - Visible 3D models
- `AnchorEntity` - Spatial anchors
- `Entity` - Container/grouping

### ModelEntity
Visible 3D content with mesh and materials.

**Key Points:**
- `.generateBox/Sphere/Plane` for primitives
- Load .usdz models
- Apply materials
- Add physics

### Gestures
Spatial interaction with entities. Two paths:

**SwiftUI gestures targeted to entities** (view level):
- `TapGesture` - Point and tap
- `DragGesture` - Move in space
- `RotateGesture3D` - Rotate object
- `MagnifyGesture` - Scale object

**Entity-level components** (preferred for object handling):
- `ManipulationComponent` (visionOS 26.0 only) - system hand/trackpad manipulation: single-hand translate, hand rotation changes orientation, two-hand scale and rotate, hand handoff, system audio cues. The system edits the entity's transform directly; put your own transforms on a subentity or react to events.
- `GestureComponent` (iOS/iPadOS/macOS/tvOS/visionOS 26.0) - attaches a UI gesture to an entity.

Source: https://developer.apple.com/documentation/realitykit/manipulationcomponent and .../gesturecomponent (JSON read 2026-11-13).

### Animations
Entity movement and changes.

**Methods:**
- `Entity.animate(_:body:completion:)` - static, SwiftUI-style: `static func animate(_ animation: Animation, body: () -> Void, completion: (() -> Void)?)` (`@MainActor`, iOS/iPadOS/macOS/tvOS/visionOS 26.0+; source: https://developer.apple.com/documentation/realitykit/entity/animate(_:body:completion:), read 2026-11-13). Mutate entity properties inside `body` and they animate with the SwiftUI `Animation`.
- `Entity.move(to:relativeTo:duration:)` - older explicit transform animation, still available
- Component-based animation; skeletal graphs use `AnimationGraphComponent` (27, see [realitykit-27.md](realitykit-27.md))

---

## Loading Models

```swift
// From bundle
let entity = try await Entity(named: "model.usdz")

// Generate primitive
let sphere = ModelEntity(
    mesh: .generateSphere(radius: 0.1),
    materials: [SimpleMaterial(color: .blue, isMetallic: false)]
)
```

---

## Gestures on Entities

```swift
RealityView { content in
    // Add entities
}
.gesture(
    TapGesture()
        .targetedToAnyEntity()
        .onEnded { value in
            // value.entity is tapped entity
        }
)
```

---

## Manipulation and Animation Snippets

`ManipulationComponent.configureEntity(_:hoverEffect:allowedInputTypes:collisionShapes:)` is a static method that applies a default configuration so an entity works with the component (https://developer.apple.com/documentation/realitykit/manipulationcomponent/configureentity(_:hovereffect:allowedinputtypes:collisionshapes:), read 2026-11-13: parameters are `Entity`, `HoverEffectComponent?`, `InputTargetComponent.InputType?`, `[ShapeResource]?`). Manipulation lifecycle events on `ManipulationEvents`: `WillBegin`, `DidHandOff`, `DidUpdateTransform`, `WillRelease`, `WillEnd`. Set `audioConfiguration` to `.none` to replace system audio with your own.

```swift
// Animate a property change with a SwiftUI Animation (RealityKit 26.0+, main actor)
Entity.animate(.spring) {
    entity.position.y += 0.2
} completion: {
    // finished
}
```

---

## RealityKit beyond visionOS

RealityKit is not visionOS-only: the 27 components in [realitykit-27.md](realitykit-27.md) list iOS, iPadOS, macOS and tvOS availability per symbol.

---

## Best Practices

- ✅ Use .usdz for complex models
- ✅ Optimize polygon count
- ✅ Add collision for interaction
- ✅ Use gestures for manipulation
- ✅ Test on device
- ❌ Don't use huge models
- ❌ Don't forget accessibility
- ❌ Don't skip performance testing
