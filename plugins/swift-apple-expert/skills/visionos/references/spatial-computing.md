---
name: spatial-computing
description: visionOS spatial computing with windows, volumes, and immersive spaces
when-to-use: building Vision Pro apps, creating 3D windows, implementing immersive experiences
keywords: visionOS, spatial, WindowGroup, Volume, ImmersiveSpace, immersion
priority: high
related: realitykit.md, ornaments.md
---

# visionOS Spatial Computing

## When to Use

- Building Vision Pro applications
- Creating 3D spatial interfaces
- Immersive experiences
- Mixed reality features

## Key Concepts

### Scene Types

| Type | Dimension | Use Case |
|------|-----------|----------|
| WindowGroup | 2D | Standard app windows |
| Volume | 3D bounded | 3D content in defined space |
| ImmersiveSpace | 3D unbounded | Full environment takeover |

### WindowGroup
Standard 2D windows floating in space.

**Key Points:**
- Familiar SwiftUI windows
- Multiple windows supported
- User can position freely
- Good starting point

### Volume
Bounded 3D content container.

**Key Points:**
- Defined size in meters
- `.windowStyle(.volumetric)`
- 3D content visible from angles
- Sits in shared space

### ImmersiveSpace
Full immersive experience.

**Key Points:**
- Takes over environment
- `.immersionStyle()` options
- Only one active at a time
- Request via `openImmersiveSpace`

### Immersion Styles

| Style | Environment |
|-------|-------------|
| `.mixed` | See through, virtual overlaid |
| `.progressive` | Gradual immersion |
| `.full` | Complete virtual environment |

---

## Opening Spaces

```swift
@Environment(\.openImmersiveSpace) var openSpace
@Environment(\.dismissImmersiveSpace) var dismissSpace

// Open
await openSpace(id: "my-space")

// Dismiss
await dismissSpace()
```

---

## Shared vs Immersive

**Shared Space:**
- Multiple apps visible
- Windows and volumes
- User controls placement

**Immersive Space:**
- Single app controls
- Full environment
- Must be requested

---

## Look to Scroll

Source: HIG scroll-views > Look to Scroll (added 2026-03-24; read 2026-11-13).

- People scroll with their eyes by looking near the scroll view boundary (top/bottom, or sides). It does **not** work by default: add it per scroll view.
- Add it in reading and browsing views; skip it in views with UI controls or dense information needing quick, precise scrolling (Notes: yes in the note, no in the note list). Support it in all similar views for consistency.
- Prefer full-width or full-height scroll views for generous space and clear edges; if inset, provide clear boundaries. Parallax or scroll-driven animations can make it behave unexpectedly.
- API (visionOS 26.0): `ScrollInputKind.look` (axes chosen automatically) and `ScrollInputKind.look(axes:)`, used with `scrollInputBehavior(_:for:)` and `ScrollInputBehavior` `.automatic/.enabled/.disabled`.

```swift
ScrollView { ArticleBody() }
    .scrollInputBehavior(.enabled, for: .look)
```

---

## Best Practices

- ✅ Start with windows
- ✅ Use volumes for 3D previews
- ✅ Request immersive only when needed
- ✅ Provide exit from immersion
- ✅ Respect user's space
- ❌ Don't force full immersion
- ❌ Don't place content too close
- ❌ Don't ignore eye comfort
