# Fusengine Kimi Code Plugins

Port of the [Fusengine Claude Code plugins](../claude-plugins/) to **Kimi Code CLI**, re-architected for **K3** (1M-token context, native reasoning, native vision) — not a literal translation.

- **25 plugins** · 212 skills · 39 agents · 34 commands · 71 hook rules
- Same agentic core as the Claude version: APEX methodology, sniper/challenger verification, domain experts, SOLID/DRY guards — wired through the same `@fusengine/harness` binary
- Measured parity with Claude Code on the benchmark suite: **3/3 tasks, 3.6–6.3× lower latency** — see [`docs/BENCHMARK.md`](docs/BENCHMARK.md)

## Layout

```
kimi-code/
├── KIMI.template.md          # Legacy duplicate of plugins/kimi-rules/templates/KIMI.md.template
├── AGENTS.md                 # Thin project-only instructions (global rules live in the template + corpus)
├── marketplace.json          # Plugin catalog for /plugins marketplace
├── plugins/                  # 25 plugins (kimi.plugin.json manifests)
│   ├── kimi-rules/           # Core rules corpus 00-08 + template
│   ├── ai-pilot/             # sniper, challenger, explore-codebase, research-expert, …
│   └── …                     # domain experts (nextjs, laravel, react, rust, go, …)
├── scripts/
│   ├── migrate.ts            # Claude→Kimi migration pipeline (6 steps, JSON report)
│   ├── install-kimi.ts       # Installer → $KIMI_CODE_HOME
│   ├── validate.ts           # Conformance checks (25/25 green)
│   ├── hooks/kimi-hook-shim.mjs   # Env bridge → @fusengine/harness
│   └── benchmark/            # 3-task comparative benchmark (kimi vs claude)
└── docs/
    ├── MIGRATION.md          # Architectural analysis Claude→K3
    └── BENCHMARK.md          # Protocol + measured results
```

## Install

```
# Install the plugin
/plugins install https://github.com/fusengine/kimi-code

# Setup (hooks + API keys + MCP servers)
~/.kimi-code/plugins/managed/fusengine/setup.sh        # macOS / Linux
~\.kimi-code\plugins\managed\fusengine\setup.ps1       # Windows
```

Then `/plugins reload` (or start a new session). One plugin, one namespace: 212 skills, 34 commands (`/fusengine:<cmd>`), 71 harness-backed hook rules. API keys for MCP servers: `cp ~/.kimi-code/plugins/managed/fusengine/.env.example ~/.kimi-code/.env`, fill in, re-run `setup.sh`.

## How it works

The installer (run by `setup.sh`): backs up existing config, stages `@fusengine/harness` **from npm**, copies `plugins/kimi-rules/templates/KIMI.md.template` as `~/.kimi-code/AGENTS.md`, merges the rules corpus between idempotent fences, merges MCP servers into `~/.kimi-code/mcp.json`, and materializes the 37 agents into `~/.kimi-code/agents/`. Kimi Code does NOT auto-load `.env` — the installer reads it when resolving `${VAR}` placeholders into `mcp.json`, and the harness reads it at runtime.

```
User prompt → Hook detects project type → Expert agent activated
            → Hook loads SOLID references → Agent reads docs via MCP
            → Hook blocks if DRY violation → Agent writes code
            → Hook checks file size → Agent runs Sniper validation
            → Commit gate blocks on lint/type errors → Commit with version bump
```

Every step is intercepted — same harness, same enforcement as the Claude Code version.


## Requirements

- Bun ≥ 1.1 · Kimi Code CLI ≥ 0.29
- Le harness `@fusengine/harness` est installé depuis **npm** (registre officiel) par l'installateur — aucune dépendance envers une autre CLI

## Statusline (terminal daemon)

Kimi exposes no user statusline surface, so the port renders outside the TUI — terminal title + `~/.kimi-code/statusline.txt` (tmux-ready):

```bash
bun run plugins/core-guards/statusline/src/daemon.ts start   # stop | status
```

Shows `⎇ branch*dirty · model · effort · ctx % · edits · age · dir`, read from the live session's `state.json`/`wire.jsonl`. Details: `plugins/core-guards/statusline/README.md`.

## Regenerating

```bash
bun run scripts/migrate.ts              # claude-plugins/plugins → plugins/ (24/24, JSON report)
bun run scripts/scrub-claude-refs.ts
bun run scripts/apply-core-overrides.ts # re-applies the hand-written K3 core (kimi-rules, ai-pilot agents, shims)
bun run scripts/validate.ts
bun run scripts/benchmark/run.ts --cli=both
```

The hand-written core lives in `core-overrides/` (`kimi-rules/` plugin + the 8 ai-pilot agents) so a full mechanical regeneration never loses it.

## Known accepted regressions

- One `type:"prompt"` hook (core-guards Stop) dropped — Kimi hooks are command-only; noted in `plugins/migration-report.json`.
- Agent `model:` routing (sonnet/opus) removed — all subagents run on the main model (K3).
- See `docs/MIGRATION.md` §5 for the full list and rationales.
