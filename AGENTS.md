# AGENTS.md — Fusengine Kimi Code plugin suite (source repo)

Source repository of the 26 Kimi Code plugins deployed to
`~/.kimi-code/plugins/managed/fusengine/`. The GLOBAL Fusengine rules
(identity, non-negotiables, APEX, swarms, SOLID/DRY, tooling) are NOT restated
here: they are installed into `~/.kimi-code/AGENTS.md` from
`plugins/kimi-rules/templates/KIMI.md.template` + the corpus
`plugins/kimi-rules/rules/*.md` merged between the `fusengine:kimi-rules`
fences, and loaded natively every session. Keep this file project-only.

## Layout

- `plugins/` — the 26 plugins (source of truth for manifests, skills, agents)
- `core-overrides/kimi-rules/` — canonical kimi-rules plugin, copied over
  `plugins/kimi-rules/` by `scripts/apply-core-overrides.ts`
- `core-overrides/ai-pilot-agents/` — hand-optimized ai-pilot agents
- `scripts/hooks/kimi-hook-shim.mjs` — THE hook shim source of truth; every
  plugin ships a byte-identical copy in `plugins/*/scripts/`
- `scripts/lib/install/` — installer (`install-kimi.ts` entry)
- `scripts/tests/` — installer e2e tests (Bun test)
- `docs/` — ALL documentation (never outside, except root README.md)

## Commands

- `bun run validate` — manifest/shim/MCP checks, must end `26/26 plugins valid.`
- `bun test scripts/tests/` — installer e2e tests
- `bun run install` — install/update into `$KIMI_CODE_HOME` (dry-run by default)
- `bun run scripts/apply-core-overrides.ts` — re-sync core-overrides → plugins
  (wipes `plugins/kimi-rules`, reinstalls from core-overrides, copies the shim
  into every plugin)

## Repo-specific rules

1. **Shim edits**: edit ONLY `scripts/hooks/kimi-hook-shim.mjs` (and its siblings
   `harness-autoupdate.mjs`, `harness-update-worker.mjs`), then copy all three into every `plugins/*/scripts/` (the
   loop in `apply-core-overrides.ts` `installShims()`). Never edit a plugin's
   copy directly. **Harness auto-update**: on SessionStart only, a harness older
   than the floor is staged into `$KIMI_CODE_HOME/harness-versions/` by a
   detached single-flight worker and switched with one atomic symlink rename
   (`harness-current`, preferred by the shim; setup stages remove it); a failed
   install pauses retries 30 min (`FUSE_ENSURE_DEPS_BACKOFF_MIN`; the stamp is
   written before the install); a one-line note in `.harness-update.log` is printed once at
   the next SessionStart; no auto-update on win32. `FUSENGINE_HARNESS_INSTALL_CMD`
   (tests) is honoured only with `FUSENGINE_TEST=1`. Every `scripts/` dir also ships
   `harness-floor.json` (generated from `package.json` by `installShims()`; a floor
   bump needs a re-sync, enforced by `shipped-modules.test.mts`) so a lone
   marketplace plugin knows the floor. The 17 plugins that have hooks but no
   SessionStart carry `... kimi-hook-shim.mjs" update` (timeout 5): shim scope
   `update` runs the SessionStart auto-update and exits 0 without ever spawning
   the harness; `build-root-manifest.ts` skips it, so the suite root manifest
   stays at 71 hooks (the per-plugin corpus is 88). The 4 plugins with no hooks
   (incl. devops-expert) never self-update.
2. **kimi-rules edits**: edit `core-overrides/kimi-rules/`, then re-run
   `apply-core-overrides.ts`. `plugins/kimi-rules/` is regenerated.
3. **AGENTS.md source chain**: the installer copies
   `plugins/kimi-rules/templates/KIMI.md.template` → `~/.kimi-code/AGENTS.md`
   and merges the rules corpus between fences (`scripts/lib/install/agents-md.ts`).
   The root `KIMI.template.md` is an identical legacy duplicate of that template.
4. **Hook commands**: every hook in a `kimi.plugin.json` must invoke
   `kimi-hook-shim.mjs` — enforced by `scripts/lib/validate-checks.ts`.
5. **Harness floor**: `package.json` `fusengine.harnessMinVersion` (currently
   0.1.115 — English user messages, wider security-scan coverage, bounded
   cartographer reads, stop gates + report recovery incl. background agents,
   scratchpad redirect, `rm -r` in temp dirs asks instead of blocking, `&>`
   redirect handling, PRD patch handling; 0.1.108 — lessons requested in
   caveman style; per-recipient injection
   registry for Claude Code only, Kimi output byte-identical; 0.1.107 — APEX
   deny lists all missing prerequisites, SOLID detection for
   react/tanstack-start/astro/java/csharp/ruby/generic per FUSE_SOLID_MAX_LINES;
   0.1.87 was the first with the native UserPromptSubmit rules compaction).
6. **Artifacts in English** (docs, comments, commits, skill/agent files);
   conversation follows the user's language.
7. Validate before declaring done: `bun run validate` + relevant `bun test`.
