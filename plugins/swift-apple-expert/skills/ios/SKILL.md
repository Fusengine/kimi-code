---
name: ios
description: Use when building iPhone apps — simulator/device testing, UI automation, or debugging — with XcodeBuildMCP tools.
---


<objective>
Covers iOS-specific development using XcodeBuildMCP automation tools: building and testing on the iOS Simulator, deploying to physical devices, scripted UI interactions (tap, swipe, screenshot, view-hierarchy snapshot), LLDB debugging, and integrating UIKit views inside SwiftUI.

Lists the concrete MCP tools available for each phase — simulator tools (build_sim, boot_sim, launch_app_sim, test_sim), device tools (build_device, install_app_device, list_devices), and UI automation primitives.

Best practices: build before every commit, iterate on the simulator first, always test on a real device before release, enable accessibility identifiers for UI automation, and validate against the oldest supported iOS version.
</objective>

# iOS Platform

iOS-specific development with XcodeBuildMCP automation tools.

## Agent Workflow (MANDATORY)

Before ANY implementation, spawn 3 agents in parallel, one `Agent` call each (single message):

1. **explore-codebase** - Analyze existing iOS patterns
2. **research-expert** - Verify latest iOS 27.2 docs via Context7/Exa
3. **mcp__XcodeBuildMCP__discover_projs** - Find Xcode projects

After implementation, run **sniper** for validation.

---

## Overview

### When to Use

- Building iPhone applications
- Testing on iOS Simulator
- Deploying to physical devices
- Automating UI interactions
- Debugging app behavior
- UIKit integration in SwiftUI

### Why iOS Skill

| Feature | Benefit |
|---------|---------|
| XcodeBuildMCP | Automated build and test |
| UI Automation | Scripted user interactions |
| Simulator tools | Fast iteration cycle |
| Device tools | Real hardware testing |

---

## MCP Tools Available

### Simulator Tools
- `build_sim` - Build for simulator
- `boot_sim` - Start simulator
- `launch_app_sim` - Run app
- `test_sim` - Execute tests

### Device Tools
- `build_device` - Build for device
- `install_app_device` - Deploy to device
- `list_devices` - Show connected devices

### UI Automation
- `tap`, `swipe` - Touch interactions
- `screenshot` - Capture screen
- `snapshot_ui` - Get view hierarchy

---

## Reference Guide

| Need | Reference |
|------|-----------|
| Simulator build/test | [simulator-tools.md](references/simulator-tools.md) |
| Device deployment | [device-tools.md](references/device-tools.md) |
| Touch automation | [ui-automation.md](references/ui-automation.md) |
| LLDB debugging | [debugging.md](references/debugging.md) |
| UIKit in SwiftUI | [uikit-integration.md](references/uikit-integration.md) |

---

## Best Practices

1. **Build validation** - Always build before commit
2. **Simulator first** - Faster iteration
3. **Device testing** - Required before release
4. **Accessibility IDs** - Enable UI automation
5. **Screenshots** - Document UI states
6. **Test on oldest supported** - iOS version compatibility (minimum deployment target, independent of the 27.2 SDK you build with)
7. **27 SDK launch rules** - UIKit apps must use the scene-based life cycle or they fail to launch; Info.plist needs a launch screen key; On Demand Resources is deprecated (Background Assets). Details: `swift-core/references/sdk-27-changes.md`
