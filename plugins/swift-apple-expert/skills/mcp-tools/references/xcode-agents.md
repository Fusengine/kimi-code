---
name: xcode-agents
description: Xcode 27 coding intelligence and Xcode's own MCP server - plan mode, plug-ins (skills, MCP servers, ACP), xcrun mcpbridge, xcrun mcp-server, lldb-mcp, RenderPreview
when-to-use: connecting Kimi Code or another external agent to Xcode, configuring agents inside Xcode, deciding between Xcode's MCP tools and XcodeBuildMCP, rendering SwiftUI previews from an agent
keywords: Xcode 27, coding intelligence, plan mode, ACP, Agent Client Protocol, mcpbridge, mcp-server, lldb-mcp, RenderPreview, plug-ins, skills, Copilot, Gemini
priority: high
related: xcodebuild-mcp.md, xcodebuild-mcp-ui-verification.md, ../../swift-core/references/sdk-27-changes.md
---

# Xcode 27 Agents and Xcode's MCP Server

Xcode 27 has its own coding intelligence (agents inside Xcode) and its own MCP server (for agents running outside Xcode). Both are independent of XcodeBuildMCP, which stays the default build/test/UI-evidence tool in this plugin.

Sources (read 2026-11-13):
- Xcode 27, 27.2, 27.3 release notes: https://developer.apple.com/documentation/xcode-release-notes/xcode-27-release-notes (and `-27_2-`, `-27_3-`)
- https://developer.apple.com/documentation/xcode/giving-external-agents-access-to-xcode
- https://developer.apple.com/documentation/xcode/extending-and-customizing-agents
- https://developer.apple.com/documentation/xcode/setting-up-coding-intelligence

## Connect an external agent (Kimi Code) to Xcode

1. Xcode > Settings > Intelligence > Model Context Protocol > "Allow External Agents to Use Xcode Tools": **Always** or **While Xcode is Open** (**Never** turns it off).
2. Register the bridge (Apple documents `xcrun mcpbridge`). Kimi has no `mcp` subcommand: add an `xcode` server to `$KIMI_CODE_HOME/mcp.json` (default `~/.kimi-code/mcp.json`), merging it into the existing `mcpServers` object, then start a new session:

```json
{
  "mcpServers": {
    "xcode": { "command": "xcrun", "args": ["mcpbridge"] }
  }
}
```

Codex: `codex mcp add xcode -- xcrun mcpbridge`.
3. Open the project in Xcode **before** prompting the agent; Xcode alerts when an external agent connects and is active.
4. Optional: put hints about Xcode and the project in `AGENTS.md` / `CLAUDE.md`.

## Workspace-less MCP server (preview)

Xcode 27 beta 5 added a preview MCP server experience that runs **without an open Xcode workspace** and lets you grant code-signed agents access to a directory tree for extended periods:

```bash
sudo xcrun mcp-server enable
xcrun mcp-server status
sudo xcrun mcp-server enable --unsafe-always-allow-all-agents   # unattended environments only
```

`--unsafe-always-allow-all-agents` approves all permissions upfront; Apple says it is not recommended for at-desk use. Early preview: some `xcrun mcp-server` behavior may not work in every configuration, and settings or permissions may need an Xcode relaunch or a reboot (release note 181836944). Treat as beta; keep `xcrun mcpbridge` as the documented path.

## What Xcode's MCP tools cover (Xcode 27 release notes)

| Area | Tools |
|------|-------|
| Build and test | Build and test tools; activity status is sent dynamically to external clients (181078347) |
| Debugging | Manipulate the active run state, read and use the debugger console |
| Project | List and switch schemes and run destinations; inspect and modify build settings, compiler flags, entitlements, `Info.plist` keys |
| Simulator | Boot simulators, install and launch apps, synthesize touch events, capture screenshots (175179787); agents can also verify watchOS (Digital Crown, side and Action buttons) and tvOS (Siri Remote focus, select, Home, text entry) apps |
| Localization | Read, plan and edit translations in String Catalog files (176376425) |
| Insights | Project insights: crashes, disk writes, energy, hangs, launch issues (177568662) |
| Previews | **RenderPreview** (called "Preview Snapshot" in the first release note): variants (light/dark, orientation, type size overrides), timelines for widgets, toggle states for Live Activities; returns platform, device type and OS of the rendering simulator; supports preview groups, returns display name and line number; 27.2 returns the available render destinations and accepts one; 27.3 beta adds applied overrides to snapshot filenames and metadata, and interactive delayed snapshots for macOS previews |

**lldb-mcp**: "LLDB now ships with an MCP server (lldb-mcp). See mcp.html for examples" (Xcode 27 release notes, Debugging, 176901842). Read that page in the LLDB documentation before wiring it; this skill does not restate its flags.

Other LLDB additions in 27: `language swift task tree` (prints all Swift tasks the debugger knows), explicit-module import from DerivedData for bridging-header projects, inspection of `~Copyable` fields.

## Agents inside Xcode

- **Providers**: Claude Sonnet & Opus and ChatGPT (sign in under Intelligence settings), Google Gemini (27.0), Google Antigravity (27.0), GitHub Copilot (**27.3 beta**), any provider with a Chat Completions API (`/v1/models`, `/v1/chat/completions`), and any agent that speaks the **Agent Client Protocol (ACP)** (Add an Agent).
- **Plan mode**: a prompt that asks to plan enters plan mode automatically; invoke explicitly with `/plan`, leave with `/exit` then `/exit-plan`. Plans are editable Markdown artifacts beside the conversation to review, annotate and approve before the agent proceeds. This explores ideas without modifying code.
- **Coding assistant UI**: conversations sidebar with real-time status, artifacts (diffs, plans, preview snapshots) next to the transcript, inline annotations.
- **Specialists**: Apple-built subagents for localization, UIKit resizing and accessibility, used automatically from the prompt.
- **Plug-ins** (Intelligence settings > Agents > Plug-ins): bundles of subagents, MCP servers, skills and ACP agent configurations; skills are slash commands with completion (type `/` to list them). MCP servers in a plug-in JSON can set `_meta` fields (`ideToolIconPath`, `ideToolIconRendersAsTemplate`, `ideToolTitles`) for custom icons and tool names.
- **Per-agent config**: files live in `~/Library/Developer/Xcode/CodingAssistant/ClaudeAgentConfig`, `.../codex`, `.../gemini`; they affect agents only when launched inside Xcode (default model, extra MCP servers, own skills).
- **Permissions**: Intelligence settings > Agents > Permissions: Allowed Commands and Allowed Tools. A filesystem-access security layer (enable in Coding Intelligence settings) monitors and controls file access by agents and the processes they spawn (178289431).
- **MDM**: set `CodingAssistantAllowExternalIntegrations` to `false` in a profile to turn the coding assistant off on managed devices.

## Choosing the tool

| Need | Use |
|------|-----|
| Build, test, simulator screenshots and `snapshot_ui` evidence from this plugin's workflow | XcodeBuildMCP (xcodebuild-mcp.md) |
| Render SwiftUI previews as images, edit String Catalogs, read project insights (crashes, hangs), drive the Xcode debugger | Xcode's MCP server via `xcrun mcpbridge` (project open in Xcode) |
| Review a plan before code changes inside Xcode | Plan mode (`/plan`) |
| Official API docs and WWDC | Apple Docs MCP, then `browser_fetch` on developer.apple.com |
