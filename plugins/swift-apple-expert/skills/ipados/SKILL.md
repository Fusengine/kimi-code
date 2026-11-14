---
name: ipados
description: Use when building iPad apps — split views, external keyboard support, multitasking, or Stage Manager — adaptive layouts.
---


<objective>
Covers iPadOS-specific development for tablet and productivity experiences: adaptive layouts across size classes, split views, external keyboard shortcut support, multi-window applications, and Stage Manager / Slide Over multitasking.

Includes the three scene/interaction areas an iPad app typically needs: size-class-aware adaptive layouts, keyboard shortcuts (⌘ commands) for productivity users, and Stage Manager's desktop-like multitasking model.

Best practices: support both compact and regular size classes, add keyboard shortcuts, enable drag and drop, support pointer/trackpad input, allow multiple window instances, and handle external-display output via UIScreen.
</objective>

# iPadOS Platform

iPadOS-specific development for tablet and productivity experiences.

## Agent Workflow (MANDATORY)

Before ANY implementation, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Analyze existing iPad patterns
2. **research-expert** - Verify latest iPadOS 27.2 docs via Context7/Exa
3. **mcp__apple-docs__search_apple_docs** - Check iPad multitasking patterns

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Building iPad-optimized apps
- Implementing split views
- Supporting external keyboard
- Multi-window applications
- Stage Manager support
- Adaptive layouts

### Why iPadOS Skill

| Feature | Benefit |
|---------|---------|
| Split View | Side-by-side apps |
| Keyboard shortcuts | Productivity |
| Stage Manager | Desktop-like experience |
| Adaptive layouts | All iPad sizes |

---

## Reference Guide

| Need | Reference |
|------|-----------|
| Size classes, split views | [adaptive-layouts.md](references/adaptive-layouts.md) |
| External keyboard support | [keyboard-shortcuts.md](references/keyboard-shortcuts.md) |
| Slide Over, Stage Manager | [multitasking.md](references/multitasking.md) |
| Menu bar (`.commands`, `UIMainMenuSystem`, shortcuts), windowed iPadOS, new-window gestures, window size | [menu-bar-windows.md](references/menu-bar-windows.md) |
| iOS 27 SDK resizing rules (orientations, `UIRequiresFullScreen`, `UIScreen`) and iPhone Mirroring | [resizing-and-mirroring.md](references/resizing-and-mirroring.md) |
| Toolbars + tab bar coexisting, `ToolbarSpacer`, search tab, scroll edge effects | [toolbars-navigation.md](../swiftui-core/references/toolbars-navigation.md) |

---

## Liquid Glass on iPadOS

API table and rules live in [liquid-glass.md](../swiftui-core/references/liquid-glass.md); do not duplicate them here. iPadOS specifics (HIG, read 2026-11-13):

- Toolbar and tab bar can share the top of the view ([HIG toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), 2025-12-16); the tab bar can convert to a sidebar (`TabViewStyle.sidebarAdaptable`) per [HIG tab-bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) (2026-06-08). Use `NavigationSplitView` for a sidebar that must not convert.
- Sidebars float in the glass layer; extend content beneath with `backgroundExtensionEffect()` ([HIG sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars), 2026-06-08). Each split-view pane can have its own scroll edge effect; keep heights consistent ([HIG scroll-views](https://developer.apple.com/design/human-interface-guidelines/scroll-views)).
- macOS/iPadOS add the toolbar overflow menu automatically: never build one by hand. Standard bars and sheets get glass from the system ([HIG materials](https://developer.apple.com/design/human-interface-guidelines/materials)).

---

## Best Practices

1. **Size class adaptation** - Support compact and regular
2. **Keyboard shortcuts** - ⌘ shortcuts for productivity
3. **Drag and drop** - Enable data transfer
4. **Pointer support** - Mouse/trackpad cursors
5. **Multi-window** - Support multiple instances; adapt to any window size (full screen or windowed) and keep leading toolbar buttons clear of window controls
5b. **Menu bar** - Declare `.commands`; every command also reachable from the UI ([menu-bar-windows.md](references/menu-bar-windows.md))
6. **External display** - UIScreen support; with the 27 SDK non-interactive external scenes are no longer offered automatically: register `UISceneAccessory.externalNonInteractive` (UIKit) or use `.sceneAccessory` (SwiftUI). UIKit apps need the scene-based life cycle (`swift-core/references/sdk-27-changes.md`)
