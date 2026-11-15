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

Native statusline for Kimi Code (`statusline/native/statusline-native.mjs`). Segments are printed in this order, joined by ` · ` (lines 271-281); optional ones are omitted when empty.

| Segment | Description | Source line |
|---------|-------------|-------------|
| **time** | Current time `HH:MM` | 271 |
| **git branch** | `⎇ branch` plus staged `+n`, unstaged `~n`, untracked `?n` counts (`git status --porcelain`) | 272 (counts: 166-180) |
| **cwd** | Middle-truncated working directory (`first/…/last2`) | 273 (241-245) |
| **edited lines** | `± +added/-removed` for the session (only when > 0) | 274 |
| **agents** | `⚙ foreground \| n bg` sub-agent counts (only when > 0) | 275 |
| **quota** | `5h:` and `7D:` usage % with time to reset, colored by consumption | 276 (198-238) |
| **model** | Model alias, followed by the thinking effort when set | 277 |
| **permission mode** | Current permission mode | 278 |
| **plan** | `PLAN` when plan mode is active | 279 |
| **version** | `V <Kimi Code version>` | 280 |
| **session age** | Compact `H:MM` since the session was created | 281 (138-154) |

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

This script runs the installer (`bun run scripts/install-kimi.ts --yes`) against `$KIMI_CODE_HOME` (default `~/.kimi-code`). Kimi Code has no `settings.json`; the relevant steps are:
- Back up `config.toml`, `AGENTS.md` and `mcp.json` as `<file>.bak-<timestamp>` before changing anything
- Hooks: before the plugin suite is installed, write the guards as global `[[hooks]]` between the `# >>> fusengine hooks >>>` / `# <<< fusengine hooks <<<` markers in `~/.kimi-code/config.toml` (shim copied to `~/.kimi-code/hooks/fusengine-hook-shim.mjs`). Once the managed plugin copy exists (after `/plugins install`), the next setup run removes that block and the plugin's own hooks take over
- Statusline: copy `statusline-native.mjs` to `~/.kimi-code/bin/` and set `command` under `[status_line]` in `~/.kimi-code/tui.toml` (created when missing; every other line is preserved)
- Stage the shared `@fusengine/harness` (installer dependencies are installed with `bun install`; there are no separate statusline dependencies)

### 3. Statusline Configuration

The native statusline has no segment options: there is no `statusline/config.json` and no `bun run config` configurator. The segments are fixed (time, git branch + staged/unstaged/untracked counts, cwd, edited lines +/-, agents, quota, model + effort, permission mode, plan, version, session age; lines 271-281). What it reads (`statusline/native/statusline-native.mjs`):
- `KIMI_CODE_HOME` env var (default `~/.kimi-code`) — the only environment variable (line 16)
- the Kimi CLI's JSON snapshot on stdin (line 254)
- `[thinking].effort` from `$KIMI_CODE_HOME/config.toml` (lines 41-45)
- the session's `wire.jsonl` / `state.json` under `$KIMI_CODE_HOME/sessions` for the edited-line stats, agent counts and session age (lines 49-60, 78-117, 120-136, 139-154)
- quota: `$KIMI_CODE_HOME/cache/statusline-usage.json` (5 min cache), else `credentials/kimi-code.json` to call `https://api.kimi.com/coding/v1/usages` (lines 199-218)

The only setting is where Kimi finds it: `[status_line] command` in `$KIMI_CODE_HOME/tui.toml`, written by the installer (`scripts/lib/install/statusline.ts:48-75`, upsert logic at lines 26-45). Edit or remove that `command` line to change or disable the statusline; re-running setup restores it.

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
