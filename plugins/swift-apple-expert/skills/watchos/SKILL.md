---
name: watchos
description: Use when building Apple Watch apps — complications, workouts, HealthKit, or iPhone-Watch connectivity.
---


<objective>
Covers watchOS-specific development for Apple Watch: watch-face complications for glanceable data, workout sessions and fitness tracking, HealthKit access to health metrics, and Watch Connectivity for iPhone-Watch sync.

Includes design considerations specific to the platform — small display with large touch targets, glanceable information with minimal text, Digital Crown scrolling/input, swipe/tap gestures, and battery-conscious background work.

Best practices: keep information glanceable, use large tap targets, minimize text input, drive watch-face updates through complications, use efficient background refresh, and always validate on real hardware since the simulator behaves differently.
</objective>

# watchOS Platform

watchOS-specific development for Apple Watch experiences.

## Agent Workflow (MANDATORY)

Before ANY implementation, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Analyze existing watchOS patterns
2. **research-expert** - Verify latest watchOS 27.2 docs via Context7/Exa
3. **mcp__apple-docs__search_apple_docs** - Check watchOS patterns

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Building Apple Watch apps
- Creating watch face complications
- Workout and fitness tracking
- Health data access (HealthKit)
- iPhone-Watch communication

### Why watchOS Skill

| Feature | Benefit |
|---------|---------|
| Complications | Glanceable data on watch face |
| Workouts | Fitness and health tracking |
| HealthKit | Access health metrics |
| Connectivity | Sync with iPhone |

---

## Reference Guide

| Need | Reference |
|------|-----------|
| Watch face complications | [complications.md](references/complications.md) |
| Workout sessions, workout zones (27), HealthKit | [workouts.md](references/workouts.md) |
| iPhone ↔ Watch sync | [watch-connectivity.md](references/watch-connectivity.md) |
| Smart Stack widget sizes, accessory widgets, Live Activities on Watch | [hig-system-surfaces.md](../swiftui-core/references/hig-system-surfaces.md) |

---

## Vision on watchOS (27)

The Vision framework supports watchOS 27: `DetectLensSmudgeRequest` is introduced on watchOS 27.0 (iOS, iPadOS, macOS, tvOS, visionOS 26.0) and returns a `SmudgeObservation` with a `confidence` from 0.0 to 1.0 (https://developer.apple.com/documentation/vision/detectlenssmudgerequest, read 2026-11-13). Session 237 "What's new in image understanding" covers Vision on watchOS and the new tap-to-segment request: https://developer.apple.com/videos/play/wwdc2026/237/. HealthKit on iOS is covered by the `apple-frameworks` skill; workouts on the watch stay in [workouts.md](references/workouts.md).

---

## Liquid Glass on watchOS

API table and rules live in [liquid-glass.md](../swiftui-core/references/liquid-glass.md) (`glassEffect(_:in:)` is available on watchOS 26.0); do not duplicate them here. watchOS specifics (HIG, read 2026-11-13):

- Standard components adopt the system look automatically; the HIG materials page lists watchOS as a supported platform ([HIG materials](https://developer.apple.com/design/human-interface-guidelines/materials)). Full-screen modal views are common on Apple Watch: keep the material backgrounds the system gives modal sheets instead of removing or replacing them.
- Toolbars ([HIG toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), 2025-12-16): toolbar buttons go in the top corners or along the bottom (`ToolbarItemPlacement.topBarLeading`, `.topBarTrailing`, `.bottomBar`, all watchOS 10.0); above scrolling content they stay visible, and a button placed inside the scroll view stays hidden until the person scrolls up. Use for essential functionality closely related to the view.
- Scroll edge effects ([HIG scroll-views](https://developer.apple.com/design/human-interface-guidelines/scroll-views)): `scrollEdgeEffectStyle(_:for:)` is available on watchOS 26.0; keep `.automatic`.

---

## Design Considerations

### Screen Size
- Small display; controls 44x44 pt default, 28x28 pt minimum
- Text: 16 pt default, 12 pt minimum; support enlargement to at least 140%
- Glanceable information, minimal text, clear icons

Source: https://developer.apple.com/design/human-interface-guidelines/accessibility

### Interactions
- Digital Crown for scrolling/input ([HIG](https://developer.apple.com/design/human-interface-guidelines/digital-crown))
- Gestures: swipe, tap
- Complications and Smart Stack are WidgetKit accessory widgets (see `swiftui-core/references/hig-system-surfaces.md`)

### Battery
- Minimize background work
- Use complications for updates
- Efficient data transfer

---

## Best Practices

1. **Glanceable** - Quick information access
2. **Large targets** - Easy tapping
3. **Minimal input** - Reduce typing
4. **Complications** - Update watch face data
5. **Background refresh** - Efficient updates
6. **Test on device** - Simulator differs from hardware
7. **No new WKExtension code** - `WKExtension` / `WKExtensionDelegate` are deprecated for apps with a minimum deployment target of watchOS 9.2 or later (watchOS 27 release notes, https://developer.apple.com/documentation/watchos-release-notes/watchos-27-release-notes)
