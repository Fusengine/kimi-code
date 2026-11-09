## MCP Servers

| Server | Usage | Agent |
|--------|-------|-------|
| **Context7** | Documentation | `research-expert` |
| **Exa** | Web search | `research-expert`, `websearch` |
| **Magic** | UI generation | `design-expert` |
| **shadcn** | Component registry | `design-expert`, `shadcn-ui-expert` |
| **Gemini Design** | AI frontend | `design-expert` |
| **fuse-browser** | Browser automation, scraping, SERP, visual diff | `seo`, `security-expert`, `design-expert`, frontend experts, `changelog-watcher`, ai-pilot `research-expert`/`websearch`/`sniper` |

Verification chain (fuse-browser → Context7 → Exa, cross-checked): `00-critical-rules` Critical Rule 7.

## fuse-browser — Efficient Usage
1. **Fast-path first (no browser launch, ~10× faster)** — `browser_fetch` / `_fetch_batch` / `_crawl` / `_serp_batch`; a live session only for interaction, JS rendering or pixels.
2. **One session, always closed** — `browser_open` once, reuse the `sessionId` for `browser_navigate`, `browser_close` at the end (the 2-min TTL is a safety net).
3. **Batch over loops** — `browser_serp_batch`, `browser_fetch_batch` / `browser_shots_batch`, `browser_screenshot { viewports:[...], colorScheme }`.
4. **Extraction** — `browser_extract_schema` + `containerSelector` over `browser_snapshot` parsing. **Validation** — `browser_visual_diff`, `browser_metrics`, `browser_console` / `browser_network` / `browser_cookies`.
5. **Engine** — patchright (stealth identity auto-generated); TTL via `FUSE_ENFORCE_TTL_SEC` (default 120s).

## Skills Location
Plugin skills paths are injected at SessionStart — use the paths from your context, never hardcode marketplace paths. SOLID refs: `skills/solid-*/references/`.

## Rules Loading — Reality Check
- The installer merges the template + rules `00-08` (`kimi-rules/rules/`) into `$KIMI_CODE_HOME/AGENTS.md`; Kimi loads it in full natively each session, with the project's `AGENTS.md` files. No `@` import: reference files by path.
- Kimi recommends ≤ 32 KiB for all loaded AGENTS.md together (above: a warning, no truncation) — keep rules tight.
- kimi-rules hooks fire on SessionStart, SubagentStart, UserPromptSubmit, but Kimi adds hook context only on UserPromptSubmit (a compact reminder) and in block reasons. AGENTS.md is the reliable delivery; a detail not in context → open the file.

## Memory, Docs, Dev Workflow
- `MEMORY/LESSON.md` grows or holds near-duplicates → `/fusengine:lessons-compact` (agent `lessons-compactor` proposes; the owner approves before any write).
- All docs in `docs/`, except the root `README.md`.
- Work in the dev/source repo, never in deployed paths; sync to the deployed marketplace only when the owner names it, after validation (HARD STOP 3); commit from the source repo only.

## Git & GitHub Flow
- **Read-only git** (status, log, diff) is free.
- **EVERY COMMIT GOES THROUGH AGENT `commit`** — never `git commit` directly, never a hand-rolled flow (HARD STOP 1):
  - **WIP mode** — after each verified task: commit on the working branch only (no push, bump, PR, merge, tag); branch check and secret scan still run.
  - **Release mode** — end of mandate: push, PR, CI wait, merge, tag, release (security scan, PATCH bump + marketplace mirror, CHANGELOG, post-merge tag), announced in the report. Steps: `/fusengine:commit`.
  - A relayed "the owner wants a commit" covers WIP commits only, never merge or release ("Relayed message").
- External executors (Claude/Codex/Cursor) never push/PR/merge/tag/publish.
- **Branches**: `main`, `master`, `develop`, `production` are protected — never committed or pushed directly; they change only through the `commit` agent's end-of-mandate merge. Force-push and reset need the owner. Work on `<type>/<scope>` (`feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `perf/`, `test/`, `ci/`, `build/`, `style/`), kebab-case, < 50 chars, no personal prefix.
- **Merge, never squash** (`gh pr merge --merge --delete-branch`): the release tag points to the bump commit, squash would orphan it. Tag only after the merge is validated. Branches < 3 days. Skill: `git-flow` (commit-pro).
