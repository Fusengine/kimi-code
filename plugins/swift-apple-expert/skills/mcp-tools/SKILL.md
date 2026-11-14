---
name: mcp-tools
description: Use when needing Xcode build automation, Apple API/WWDC documentation lookup, or Xcode 27's own agent features and MCP server (xcrun mcpbridge, plan mode, plug-ins, RenderPreview) via XcodeBuildMCP, apple-docs MCP or Xcode.
---


<objective>
Documents the two MCP servers that power the Swift/Apple workflow: XcodeBuildMCP for Xcode project automation, build validation and on-simulator UI verification (discover projects, build/run/test on simulator, screenshots, runtime UI snapshots, appearance, autonomous build-fix-rebuild loops), and Apple Docs MCP for official documentation (all frameworks, symbol details, availability/deprecation, sample code, and bundled WWDC transcripts for 2014-2025 - newer sessions via developer.apple.com).

Defines the mandatory research-first priority order (Apple Docs MCP first, then Context7 for third-party libraries, then Exa web search) and the mandatory build-validation loop after every code change (build, read errors, fix, rebuild, only commit on zero errors).

Also covers Xcode 27's own coding intelligence and MCP server for external agents (`xcrun mcpbridge`, preview `xcrun mcp-server`, plan mode, plug-ins with skills/MCP servers/ACP agents, `lldb-mcp`, RenderPreview).

Includes installation snippets for both servers and a quick-reference table mapping tasks to the right tool.
</objective>

# MCP Tools for Swift Development

**Model Context Protocol servers for enhanced Swift/Xcode workflows.**

## Available MCP Servers

### 1. XcodeBuildMCP
**Purpose**: Xcode project automation and build validation

**Documentation**: [xcodebuild-mcp.md](references/xcodebuild-mcp.md), [xcodebuild-mcp-ui-verification.md](references/xcodebuild-mcp-ui-verification.md)

**Key features**:
- Discover Xcode projects and workspaces
- Build/run/test on simulator (`build_run_sim`, `test_sim`), device and macOS
- List schemes and show build settings
- Clean builds and derived data
- `screenshot` + `snapshot_ui` for UI verification (default workflow); appearance and taps via optional workflows
- **Autonomous build validation** (AI can build, read errors, fix, rebuild)

**Installation**:
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "npx",
      "args": ["-y", "xcodebuildmcp@latest"]
    }
  }
}
```

**Use when**:
- After making code changes (MANDATORY validation)
- Debugging build issues
- Creating new Xcode projects
- Cleaning stale builds

---

### 2. Apple Docs MCP
**Purpose**: Official Apple documentation with offline WWDC access

**Documentation**: [apple-docs-mcp.md](references/apple-docs-mcp.md), [apple-docs-mcp-workflows.md](references/apple-docs-mcp-workflows.md)

**Key features**:
- Search all Apple frameworks (SwiftUI, UIKit, Foundation, etc.)
- Get detailed symbol information (classes, methods, properties)
- **WWDC sessions bundled offline for 2014-2025**; newer sessions via developer.apple.com/videos
- Access Apple sample code
- Framework exploration and discovery
- API availability and deprecation checking

**Installation**:
```json
{
  "mcpServers": {
    "apple-docs": {
      "command": "npx",
      "args": ["-y", "@kimsungwhee/apple-docs-mcp"]
    }
  }
}
```

**Use when**:
- Researching Apple APIs (PRIORITY over Context7)
- Finding WWDC best practices
- Checking API availability
- Getting official code examples

---

### 3. Xcode's own MCP server (Xcode 27)
**Purpose**: give an external agent (Kimi Code) access to a project open in Xcode, and configure the agents that run inside Xcode

**Documentation**: [xcode-agents.md](references/xcode-agents.md)

**Setup** (Apple's documented command, https://developer.apple.com/documentation/xcode/giving-external-agents-access-to-xcode, read 2026-11-13): allow external agents in Xcode > Settings > Intelligence, then register `xcrun mcpbridge` as an `xcode` server in `$KIMI_CODE_HOME/mcp.json` (default `~/.kimi-code/mcp.json`; Kimi has no `mcp` subcommand):
```json
{
  "mcpServers": {
    "xcode": { "command": "xcrun", "args": ["mcpbridge"] }
  }
}
```
Open the project in Xcode before prompting. `sudo xcrun mcp-server enable` is a beta-5 preview of a workspace-less server (details and caveats in the reference).

**Use when**:
- Rendering SwiftUI previews to images (RenderPreview), editing String Catalogs, using the Xcode debugger or `lldb-mcp`
- Reviewing a plan first (plan mode, `/plan`) or installing Xcode agent plug-ins (skills, MCP servers, ACP agents)
- XcodeBuildMCP stays the default for build, test and UI evidence in this workflow

---

## Workflow Integration

### Research-First (MANDATORY)

```text
Priority order:
1. ⭐ Apple Docs MCP (official Apple docs + WWDC)
2. Context7 (third-party libraries)
3. Exa web search (community tutorials)
```

### Build Validation (MANDATORY)

```text
After EVERY code change:
1. XcodeBuildMCP: Build project
2. If errors → Read error messages
3. Fix issues
4. Rebuild to validate
5. Only commit if zero errors
```

---

## Complete Development Workflow (2026)

```text
1. Feature request received
   ↓
