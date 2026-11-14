---
description: Check and update the @fusengine/harness that every Kimi Code plugin hook runs — shows installed vs required vs latest version, and moves it via setup.sh (or lets the SessionStart auto-update do it).
disable-model-invocation: false
---

# Update Harness

One shared `@fusengine/harness` install runs every Fusengine hook (through `kimi-hook-shim.mjs`). Kimi's plugin manager copies plugin files only, so a plugin update never moves the harness: either the installer stages it, or the SessionStart auto-update does.

**Where it lives** (`KIMI_HOME` = `$KIMI_CODE_HOME`, default `~/.kimi-code`). The shim runs the first one that exists:
1. `$KIMI_HOME/harness-current/dist/cli/bin.mjs` — symlink into `$KIMI_HOME/harness-versions/<version>-<ts>/`, written by the auto-update.
2. `$KIMI_HOME/node_modules/@fusengine/harness/dist/cli/bin.mjs` — legacy dir, written by `setup.sh`.

**What moves it**
- `setup.sh` runs `bun run scripts/install-kimi.ts --yes`, whose `installRuntimeDeps` step runs `bun add @fusengine/harness@>=<floor>` then `bun update @fusengine/harness` in `$KIMI_HOME` (so you land on the newest version within the range), and then removes `harness-current` so the pointer cannot shadow the fresh install.
- Automatically, on SessionStart only: when the installed version is strictly below the floor (`fusengine.harnessMinVersion`), a detached worker stages `@fusengine/harness>=<floor>` under `harness-versions/` and switches `harness-current` with one atomic symlink rename. A harness already at or above the floor is never touched (so the auto-update never goes to "latest"). A failed install pauses retries for 30 min (`FUSE_ENSURE_DEPS_BACKOFF_MIN`). No auto-update on win32.

## Steps

1. **Read installed, required and latest versions** (read-only):
   ```bash
   KIMI_HOME="${KIMI_CODE_HOME:-$HOME/.kimi-code}"
   for d in harness-current node_modules/@fusengine/harness; do
     [ -f "$KIMI_HOME/$d/package.json" ] && echo "$d: $(grep -m1 '"version"' "$KIMI_HOME/$d/package.json")"
   done                                                                              # installed (first line = the one the shim runs)
   grep -n harnessMinVersion "$KIMI_HOME/plugins/managed/fusengine/package.json"     # floor of the installed plugin suite
   npm view @fusengine/harness version                                               # latest published
   ls -la "$KIMI_HOME"/.harness-update.log "$KIMI_HOME"/.harness-update-paused 2>/dev/null   # pending auto-update note / back-off stamp
   ```
   If `$ARGUMENTS` is a version (e.g. `0.1.119`), that is the target; otherwise the target is the latest published.

2. **Stop if nothing to do**: installed >= target (and >= floor) → report "already on X.Y.Z", done.

3. **Update the harness** (user path, writes to `$KIMI_HOME`):
   ```bash
   "$KIMI_HOME/plugins/managed/fusengine/setup.sh"                                   # newest version within >=floor
   FUSENGINE_HARNESS_VERSION=0.1.119 "$KIMI_HOME/plugins/managed/fusengine/setup.sh" # pin an exact spec instead
   ```
   `FUSENGINE_HARNESS_VERSION` overrides the floor-based spec (`harness-version.ts`). On Windows run `setup.ps1`. To preview without writing, run the installer's default dry-run from the suite repo: `bun run install` (it prints `bun add @fusengine/harness@>=<floor>`; `--yes` applies).
   If the installed version is below the floor you can instead start a new Kimi Code session and let the SessionStart auto-update stage it, then check again (step 4) after a minute.

4. **Verify** the install actually moved (re-run the step 1 loop): the first listed version must be >= the target. If a `.harness-update.log` note exists it says why an auto-update failed; if `.harness-update-paused` is recent, retries are paused until the back-off ends (`FUSE_ENSURE_DEPS_BACKOFF_MIN`, default 30) — run `setup.sh` instead.

5. **Report**: `installed X.Y.Z → Y.Y.Z`, the floor, and any `.harness-update.log` note.

## Maintainer: raise the floor

Run from the source repo (never edit a plugin's copy of the shim files):
1. Edit `package.json` → `fusengine.harnessMinVersion` (the single source of truth).
2. `bun run scripts/apply-core-overrides.ts` — regenerates `harness-floor.json` (`{"harnessMinVersion": "<floor>"}`) in every `plugins/*/scripts/` and re-copies the shim files; a bump without this re-sync fails `shipped-modules.test.mts`.
3. `bun run validate` (must end `26/26 plugins valid.`) and `bun test scripts/tests/`.
4. Commit through the commit agent. Existing installs pick the new floor up after a plugin update + new session (auto-update) or `setup.sh`.
5. Prove the live layer runs the new version: the first version printed by step 1 on a real install must be >= the new floor — a "cache hit" in hook output proves nothing.

**Notes**:
- This command never runs `npm publish`: publishing a harness version is a separate step in the harness repo.
- `FUSENGINE_HARNESS_SRC` (local dir) and `FUSENGINE_HARNESS_INSTALL_CMD` (needs `FUSENGINE_TEST=1`) exist for hermetic tests only; do not use them on a real install.

**Arguments**:
- `$ARGUMENTS` — optional target version (e.g. `0.1.119`). Empty → latest published.

**Example Usage**:
- `/update-harness` → show installed / floor / latest, update via `setup.sh` if behind
- `/update-harness 0.1.119` → pin to a specific version
