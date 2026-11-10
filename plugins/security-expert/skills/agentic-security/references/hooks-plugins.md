---
name: hooks-plugins
description: Hook supply chain of Claude Code plugins and marketplaces — what hooks.json and plugin.json make a user's machine run
when-to-use: Auditing a plugin or a marketplace repository, or a project that enables third-party plugins
keywords: hooks.json, plugin.json, mcpServers, userConfig, sensitive, CLAUDE_PLUGIN_ROOT, CLAUDE_PLUGIN_OPTION
priority: critical
related: trust-boundary.md, mcp-trust.md, secrets.md
---

# Hooks and Plugins

## Why it matters

A plugin hook is a shell command that runs on every user who enables the plugin, on the events
it subscribes to. A marketplace that ships hooks ships code execution to every installer.

## Documented facts

Source for this section: https://code.claude.com/docs/en/plugins-reference

- `plugin.json` `hooks` takes a `.json` path, an inline hooks object, or an array of both;
  Claude Code merges it with `hooks/hooks.json` when that file exists. A hooks file wraps its
  event map in a top-level `"hooks"` key.
- `plugin.json` `mcpServers` takes a `.json` path, an MCP bundle path or URL (`.mcpb` / `.dxt`,
  downloaded into `.mcpb-cache/`), an inline map, or an array. `.mcp.json` at the plugin root
  loads first; a later server with the same name replaces an earlier one.
- `userConfig` option field `sensitive`: "If `true`, masks input and stores the value in secure
  storage instead of `settings.json`". Non-sensitive values are saved under `pluginConfigs` in
  the user's `settings.json`.
- `CLAUDE_PLUGIN_OPTION_<KEY>` is exported to hook processes for every option.
  `${user_config.KEY}` is substituted in MCP and LSP config, exec-form hook `args`, and skill and
  agent content (sensitive values become a placeholder in skill and agent content).
- Shell-form hook commands, monitor commands and MCP `headersHelper` reject `${user_config.*}`,
  because a shell would re-parse the substituted value.
- Hook commands can reference `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PROJECT_DIR`.

Source: https://code.claude.com/docs/en/permissions (section "Precedence among rules, hooks, and mods")
- PreToolUse hook decisions don't bypass deny and ask rules; this covers hooks in settings files
  and in a plugin's `hooks/hooks.json`. A hook that exits with code 2 blocks the call before
  permission rules are evaluated.

Source: https://code.claude.com/docs/en/security
- Non-interactive (`-p`) sessions show neither the trust dialog nor the `.mcp.json` approval prompt.

## Checklist

| # | Look for | Where | Why | Verify |
|---|----------|-------|-----|--------|
| H1 | Every hook: event, matcher, command | `hooks/hooks.json`, `plugin.json` `hooks`, referenced `.json` files | Build the full inventory; merged sources are easy to miss | Resolve each referenced file; list command per event |
| H2 | Network calls in hook commands or the scripts they run (`curl`, `wget`, `fetch`, sockets) | hook scripts | Exfiltration or remote payload at every event | Read the script, record the destination host |
| H3 | Writes outside the project or plugin data dir | hook scripts | A hook runs with the user's full account rights | Look for absolute paths, `~`, `$HOME` writes |
| H4 | Hardcoded absolute paths or user names | hook commands | Breaks on other machines; may point at attacker-controlled locations | Paths should derive from `CLAUDE_PLUGIN_ROOT` / `CLAUDE_PROJECT_DIR` |
| H5 | Shell-form commands that interpolate tool input or option values | hook commands | Command injection through tool input (CWE-78) | Prefer exec form with `args`; trace untrusted input to the command |
| H6 | `mcpServers` from a URL bundle or unpinned package | `plugin.json`, plugin `.mcp.json` | Remote code fetched at install or start | See mcp-trust.md |
| H7 | Secrets as non-`sensitive` `userConfig` | `plugin.json` `userConfig` | Stored in `settings.json` in clear | Any token / key option without `"sensitive": true` |
| H8 | Hooks that auto-approve (`"allow"`) broadly | PreToolUse hooks | Removes the human prompt for matching calls | List matchers returning allow |
| H9 | Hooks on session-start events in a repository (not a plugin) | `.claude/settings.json` | Runs in `-p`/SDK without trust | See trust-boundary.md T1 |

For a marketplace repository, run H1-H8 on every plugin and report per plugin.
