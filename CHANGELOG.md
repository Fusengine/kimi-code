# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer](https://semver.org/).

## [1.0.30] - 2026-11-11

### Changed
- deps: harness floor raised to @fusengine/harness 0.1.116 (`fusengine.harnessMinVersion`, `harness-floor.json` beside every shim) — fixes the false shell-redirect CONFIRM on `( … 2>&1) || true` introduced in 0.1.115; redirects to code files stay blocked. Existing installs below the floor self-update at the next SessionStart.

## [1.0.29] - 2026-11-10

### Added
- harness: SessionStart auto-update of the shared @fusengine/harness — staged into `harness-versions/` and activated by an atomic `harness-current` symlink switch, single-flight lock, 30-min back-off on failure (`FUSE_ENSURE_DEPS_BACKOFF_MIN`), one-time note naming the old and new versions, `harness-floor.json` shipped beside each shim.
- harness: dedicated shim scope `update` (SessionStart only, never spawns the harness) for the 17 plugins that declare hooks without SessionStart, so a lone plugin still triggers the update; the root manifest skips `update` hooks (71 hooks) and the static check accepts the scope only on SessionStart (ai-pilot 1.2.46, changelog-watcher 1.0.16, design-expert 2.2.11, go-expert 1.0.8, hermes-expert 1.0.1, laravel-expert 1.2.10, nextjs-expert 1.1.26, php-expert 1.0.9, react-expert 1.0.23, rust-expert 1.0.9, security-expert 1.0.21, seo 1.0.14, shadcn-expert 1.0.20, swift-apple-expert 1.1.22, tailwindcss 1.1.13, tanstack-start-expert 1.0.8, typescript-expert 1.0.9).

### Fixed
- security-expert and changelog-watcher (`changelog-scan`) harness commands prefer `harness-current`; the changelog-scan path was broken.

### Changed
- install: runtime-deps removes `harness-current` after a setup stage, so the freshly staged harness is the one that runs.

## [1.0.28] - 2026-11-10

### Added
- plugin: new `devops-expert` (fuse-devops 1.0.0) — devops-expert agent + 18 self-hosted infrastructure skills (Docker, Kubernetes, Linux, Proxmox VE, OpenStack, Terraform/OpenTofu, Ansible, CI/CD, observability, storage and backup, secrets, databases), no hooks; registered in marketplace.json and the root manifest.
- rules: project-detection row routing infrastructure repos to devops-expert (kimi-rules 1.39.24).

### Changed
- deps: harness floor raised to @fusengine/harness 0.1.115 (`fusengine.harnessMinVersion`, installer stages `>=0.1.115`, AGENTS.md harness-floor note); counters re-measured — 26 plugins, 230 skills, 40 agents (README, build-root-manifest, .kimi-plugin).

### Fixed
- tests: the live hook test layer restages a cached harness older than the floor instead of reporting a stale "cache hit".

## [1.0.27] - 2026-11-10

### Added
- security-expert: agentic-security skill (AI agent, MCP, hooks, plugins and CI-agent security audit) ported from claude-plugins v1.39.47 (security-expert 1.0.20).

### Changed
- security-expert: agent, rules, scan command and 5 skills (auth-audit, cve-research, dependency-audit, security-headers, security-scan) refreshed from claude-plugins v1.39.47, with new references (security-expert 1.0.20).

### Fixed
- security-expert: harness scanner path resolves under Kimi via `${KIMI_CODE_HOME:-$HOME/.kimi-code}` (security-expert 1.0.20).

## [1.0.26] - 2026-11-09

