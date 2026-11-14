---
name: macos
description: Use when building Mac apps — menu bar extras, window management, AppKit integration, or notarized distribution outside the App Store.
---


<objective>
Covers macOS-specific development: menu bar apps via MenuBarExtra, multi-window application management, keyboard shortcuts and menus, AppKit integration (NSViewRepresentable) inside SwiftUI, and notarization for distribution outside the Mac App Store.

Lists the XcodeBuildMCP tools for macOS builds (build_macos, build_run_macos, test_macos, launch_mac_app, stop_mac_app) and references for app structure (MenuBarExtra, Settings, Windows), build tooling, AppKit bridging, and code-signing/notarization.

Best practices: support keyboard shortcuts for power users, use MenuBarExtra for utility apps, use WindowGroup/Window for multi-window apps and Settings for the preferences scene, notarize before distributing outside the App Store, and enable sandboxing for App Store submissions.
</objective>

# macOS Platform

macOS-specific development with window management and distribution tools.

## Agent Workflow (MANDATORY)

Before ANY implementation, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Analyze existing macOS patterns
2. **research-expert** - Verify latest macOS 27.2 docs via Context7/Exa
3. **mcp__XcodeBuildMCP__build_macos** - Build for macOS validation

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Building Mac desktop applications
- Creating menu bar apps (MenuBarExtra)
- Multi-window applications
- Keyboard shortcuts and menus
- Notarization for distribution
- AppKit integration

### Why macOS Skill

| Feature | Benefit |
|---------|---------|
| MenuBarExtra | Background utility apps |
| Window management | Multi-window support |
| Keyboard shortcuts | Power user productivity |
| Notarization | Gatekeeper-safe distribution |

---

## MCP Tools Available

### Build Tools
- `build_macos` - Build for macOS
- `build_run_macos` - Build and launch
- `test_macos` - Run macOS tests
- `launch_mac_app` - Start built app
- `stop_mac_app` - Terminate app

---

## Reference Guide

| Need | Reference |
|------|-----------|
| MenuBarExtra, Settings, Windows | [app-structure.md](references/app-structure.md) |
| XcodeBuildMCP macOS tools | [build-tools.md](references/build-tools.md) |
| NSViewRepresentable, menus (native `Map` / `WebView` first) | [appkit-integration.md](references/appkit-integration.md) |
| AppKit 26-27: Observable tracking, `NSRefreshController`, `NSControl.Events`, tab-role segmented control, `NSTextSelectionManager`, menu images | [appkit-27.md](references/appkit-27.md) |
| App Attest, notifications, CloudKit, MapKit and other app frameworks on Mac | [apple-frameworks](../apple-frameworks/SKILL.md) |
| Code signing, notarization | [notarization.md](references/notarization.md) |
| Touch on Mac (touch display, Sidecar), gesture recognizers, hidden controls | [touch-input.md](references/touch-input.md) |
| Toolbars (`ToolbarSpacer`, shared glass background), scroll edge effects, menu item icons | [toolbars-navigation.md](../swiftui-core/references/toolbars-navigation.md) |

---

## Liquid Glass on macOS

API table and rules live in [liquid-glass.md](../swiftui-core/references/liquid-glass.md); do not duplicate them here. macOS specifics (HIG, read 2026-11-13):

- Toolbars, sidebars and tab-style controls float in the glass layer; standard components adopt it automatically ([HIG toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars), updated 2025-12-16). Toolbar items have no bezel on macOS; people can customize or hide the toolbar, so it is never the only home of a command.
- Sidebars ([HIG sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars), 2026-06-08): let content extend beneath (`backgroundExtensionEffect()`); sidebar icons follow the system accent color; offer Show/Hide Sidebar in the View menu.
- Materials ([HIG materials](https://developer.apple.com/design/human-interface-guidelines/materials)): macOS keeps `NSVisualEffectView` materials with vibrancy and two blend modes (behind window, within window) for the content layer; glass is for controls and navigation only.

---

## Best Practices

1. **Keyboard shortcuts** - Support power users
2. **Menu bar integration** - For utility apps
3. **Multiple windows** - Use WindowGroup/Window
4. **Settings window** - Use Settings scene
5. **Notarization** - Required for distribution
6. **Sandbox** - Enable for App Store
7. **Touch is secondary** - Macs with a touch display and Sidecar iPads send touch: use standard controls and gesture recognizers, enlarge tap targets not controls, give hover-only controls a touch path ([touch-input.md](references/touch-input.md); HIG 2026-10-28)
