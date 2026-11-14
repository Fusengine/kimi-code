---
name: swiftui-core
description: Use when building SwiftUI views, navigation, persistence, or state management, or checking UI against Apple HIG (accessibility, RTL, sheets/alerts, widgets, Live Activities, iPhone Duo) — shared across iOS, macOS, watchOS, visionOS.
---


<objective>
Covers SwiftUI fundamentals shared across all Apple platforms: composable views and modifiers, navigation (NavigationStack for stack-based flows, NavigationSplitView for multi-column layouts), data persistence with SwiftData (@Model, replacing Core Data for most cases), state management (@State for local, @Observable for shared, @Environment for injection), Liquid Glass styling, and App Intents for Siri/Shortcuts integration.

References cover views/modifiers, navigation, SwiftData, state management, Liquid Glass across platforms, and App Intents in depth, plus Apple Human Interface Guidelines (HIG) rules with source URLs: accessibility (Dynamic Type to AX5, VoiceOver, contrast, hit targets, Reduce Motion/Transparency), right-to-left, modality/sheets/alerts/onboarding, system surfaces (widgets, Live Activities, notifications, App Shortcuts/Siri/snippets), and iPhone Duo.

Visual specs come from the design-ios handoff when one exists; this skill implements and verifies them. Best practices: extract subviews once a view body mixes responsibilities or stops reading at a glance, compose with ViewBuilder and modifiers, always include #Preview, use system colors (custom colors need light, dark and increased-contrast variants), label every icon-only control, and adapt layout by size class.
</objective>

# SwiftUI Core

SwiftUI fundamentals shared across all Apple platforms.

## Agent Workflow (MANDATORY)

Before ANY implementation, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Analyze existing SwiftUI patterns
2. **research-expert** - Verify latest SwiftUI docs via Context7/Exa
3. **mcp__apple-docs__search_apple_docs** - Check SwiftUI view patterns

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Building SwiftUI views and components
- Implementing navigation (NavigationStack, SplitView)
- Data persistence with SwiftData
- State management (@State, @Observable)
- Custom view modifiers and layouts

### Why SwiftUI Core

| Feature | Benefit |
|---------|---------|
| Declarative UI | Less code, automatic updates |
| Cross-platform | Same code for iOS/macOS/watchOS/visionOS |
| @Observable | Simple reactive state |
| SwiftData | Modern persistence with minimal code |

---

## Key Concepts

### Views & Modifiers
Composable UI building blocks. Extract subviews at 30+ lines.

### Navigation
NavigationStack for stack-based, NavigationSplitView for multi-column.

### SwiftData
Modern persistence with @Model. Replaces Core Data for most use cases.

### State Management
@State for local, @Observable for shared, @Environment for injection.

---

## Reference Guide

| Need | Reference |
|------|-----------|
| Views, modifiers, layouts | [views-modifiers.md](references/views-modifiers.md) |
| NavigationStack, deep linking | [navigation.md](references/navigation.md) |
| SwiftData, @Query, CloudKit, migrations | [data-swiftdata.md](references/data-swiftdata.md) |
| SwiftData 27: sectioned @Query, `codable`, ResultsObserver, HistoryObserver | [data-swiftdata-27.md](references/data-swiftdata-27.md) |
| WebView/WebPage, @Animatable, dragContainer, rich TextEditor, item alerts, status bar, TabsPickerStyle, 27.1 hinge toolbar | [swiftui-26-27-apis.md](references/swiftui-26-27-apis.md) |
| @State, @Observable, Environment | [state-management.md](references/state-management.md) |
| Liquid Glass all platforms | [liquid-glass.md](references/liquid-glass.md) |
| Siri, Shortcuts, App Intents, long-running/cancellable/snippet intents | [app-intents.md](references/app-intents.md) |
| WidgetKit push, controls, CarPlay/visionOS widgets, scheduled Live Activity | [widgetkit-activitykit.md](references/widgetkit-activitykit.md) |
| Toolbars (ToolbarSpacer, shared glass background), search as a tab, tab bar minimize, scroll edge effects, menu icons, SF Symbols 27 | [toolbars-navigation.md](references/toolbars-navigation.md) |

### HIG Rules (load for any UI task)

| Need | Reference |
|------|-----------|
| Dynamic Type AX5, VoiceOver, contrast, targets, Reduce Motion | [hig-accessibility.md](references/hig-accessibility.md) |
| Arabic/Hebrew mirroring, numerals | [hig-rtl.md](references/hig-rtl.md) |
| Sheets, alerts, modality, onboarding, launch, permissions | [hig-modality.md](references/hig-modality.md) |
| Widgets, Live Activities, notifications, App Shortcuts, Siri, snippets | [hig-system-surfaces.md](references/hig-system-surfaces.md) |
| iPhone Duo (foldable), reserved regions, vertical toolbars | [hig-iphone-duo.md](references/hig-iphone-duo.md) |

---

## Best Practices

1. **Small views** - Extract at 30+ lines
2. **Composition** - Use ViewBuilder and modifiers
3. **Preview-driven** - Always include #Preview
4. **System colors** - Custom colors ship light, dark and increased-contrast variants ([HIG color](https://developer.apple.com/design/human-interface-guidelines/color))
5. **Accessibility** - Label icon-only controls, layout survives AX5, targets >= 44 pt on iOS ([hig-accessibility.md](references/hig-accessibility.md))
6. **Platform adaptation** - Size classes, never fixed widths or device checks ([HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout))
7. **Verify the symbol on the complete reference** - check name, signature and availability on `https://developer.apple.com/tutorials/data/documentation/<framework>/<path>.json` (e.g. `swiftui/toolbarspacer.json`, lowercase path); HIG pages: `.../tutorials/data/design/human-interface-guidelines/<slug>.json`. Never conclude an API is absent from the apple-docs MCP search alone (it returned 0 results for the real `ToolbarSpacer`)
