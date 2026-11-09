---
name: visionos
description: Use when building Vision Pro apps — spatial computing, RealityKit 3D content, immersive spaces, or volumes.
---


<objective>
Covers visionOS-specific development for Apple Vision Pro spatial computing: 3D spatial interaction, RealityKit-based 3D content rendering, immersive environments, mixed-reality features, and hand/eye tracking.

Covers the three scene types available — WindowGroup (2D windows in space), Volume (3D bounded content), and ImmersiveSpace (full immersive experience) — with references on windows/volumes/spaces, RealityView/3D content, and ornament-based 2D UI attachments.

Best practices: start with familiar 2D windows before adding depth, introduce volumes gradually for 3D content, use ornaments to attach 2D UI to 3D scenes, respect the user's physical space rather than overwhelming it, design for natural hand tracking, and avoid rapid movements that cause eye discomfort.
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
- Hand and eye tracking

### Why visionOS Skill

| Feature | Benefit |
|---------|---------|
| Spatial computing | 3D interaction |
| RealityKit | 3D content rendering |
| Immersive spaces | Full environment |
| Volumes | 3D bounded content |

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
| RealityView, 3D content | [realitykit.md](references/realitykit.md) |
| Attachments, UI ornaments | [ornaments.md](references/ornaments.md) |

---

## Best Practices

1. **Start with windows** - Familiar 2D first
2. **Add depth gradually** - Volumes for 3D
3. **Use ornaments** - Attach 2D UI to 3D
4. **Respect space** - Don't overwhelm user
5. **Hand tracking** - Natural interactions
6. **Eye comfort** - Avoid rapid movements
