# Core Guards

Security guards and SOLID enforcement hooks for Kimi Code.

## Features

### PreToolUse Guards

| Guard | Description |
|-------|-------------|
| **git-guard** | Blocks destructive git commands (push --force, reset --hard). Asks confirmation for others. |
| **install-guard** | Asks confirmation before package installations (npm, pip, brew, etc.) |
| **security-guard** | Validates dangerous bash commands via security rules |
| **pre-commit-guard** | Runs linters (ESLint, TypeScript, Prettier, Ruff) before git commit |
| **enforce-interfaces** | Blocks interfaces/types in component files - must be in `src/interfaces/` |

**Cache hooks** (context reduction):

| Hook | Description |
|------|-------------|
| **limit-mcp-verbosity** | Caps MCP payload size: `numResults ≤ 3` (Exa), `tokens ≤ 2000` (Context7) |
| **mcp-cache-lookup** | ripgrep lookup in `~/.kimi-code/fusengine-cache/sessions/`, TTL 48h. On hit: deny + inject cached content |
| **webfetch-cache-lookup** | Hash-based lookup in `~/.kimi-code/fusengine-cache/webfetch/`, TTL 24h |

### PostToolUse Guards

| Guard | Description |
|-------|-------------|
| **enforce-file-size** | Blocks files > 100 lines - must split into modules |
| **track-session-changes** | Tracks cumulative code changes for sniper trigger |
| **webfetch-cache-store** | Persists WebFetch results (atomic_write, overwrite on store) |
| **cache-mcp-result** | Persists MCP results to session cache (overwrite atomic — refreshes mtime to avoid stale lockout) |

### SessionStart

| Script | Description |
|--------|-------------|
| **inject-kimi-md** | Injects KIMI.md content into session context |
| **load-dev-context** | Loads git status, detects project type |
| **cleanup-session-states** | Cleans up stale session state files from /tmp |
| **cleanup-old-caches** | Prunes `~/.kimi-code/fusengine-cache/` whitelist (sessions/webfetch/doc/explore), TTLs 48h/24h |

### UserPromptSubmit

| Script | Description |
|--------|-------------|
| **read-kimi-md** | Reads KIMI.md + auto-triggers APEX for dev tasks |

### SubagentStop

| Script | Description |
|--------|-------------|
| **track-agent-memory** | Tracks agent completion for context persistence |

### Stop

| Event | Sound | Description |
|-------|-------|-------------|
| **Task complete** | `finish.mp3` | Plays when Kimi finishes responding |

### Notification

| Matcher | Sound | Description |
|---------|-------|-------------|
| **permission_prompt** | `permission-need.mp3` | Permission request (Bash, Write, Edit) |
| **idle_prompt** | `need-human.mp3` | Kimi waiting for user input (60+ sec) |
| **elicitation_dialog** | `need-human.mp3` | MCP tool input required |

### Statusline

Modular SOLID statusline for Kimi Code terminal.

| Segment | Description |
|---------|-------------|
| **kimi** | Kimi version |
| **directory** | Path + git (branch, dirty, staged/unstaged) |
| **model** | Model name + tokens |
| **context** | Context usage progress bar |
| **cost** | Session cost |
| **limits** | 5h/7d limits with reset time |
| **dailySpend** | Daily spending |
| **node** | Node.js version |
| **edits** | Edit counter |

## Installation

### 1. Install Plugin

Run inside Kimi Code. This installs the whole Fusengine suite, which includes this plugin:

```
/plugins install https://github.com/fusengine/kimi-code
```

### 2. Install Hooks + Statusline

```
~/.kimi-code/plugins/managed/fusengine/setup.sh        # macOS / Linux
~\.kimi-code\plugins\managed\fusengine\setup.ps1       # Windows
```

This script will:
- Install hooks loader in `~/.kimi-code/settings.json`
- Install statusline bun dependencies
- Configure `statusLine` in `~/.kimi-code/settings.json`
- Create a backup of your settings

### 3. Configure Statusline Options

Edit `statusline/config.json` to enable/disable segments:

```json
{
  "kimi": { "enabled": true },
  "directory": { "enabled": true, "showGit": true },
  "model": { "enabled": true, "showTokens": true },
  "context": { "enabled": true, "progressBar": { "style": "blocks" } },
  "cost": { "enabled": true },
  "limits": { "enabled": true, "show5h": true, "show7d": true }
}
```

Or use the interactive configurator:

```bash
bun run config        # Web configurator
bun run config:term   # Terminal configurator
```

## Configuration

The guards are automatically loaded via the hooks system. No additional configuration required.

### Ralph Mode

Git and install guards support **Ralph Mode** for autonomous development:
- Set `RALPH_MODE=1` environment variable
- Or create `.kimi/ralph/prd.json` in project
- Or work on a `feature/*` branch

In Ralph mode, safe git commands and project-level installs are auto-approved.

## License

MIT
