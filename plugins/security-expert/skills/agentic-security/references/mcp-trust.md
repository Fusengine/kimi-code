---
name: mcp-trust
description: Inventory and trust checks for every MCP server an agent session can load
when-to-use: Auditing .mcp.json, plugin MCP servers, subagent inline servers, or any MCP configuration in a repository
keywords: mcp, .mcp.json, npx, latest, pinning, tokens, headersHelper, disabledMcpjsonServers, tool descriptions
priority: high
related: trust-boundary.md, hooks-plugins.md, prompt-injection.md
---

# MCP Server Trust

## Why it matters

A stdio MCP server is a local process started with the user's rights; a remote server receives
whatever headers and tokens the config sends; every server's tool output re-enters the model's
context. Anthropic does not security-audit MCP servers.

## Documented facts

Source: https://code.claude.com/docs/en/security (section "MCP security")
- Project-scoped servers live in `.mcp.json`; servers at other scopes and claude.ai connectors
  are configured outside the repository, "and plugins can add servers too, so reviewing
  `.mcp.json` doesn't show every server a session can load".
- Anthropic reviews connectors against its listing criteria before adding them to the Anthropic
  Directory, "but does not security-audit or manage any MCP server".

Source: https://code.claude.com/docs/en/mcp
- "Verify you trust each server before connecting it. Servers that fetch external content can
  expose you to prompt injection risk."
- Scopes: local and user in `~/.claude.json`, project in `.mcp.json`; precedence local, project,
  user, plugin-provided, claude.ai connectors (section "Scope hierarchy and precedence").
- Plugins define servers in `.mcp.json` at the plugin root or inline in `plugin.json`; Claude Code
  starts them automatically when the plugin is enabled.
- `claude -p`, Agent SDK sessions, and cloud sessions outside a project's threads load project-scoped servers without the approval
  prompt; `disabledMcpjsonServers`, `--setting-sources` and `--strict-mcp-config` keep them out.
- In a remote server's `url` and `headers`, credential variables such as `ANTHROPIC_API_KEY`,
  `ANTHROPIC_AUTH_TOKEN` and `NPM_TOKEN` read as empty; a name outside the covered set, such as
  `API_KEY`, "expands as written".
- `headersHelper` is executed "as an arbitrary shell command", only after trust for project and
  local-scope servers.

Source: https://code.claude.com/docs/en/permissions (section "What runs before you trust a folder")
- Inline `mcpServers` in the frontmatter of a repository subagent are not used until the folder is trusted.

## Checklist

| # | Look for | Where | Why | Verify |
|---|----------|-------|-----|--------|
| M1 | Full server inventory | `.mcp.json`, plugin `.mcp.json` / `plugin.json` `mcpServers`, agent frontmatter `mcpServers`; user-level files only on owner request | `.mcp.json` alone is incomplete per the security doc | One row per server: name, source file, transport, command or URL |
| M2 | Publisher | package name, repository, URL host | Anthropic does not audit servers | Official vendor or the owner's own code vs unknown publisher |
| M3 | Unpinned launch: `npx -y <pkg>`, `@latest`, `uvx <pkg>` without version, bundle URL | `command` / `args` | Each start may run new upstream code | Exact version or digest present? |
| M4 | Env vars and tokens passed | `env`, `headers`, `args` | A server receives every credential it is given | List variable names only, never values; flag literal secrets (see secrets.md) |
| M5 | Remote URL hosts | `url` | Data sent to a third party | Record host; flag plain `http://` to non-local hosts |
| M6 | `headersHelper` commands | server config | Shell command execution | Read the command as you would a hook |
| M7 | Tool descriptions carrying instructions ("always call", "ignore previous", "do not tell the user") | server source or tool listing, when available | Descriptions enter the model's context (prompt-injection surface) | Quote the line; static read only — see verification.md |
| M8 | Servers that fetch external content (web, issues, email) | server purpose | Named prompt-injection risk in the MCP doc | Cross-check with prompt-injection.md P1 |
| M9 | Broad MCP allow rules (`mcp__<server>__*`) | permission settings | Every tool of the server runs without prompt | See permissions.md |
