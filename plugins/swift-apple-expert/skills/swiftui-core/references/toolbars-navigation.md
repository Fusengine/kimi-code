---
name: toolbars-navigation
description: Liquid Glass toolbars, ToolbarSpacer, sharedBackgroundVisibility, search as a tab, tab bar minimize, scroll edge effects, menu item icons and SF Symbols 27 symbol APIs
when-to-use: building or reviewing toolbars, navigation bars, tab bars, sidebars, search placement, menu icons or symbol animations on iOS/iPadOS/macOS 26+
keywords: ToolbarSpacer, sharedBackgroundVisibility, DefaultToolbarItem, searchToolbarBehavior, Tab role search, tabBarMinimizeBehavior, scrollEdgeEffectStyle, backgroundExtensionEffect, menu icons, SF Symbols 27, SF Symbols 8 beta, drawOn
priority: high
related: liquid-glass.md, navigation.md, views-modifiers.md, hig-modality.md
---

# Toolbars, Tab Bars, Search and Symbols (Liquid Glass era)

Complements `liquid-glass.md` (glass rules) and `navigation.md` (stacks, split views). Every symbol below was read on its `developer.apple.com/tutorials/data/documentation/...json` page on 2026-11-13; HIG rules come from `developer.apple.com/tutorials/data/design/human-interface-guidelines/<slug>.json` (same date). Per `swiftui-core/SKILL.md`: verify any other symbol the same way; never conclude an API is absent from the apple-docs MCP search alone.

## Toolbars (HIG toolbars, updated 2025-12-16 for Liquid Glass)

- Three content types: title, navigation controls (back, search), actions. Positions: leading (not customizable), center (customizable, collapses to overflow), trailing (always visible: inspector buttons, search, More menu, primary action).
- Do not add an overflow menu by hand (macOS/iPadOS add it); aim for at most three groups; prefer SF Symbols over text (except Done-like actions); one primary action, trailing, tinted.
- Do not paint custom bar backgrounds: they fight the system background effect. Let the content layer set the color; use a scroll edge effect to separate bar from content.
- Separate adjacent text-labeled buttons with fixed space so labels do not read as one action.

| API (availability read 2026-11-13) | Use |
|---|---|
| `ToolbarSpacer(_ sizing: SpacerSizing = .flexible, placement: ToolbarItemPlacement = .automatic)` iOS/iPadOS/macOS 26.0; `SpacerSizing` cases `.fixed`, `.flexible` | Visual break between glass groups; flexible pushes items apart. Customizable via `.toolbar(id:)` |
| `ToolbarContent.sharedBackgroundVisibility(_ visibility: Visibility)` iOS/iPadOS/macOS 26.0 | Items in a bar share one glass background; `.hidden` puts the item in its own grouping (e.g. a status item in `.principal`) |
| `DefaultToolbarItem(kind:placement:)` 26.0; `ToolbarDefaultItemKind` (17.0; macOS 14.0) `.sidebarToggle` (17.0), `.title` (iOS/iPadOS 18.0, macOS 15.0), `.search` (26.0) | Position a system component (search field, sidebar toggle) explicitly |
| `ToolbarItemPlacement.primaryAction` | Primary action slot |

```swift
.toolbar(id: "main") {
    ToolbarItem(id: "share") { ShareButton() }
    ToolbarSpacer(.fixed)
    ToolbarItem(id: "more") { MoreButton() }
    ToolbarItem(id: "status", placement: .principal) { BuildStatus() }
        .sharedBackgroundVisibility(.hidden)
}
```

Existing toolbar APIs (`visibilityPriority`, `ToolbarOverflowMenu`, `topBarPinnedTrailing`, `toolbarMinimizationBehavior`) are listed in `views-modifiers.md`.

## Tab bars and search (HIG tab-bars, search-fields, 2026-06-08)

- Tab bar = sections of the app; toolbar = actions on the current view. Do not hide the tab bar except under a modal. Single-word labels; filled symbols; badges only for critical info; few tabs (extra tabs fall into More).
- iPadOS: the tab bar sits near the top and can convert to a sidebar (`TabViewStyle.sidebarAdaptable`, iOS/iPadOS 18.0). Use `NavigationSplitView` when a sidebar must not convert. Default tab list of five or fewer if people can customize.
- iOS 26: `tabBarMinimizeBehavior(_:)` with `TabBarMinimizeBehavior` `.automatic/.never/.onScrollDown/.onScrollUp`, and `tabViewBottomAccessory(content:)` (iOS/iPadOS 26.0) for a MiniPlayer-style accessory.
- **Search as a tab**: `TabRole.search` (`Tab(role: .search)`, iOS 18.0) marks the search tab; the HIG names two styles: standard tab (landing page with suggestions) and button appearance (focuses the field and shows the keyboard, returns to the previous tab on exit). Alternatives: search in a bottom or top toolbar, or an inline field next to the content it filters. Search field behavior in a toolbar: `searchToolbarBehavior(_:)` with `SearchToolbarBehavior` `.automatic`, `.minimize` (26.0).

## Scroll edge effects and sidebars

- `scrollEdgeEffectStyle(_ style: ScrollEdgeEffectStyle?, for edges: Edge.Set)` (26.0; not visionOS): `.automatic` (default, most opaque separation for dense bars and pinned headers), `.hard`, `.soft` (test legibility). Effects are not decoration; keep split-view panes consistent in height.
- `backgroundExtensionEffect()` (26.0): mirrors adjacent content under a floating sidebar or inspector. HIG sidebars (2026-06-08): sidebar icons use the accent color by default; a few fixed colors are acceptable when sparing; hide/show by edge swipe (iPadOS) or View menu commands (macOS).

## Menu item icons (HIG menus, updated 2026-06-08)

- Icons help people find items; use standard symbols for common actions (Share, Print, Search); no icon when none clearly represents the item.
- Within a group, give icons to all items or none. In SwiftUI use `Label("Rename", systemImage: "pencil")` inside `Button` in `Menu`, `contextMenu`, or `CommandMenu`.
- iOS/iPadOS menus can show a top row: small layout = 4 symbol-only items (only for closely related actions: Bold, Italic, Underline, Strikethrough); medium layout = 3 items, symbol above a short label (three important actions, e.g. Notes: Scan, Lock, Pin). visionOS supports only the small and large layouts.

## SF Symbols 27 (announced at WWDC26 as "SF Symbols 8 beta", read 2026-11-14)

Sources: https://developer.apple.com/sf-symbols/ (New Symbols for iOS/iPadOS/macOS/watchOS/tvOS/visionOS 27; Enhanced Search; Draw, Annotation, Variable Rendering, gradients), https://developer.apple.com/design/resources/ ("Download SF Symbols 27"), https://developer.apple.com/design/whats-new/ ("SF Symbols 8 beta", 2026-06-08). The HIG sf-symbols page (alert 2025-07-28) still documents SF Symbols 7 features; symbols and features are unavailable on older OS versions, so gate by deployment target.

| API | Notes |
|---|---|
| `.symbolEffect(.drawOn)` / `.drawOff` (`DrawOnSymbolEffect`, `DrawOffSymbolEffect`) | 26.0 all platforms; whole symbol, by layer or individually; custom symbols need Draw annotation in the SF Symbols app |
| `symbolVariableValueMode(_:)` with `SymbolVariableValueMode` `.color`, `.draw` | 26.0 all platforms; Variable Color vs Variable Draw rendering |
| Magic Replace | default `.replace` between related symbols |

Respect Reduce Motion for symbol animations (`hig-accessibility.md`).