### Changed
- ai-pilot: lead-orchestration, brief-template, verification and sniper rule sentences ported word-for-word from claude-plugins 49e2ea35 (owner's verb, scope, "everywhere", migration/deploy, production data, full gate before release, after each deploy, test review rules) (ai-pilot 1.2.45).

## [1.0.25] - 2026-11-09

### Changed
- workflow: port of the claude-plugins coordinator workflow — lead-orchestration (the lead orchestrates, at most 6 concurrent agents) across kimi-rules, KIMI template, AGENTS.md, commit agent and APEX skills/commands; expert agents and skills updated; new ai-pilot skill `web-performance` wired into the 5 web experts; `browser_metrics` docs fixed incl. core-overrides (server counters, not Core Web Vitals) (ai-pilot 1.2.44, astro-expert 1.0.15, commit-pro 1.2.28, kimi-rules 1.39.23, laravel-expert 1.2.9, nextjs-expert 1.1.25, php-expert 1.0.8, react-expert 1.0.22, rust-expert 1.0.8, security-expert 1.0.19, seo 1.0.13, shadcn-expert 1.0.19, solid 1.0.20, swift-apple-expert 1.1.21, tailwindcss 1.1.12, tanstack-start-expert 1.0.7, typescript-expert 1.0.8).

### Added
- plugin: new `hermes-expert` (fuse-hermes 1.0.0, 13 skills) registered in marketplace.json, root manifest and hook routes — suite now 25 plugins, 211 skills, 71 hook rules.

## [1.0.24] - 2026-10-12

### Changed
- deps: harness floor raised to @fusengine/harness 0.1.108 (`fusengine.harnessMinVersion`, install test asserts `>=0.1.108`, AGENTS.md harness-floor note) — 0.1.108 asks for lessons in caveman style and adds a per-recipient injection registry for Claude Code only (Kimi hook output byte-identical) (ai-pilot 1.2.43, astro-expert 1.0.14, cartographer 1.0.13, changelog-watcher 1.0.15, commit-pro 1.2.27, core-guards 1.1.43, design-expert 2.2.10, fuse-lessons 1.0.7, go-expert 1.0.7, kimi-rules 1.39.22, laravel-expert 1.2.8, nextjs-expert 1.1.24, php-expert 1.0.7, prompt-engineer 1.1.12, react-expert 1.0.21, rust-expert 1.0.7, security-expert 1.0.18, seo 1.0.12, shadcn-expert 1.0.18, solid 1.0.19, swift-apple-expert 1.1.20, tailwindcss 1.1.11, tanstack-start-expert 1.0.6, typescript-expert 1.0.7).

## [1.0.23] - 2026-10-12

### Fixed
- rules: the lead always delegates, even a one-line edit — Scope Ladder first row is now "1 agent (the domain expert) + sniper — the lead never edits, even a one-line change", new "Always delegate — every edit, even one line" bullet, "at the right scope" loophole removed; one canonical exception worded identically in the template trap, rule 03 and lead-orchestration steps 4/5 + Check (after 2 failed delegations on a localised, already-measured defect the lead reads and fixes it itself — the only case where the lead edits; otherwise escalate past the 3-cycle cap); APEX "SKIP APEX trivial fix — the edit is still made by one delegated agent"; apex-quick spawns ONE domain-expert agent.
- docs: hand-typed counts re-measured — 197 skills, 38 agents, 34 commands, 69 hook rules (README, build-root-manifest, .kimi-plugin) (ai-pilot 1.2.42, astro-expert 1.0.13, cartographer 1.0.12, changelog-watcher 1.0.14, commit-pro 1.2.26, core-guards 1.1.42, design-expert 2.2.9, fuse-lessons 1.0.6, go-expert 1.0.6, kimi-rules 1.39.21, laravel-expert 1.2.7, nextjs-expert 1.1.23, php-expert 1.0.6, prompt-engineer 1.1.11, react-expert 1.0.20, rust-expert 1.0.6, security-expert 1.0.17, seo 1.0.11, shadcn-expert 1.0.17, solid 1.0.18, swift-apple-expert 1.1.19, tailwindcss 1.1.10, tanstack-start-expert 1.0.5, typescript-expert 1.0.6).

## [1.0.22] - 2026-10-12

### Changed
- parity: port of the claude-plugins improvements and full skill/agent parity — new `lead-orchestration` skill and `skill-creator` agent; kimi-rules two-speed communication, AUTONOMY block, task-based split, DRY via solid-detection, challenger triggers, owner-correction → rule; commit agent Automatic Mode and conditional release watch; verification "look before done"; design corpus aligned to fifteen references with 5 new recodes (dispatch, mosa, parley, stash, stripe) and multi-platform design-ios; swift-apple-expert HIG references, mcp-tools workflows, tvOS/watchOS/visionOS fixes; invented line caps replaced by the `FUSE_SOLID_MAX_LINES` hook ceiling; `TeamCreate` wording replaced by parallel `Agent` calls; hook shim update across all plugins, new ai-pilot Stop / core-guards PostCompact / fuse-lessons memory hooks, build-root-manifest, hooks e2e tests; deps @clack/prompts ^1.8.1, bun-types ^1.4.3, harnessMinVersion 0.1.107 (ai-pilot 1.2.41, astro-expert 1.0.12, cartographer 1.0.11, changelog-watcher 1.0.13, commit-pro 1.2.25, core-guards 1.1.41, design-expert 2.2.8, fuse-lessons 1.0.5, go-expert 1.0.5, kimi-rules 1.39.20, laravel-expert 1.2.6, nextjs-expert 1.1.22, php-expert 1.0.5, prompt-engineer 1.1.10, react-expert 1.0.19, rust-expert 1.0.5, security-expert 1.0.16, seo 1.0.10, shadcn-expert 1.0.16, solid 1.0.17, swift-apple-expert 1.1.18, tailwindcss 1.1.9, tanstack-start-expert 1.0.4, typescript-expert 1.0.5).

## [1.0.21] - 2026-09-27

### Changed
- skills/agents: port of the 2026-09-27 claude-plugins skills update to the latest stable versions — React 19.3, Next.js 16.3, Prisma 7.10, TypeScript 7.0, Tailwind CSS 4.3, Astro 7.3, Laravel 13, PHP 8.5, Go 1.27, Rust 1.98, Swift 6.4 / iOS 27; shadcn/ui docs now Base UI-first; all skill and agent content translated to English (676 files, frontmatter keys unchanged) (astro-expert 1.0.11, cartographer 1.0.10, design-expert 2.2.7, go-expert 1.0.4, laravel-expert 1.2.5, nextjs-expert 1.1.21, php-expert 1.0.4, react-expert 1.0.18, rust-expert 1.0.4, seo 1.0.9, shadcn-expert 1.0.15, solid 1.0.16, swift-apple-expert 1.1.17, tailwindcss 1.1.8, tanstack-start-expert 1.0.3, typescript-expert 1.0.4).

## [1.0.20] - 2026-08-01

### Fixed
- Hook shim: `compactPromptInjection` now covers the `lessons` scope too — the TUI shows only "lessons injected" while the full lessons corpus still reaches the model at SessionStart/SubagentStart — and prepends "AGENTS.md injected" unconditionally on the rules scope, for both output shapes (harness-short notice and shim-trimmed corpus). All 24 bundled plugin copies synced.
- Hook shim: new `normalizeToolInput` aliases Kimi's `tool_input.path` to Claude's `tool_input.file_path` before forwarding to the harness — repairs the lessons Stop write-tracker, which reads `file_path` and was silently dead under Kimi (PostToolUse on a source file now arms the reminder and Stop emits it, proven end-to-end live). All 24 bundled plugin copies synced.
- mcp: magic env var renamed `MAGIC_API_KEY` → `TWENTY_FIRST_API_KEY` in `plugins/ai-pilot/mcp.json.bak` — the 21st MCP shim v0.2.2 reads only `API_KEY` / `TWENTY_FIRST_API_KEY` / `API_KEY_21ST` (verified in its dist code) and the old Magic keys were reset server-side by 21st.dev (ai-pilot 1.2.40).
- statusline: exact agent detection — foreground = `Agent` tool.calls without a matching `tool.result` across all session wires (main + nested agent-*), background = task JSONs with kind=agent and status running, plus a 2h timeout cap so dangling calls from killed/lost agents stop counting (was stuck at ⚙ 1 with zero active agents) (core-guards 1.1.40).

### Documentation
- .env.example: same `MAGIC_API_KEY` → `TWENTY_FIRST_API_KEY` rename, with a note that the old keys were reset and that the shim reads only the three variables above.

## [1.0.19] - 2026-07-31

### Fixed
- readme: install section now uses `/plugins reload` instead of `/reload` (the correct command for plugin changes, per the official docs), and the hook count is corrected from 68 to 63 (actual count after the core-guards dedup, confirmed by `bun run build:manifest`).

## [1.0.18] - 2026-07-31

### Fixed
- statusline: the branch name is now read live from `git branch --show-current` instead of the payload's `gitBranch` field — that field comes from a slowly-refreshed TUI cache and showed a stale branch name after switching branches. The payload value is kept as a fallback outside git repos (core-guards 1.1.39).

## [1.0.17] - 2026-07-31

### Added
- Custom TUI statusline: `plugins/core-guards/statusline/native/statusline-native.mjs` renders one colored line from the CLI's JSON snapshot (time, git +staged/~unstaged/?untracked, truncated path, ± line stats parsed from the session wire, 5h/7D quota windows via the managed usage API with 5-min cache and NaN→0% rollover guard, ⚙ fg|bg agent counts, model+thinking effort from config.toml, permission mode, version, session age; <300ms, exit 0 always).
- install: `installStatusline(ctx)` copies the script to `$KIMI_HOME/bin/statusline-native.mjs` (chmod 755) and surgically upserts `[status_line].command` in `$KIMI_HOME/tui.toml` — preserves all other content, idempotent, dryRun plans only, skips when the source is absent. Registered in the install runner after configureExperimentalFlag (core-guards 1.1.38).
- tests: 8 install-statusline tests (deploy to bin/, content preservation, idempotence, header-with-comment TOML edge case).

### Changed
- gitignore: project-local `.kimi-code/` state is never tracked.

## [1.0.16] - 2026-07-31

### Documentation
- git-flow Step 8: the GitHub Release object is now MANDATORY for all repos — a pushed tag alone is invisible to anything resolving "latest release" (Kimi `/plugins install <github-url>` reads Releases, not tags); Step 8 runs `gh release create vX.Y.Z --latest` with CHANGELOG notes and verifies `releases/latest` (commit-pro 1.2.24). Skill frontmatter restored (`user-invocable: false`, `related-skills`).

## [1.0.15] - 2026-07-31

### Fixed
- Hook shim: the payload `cwd` is forwarded to the harness child process — Kimi runs plugin hooks with the cwd set to the plugin root and the harness CLI passed `process.cwd()` to its gates, so cwd-sensitive gates (the pre-commit tsc sweep) evaluated the deployed suite root instead of the project and blocked every commit with phantom TS2688 errors. All 24 bundled plugin copies synced.
- Hook shim: UserPromptSubmit rules injection compacted to notice lines ("AGENTS.md injected" / "rules 00-08 injected") — the full 18KB corpus flooded the TUI on every prompt; the corpus still reaches the model at SessionStart/SubagentStart. All 24 bundled plugin copies synced.
- core-guards: duplicate SubagentStop/SessionStart hook registrations removed from the root and plugin manifests (core-guards 1.1.37).
- benchmark shell: `timedOut` defaults to `false` when `exitedDueToTimeout` is undefined.

### Added
- install: `plugins/kimi-rules/templates/KIMI.md.template` deployed as `$KIMI_HOME/AGENTS.md`, with fixture and test coverage.
- Rules: "User Confirmations (ZERO TOLERANCE)" section in 00-critical-rules; "teammates" renamed to "sub-agents" (Kimi vocabulary) across 03-agent-teams and both KIMI.md.template copies (kimi-rules 1.39.19).
- ai-pilot commit agent: "Scope Boundary (ZERO TOLERANCE)" section — never code, escalate on gate surprises (ai-pilot 1.2.39).
- MEMORY/LESSON.md: three lessons from the hook injection and design-expert migration work.

### Changed
- design-expert re-synced from the restructured claude-plugins via `scripts/migrate.ts` with the Kimi adaptations (bare agent names, KIMI_PLUGIN_ROOT, Agent/AgentSwarm, handoff section); the elysian reference site moved to the plugin-level `_artistic/` directory (design-expert 2.2.6).
- AGENTS.md slimmed to a thin entry doc; README resynced with the current suite.
- tsconfig excludes design-expert layout-check scripts, seo scripts and benchmark fixtures; layout-check gets its own tsconfig; bun-types devDependency added — repo-wide `tsc --noEmit` green.
- gitignore: `**/.harness/`, `**/.claude/` and generated migration reports are never tracked; cached harness state and `plugins/migration-report.json` untracked (kept on disk).

### Tests
- hooks-e2e corpus aligned with the SessionStart/UserPromptSubmit injection split (63-rule corpus at SessionStart/SubagentStart, notice lines at UserPromptSubmit).

## [1.0.14] - 2026-07-30

### Fixed
- Hook shim: `KIMI_PLUGIN_ROOT` is remapped to the `kimi-rules` sub-plugin for the `rules` scope — the harness reads its corpus from `<KIMI_PLUGIN_ROOT>/rules` but kimi sets the var to the suite root, so per-prompt rules injection came out empty and the kimi-rules block never reached prompts.

## [1.0.13] - 2026-07-29

### Fixed
- `installRuntimeDeps`: `bun update` runs after `bun add` — the lockfile no longer pins the harness to the first staged version (0.1.85 deployed while npm served 0.1.86).

## [1.0.12] - 2026-07-29

### Fixed
- Hook shim: `$KIMI_HOME/.env` is overlaid on top of the inherited environment when spawning the harness — cross-harness shell pollution (fish `conf.d/claude-env.fish` exporting `~/.claude/.env`) no longer wins over the kimi config (gates showed 2min TTL and `.claude` SOLID refs instead of 8min and kimi paths). All 24 bundled plugin copies synced.
- `permission-mode`: `VALUE_RE` gains `/m` so the root-table key matches anywhere in the head segment.

## [1.0.11] - 2026-07-29

### Fixed
- Plugin manifest version: `build:manifest` now runs as part of the release flow — the version shown by `/plugins` (from `.kimi-plugin/plugin.json`) matches the release (was stuck at 1.0.7 since 1.0.8).

## [1.0.10] - 2026-07-29

### Fixed
- `permission-mode`: TOML upsert/read scoped to the root table — a section-scoped `default_permission_mode` no longer swallows the write, and replacements preserve trailing comments (typescript-expert review finding, toml.io semantics).
- `experimental-flag`: `writeFlagBlock` self-idempotent and no leading blank line on fresh rc files.

### Added
- `assertInstalledState` guard: `FUSE_HARNESS_REFS` must be present in `.env` with all refs dirs on disk, else an explicit "rerun install-kimi.ts" failure (prevents silent SOLID-gate fallback to other harnesses).

## [1.0.9] - 2026-07-29

### Added
- Official custom-agent spec alignment: uniform `## Final Message = Handoff` section on all 37 agent profiles (the spec drops the built-in handoff framing for custom sub-agents) and `subagents` allowlists where bodies name explicit dispatches (sniper → explore-codebase + research-expert, security-expert → sniper).

## [1.0.8] - 2026-07-29

### Added
- `configurePermissionMode` step: TTY select (YOLO ON/OFF, seeded with the current value) persists `default_permission_mode` in `~/.kimi-code/config.toml` via a surgical line edit; `FUSENGINE_PERMISSION_MODE` env override for non-interactive runs.
- `configureExperimentalFlag` step: proposes `KIMI_CODE_EXPERIMENTAL_FLAG=1` in the detected shell rc (default YES, guarded idempotent block, zsh/bash/fish) so custom agents are discovered by the v2 engine while the v1 backport (upstream #2232) is unreleased.

### Changed
- MCP preselection parity with the Claude installer: explicit `default` wins, otherwise no-key servers plus key-required ones whose `apiKeyEnv` is already set; key-required entries are labelled ✓ / ⚠ key missing in the multiselect.







## [1.0.7] - 2026-07-29

### Added
- Clack UI for the installer (TTY): intro/notes/outro, per-key text prompts, multiselect MCP server selection; plain output preserved on non-TTY.
- `selectMcpServers` step: server selection first, key prompts filtered to the selection (Claude installer parity); `FUSENGINE_MCP_SERVERS` env allowlist for non-interactive runs.
- Agents materialize as SYMLINKS to the managed plugin copy (live-updated by /plugins install); copies from plain clones; dangling entries cleaned.
- Native statusline command for Kimi >= 0.30.0 (`[status_line]` in tui.toml) + terminal daemon kept for older CLIs.

### Changed
- Hook shim: confirmation-class denies ([CONFIRM]) are suppressed so Kimi's permission system prompts interactively; hard blocks ([BLOCKED], APEX, SOLID, COMMIT) are forwarded unchanged.
- Scrub maps TeamCreate -> AgentSwarm; solid-generic skill updated accordingly.

### Fixed
- bun-types pre-commit failure (repo now installs @clack/prompts).
- hooks-config.ts split under the 90-line rule (hooks-block.ts extracted).

## [1.0.6] - 2026-07-29

### Added
- Harness configuration step (`configureHarness`): FUSE_HARNESS_REFS wired to every solid-STAR references dir; opt-in interactive tuning knobs (SOLID max lines, enforcement TTL, cache TTLs) persisted to `~/.kimi-code/.env`.
- Global hook activation (`installHooks`): 5 bootstrap `[[hooks]]` in `~/.kimi-code/config.toml` (rules + core guards, TOML-literal commands) between idempotent markers — auto-removed once the managed plugin owns hooks.
- Shared non-TTY stdin buffer for piped prompts (fixes "Premature close" across prompt steps).

## [1.0.5] - 2026-07-29

### Added
- Kimi statusline port (`plugins/core-guards/statusline/`): terminal-title daemon + `~/.kimi-code/statusline.txt` (tmux-ready). Segments from the live session: git, model, thinking effort, context %, edits, age, workDir. 3 unit tests, live-verified.

## [1.0.4] - 2026-07-29

### Added
- Interactive MCP API-key prompting at install time (parity with the Claude installer): missing keys are asked, saved to `~/.kimi-code/.env`, and used for the same run's MCP merge. Piped stdin is supported (non-TTY safe).

### Fixed
- Installer summary no longer prints the obsolete 24-command granular flow; next steps adapt to where setup ran from (managed plugin copy vs repo clone).
- Silent exit when prompting with piped stdin (readline EOF mid-await).

## [1.0.3] - 2026-07-29

### Changed
- README: single install flow in the Claude block format — `/plugins install https://github.com/fusengine/kimi-code` then `~/.kimi-code/plugins/managed/fusengine/setup.sh`.

## [1.0.2] - 2026-07-29

### Added
- Root `.kimi-plugin/plugin.json`: the repo installs as ONE plugin (`fusengine` namespace) via `/plugins install https://github.com/fusengine/kimi-code` — 196 skills, 34 commands, 68 hook rules.
- `scripts/build-root-manifest.ts` regenerates the root manifest (version read from package.json).
- `setup.sh` / `setup.ps1` one-liner at repo root.

### Changed
- Slash-command references remapped to `/fusengine:*` across rules, agents, skills and docs.

### Removed
- Zip-based remote marketplace (superseded by the root manifest).

## [1.0.1] - 2026-07-29

### Added
- Central MCP catalog (`scripts/mcp/mcp.json`, 23 servers) ported from the Claude installer; merged into `~/.kimi-code/mcp.json` with requiresApiKey-aware skips that point at each provider's key URL.
- `.env.example` (Kimi variant targeting `~/.kimi-code/.env`).
- `fusengine.harnessMinVersion` floor (0.1.85) in `package.json`; installer resolves npm spec as env pin > floor > latest.

### Changed
- MCP entries normalized to the Kimi schema: no `type` field (stdio inferred from `command`, HTTP from `url`), catalog metadata stripped before writing `mcp.json`.
- README: full Setup section (hooks + API keys + MCP servers) with plugin activation steps.

## [1.0.0] - 2026-07-28

### Added
- Initial port of the Fusengine Claude Code plugins to Kimi Code CLI (K3): 24 plugins, 196 skills, 37 agents, 34 commands, 68 hook rules.
- K3-optimized core: `KIMI.template.md`, `AGENTS.md`, rules 00-08, 8 hand-written ai-pilot agents (`core-overrides/`).
- Hook shim targeting the native kimi adapter of `@fusengine/harness` (npm-sourced); `install-kimi.ts` installer; migration pipeline with reproducible regen cycle.
- Benchmark suite with measured results: 3/3 Kimi vs 3/3 Claude, 3.6–6.3× lower latency (`docs/BENCHMARK.md`).
