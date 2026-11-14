---
name: xcodebuild-mcp
description: XcodeBuildMCP for Xcode project discovery, building, testing, running on simulators, and workflow configuration
when-to-use: building projects, validating code changes, running tests, launching on simulator, enabling extra workflows
keywords: Xcode, build, build_run_sim, test_sim, scheme, simulator, session defaults, workflows, clean
priority: high
related: xcodebuild-mcp-ui-verification.md, apple-docs-mcp.md, xcode-agents.md
---

# XcodeBuildMCP Usage Guide

Source: https://www.xcodebuildmcp.com (npm `xcodebuildmcp`, repository getsentry/XcodeBuildMCP).
Tool names below were read from the `xcodebuildmcp@2.7.0` package manifests.

## Installation

```json
{
  "mcpServers": {
    "XcodeBuildMCP": { "command": "npx", "args": ["-y", "xcodebuildmcp@latest"] }
  }
}
```

Homebrew alternative: `brew tap getsentry/xcodebuildmcp && brew install xcodebuildmcp`. Tool minimum (README read 2026-11-13): macOS 14.5+, Xcode 16.x or later, Node.js 18+ (npm install only) - this plugin targets Xcode 27.2 and the 27.2 SDKs, well above that floor, so no extra setup is needed for them.

Rename notice: the `getsentry/XcodeBuildMCP` README (2026-11-13) now presents the project as **MobileBuildMCP** (npm package `mobilebuildmcp`, CLI `mobilebuildmcp`; `npx -y mobilebuildmcp@latest mcp`). npm registry on 2026-11-13: `mobilebuildmcp` 2.7.1 (published 2026-09-23), `xcodebuildmcp` 2.7.0 (2026-07-23, not deprecated). The `xcodebuildmcp` config above still works; check `npm view mobilebuildmcp version` before pinning.

## Workflows

Tools are grouped in workflows. Only **simulator** and **session-management** are enabled by default. Enable more with the `XCODEBUILDMCP_ENABLED_WORKFLOWS` env var (comma-separated) or `enabledWorkflows` in `.xcodebuildmcp/config.yaml` (see https://xcodebuildmcp.com/docs/configuration).

| Workflow | Key tools |
|----------|-----------|
| `simulator` (default) | `list_sims`, `boot_sim`, `open_sim`, `build_sim`, `build_run_sim`, `test_sim`, `install_app_sim`, `launch_app_sim`, `stop_app_sim`, `screenshot`, `snapshot_ui`, `record_sim_video`, `clean`, `discover_projs`, `list_schemes`, `show_build_settings` |
| `simulator-management` | `set_sim_appearance`, `sim_statusbar`, `set_sim_location`, `erase_sims` |
| `ui-automation` | `snapshot_ui`, `wait_for_ui`, `tap`, `batch`, `long_press`, `swipe`, `gesture`, `type_text`, `button`, `key_press`, `screenshot` |
| `session-management` (default) | `session_show_defaults`, `session_set_defaults`, `session_clear_defaults`, `session_use_defaults_profile` |
| `device`, `macos`, `debugging`, `swift-package`, `project-scaffolding`, `coverage` | build/run on device or Mac, LLDB, SwiftPM, scaffold, coverage |

## Run Flow (Simulator)

1. `session_show_defaults` before the first build/run/test of a session - confirm project/workspace, scheme, simulator.
2. Missing project? `discover_projs`, then `session_set_defaults`.
3. `build_run_sim` (build + install + launch, boots the simulator) - preferred single step.
4. `test_sim` for the test suite.
5. `launch_app_sim` with `args` to relaunch with launch arguments (e.g. RTL testing).

## Build Validation Loop

```text
After every code change:
1. build_sim (or build_run_sim)
2. Errors -> read them, fix, rebuild
3. test_sim when tests exist
4. UI change -> HIG verification (xcodebuild-mcp-ui-verification.md)
5. Done only with zero errors
```

## Troubleshooting

| Symptom | Action |
|---------|--------|
| "Scheme not found" | `list_schemes`; check workspace vs project in session defaults |
| Strange errors after branch switch / new dependency | `clean`, then rebuild |
| Tool missing (e.g. `tap`, `set_sim_appearance`) | Its workflow is not enabled - see Workflows |
| Need build flags / deployment target | `show_build_settings` |

## Resources

- Website/docs: https://www.xcodebuildmcp.com
- npm: https://www.npmjs.com/package/xcodebuildmcp (2.7.0 at time of writing)