2. Apple Docs MCP: Search API/WWDC
   ↓
3. Read existing codebase (DRY principle)
   ↓
4. Implement following Apple patterns
   ↓
5. XcodeBuildMCP: Build to validate ⭐
   ↓
6. If build errors:
   - Read error messages
   - Fix issues
   - Rebuild
   ↓
7. Run tests (if available)
   ↓
8. UI changed? HIG verification gate on simulator
   (xcodebuild-mcp-ui-verification.md)
```

---

## Benefits

### XcodeBuildMCP
✅ Autonomous error detection and fixing
✅ Zero tolerance for compilation errors
✅ Lightning-fast incremental builds
✅ Project scaffolding automation
✅ Build validation before commits

### Apple Docs MCP
✅ Official Apple documentation (most accurate)
✅ WWDC sessions offline (2014-2025 bundled)
✅ Deprecation and availability info
⚠️ No HIG pages and no post-2025 WWDC: use developer.apple.com via `browser_fetch`
⚠️ Search is unreliable (0 results for the real `ToolbarSpacer`): never conclude an API is absent from it. Verify on the complete reference: `https://developer.apple.com/tutorials/data/documentation/<framework>/<path>.json` (lowercase, e.g. `swiftui/toolbarspacer.json`) and HIG `https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<slug>.json`; dated HIG changes: https://developer.apple.com/design/whats-new/

---

## Resources

**XcodeBuildMCP**:
- [Website](https://www.xcodebuildmcp.com) (repository moved to getsentry)
- [npm](https://www.npmjs.com/package/xcodebuildmcp)
- Version: 2.7.0 (npm `xcodebuildmcp`; project now also published as `mobilebuildmcp` 2.7.1 - see [xcodebuild-mcp.md](references/xcodebuild-mcp.md)). Tool minimum Xcode 16.x; this plugin targets Xcode 27.2

**Apple Docs MCP**:
- [GitHub](https://github.com/kimsungwhee/apple-docs-mcp)
- [npm](https://www.npmjs.com/@kimsungwhee/apple-docs-mcp)

---

## Quick Reference

| Task | MCP Tool | Documentation |
|------|----------|---------------|
| Search Apple API | `apple-docs` | `apple-docs-mcp.md` |
| Find WWDC session | `apple-docs` | `apple-docs-mcp.md` |
| Get code example | `apple-docs` | `apple-docs-mcp.md` |
| Research workflow | `apple-docs` | `apple-docs-mcp-workflows.md` |
| Build project | `XcodeBuildMCP` | `xcodebuild-mcp.md` |
| Validate changes | `XcodeBuildMCP` | `xcodebuild-mcp.md` |
| Clean build | `XcodeBuildMCP` | `xcodebuild-mcp.md` |
| Create project | `XcodeBuildMCP` | `xcodebuild-mcp.md` |
| Verify UI (HIG gate) | `XcodeBuildMCP` | `xcodebuild-mcp-ui-verification.md` |
| Connect Kimi Code to Xcode | `xcrun mcpbridge` | `xcode-agents.md` |
| Render a SwiftUI preview | Xcode MCP `RenderPreview` | `xcode-agents.md` |
| Plan mode, Xcode plug-ins, ACP | Xcode coding intelligence | `xcode-agents.md` |
