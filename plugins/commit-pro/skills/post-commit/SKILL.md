---
name: post-commit
description: Use when a code commit just landed (not wip/amend/undo) and CHANGELOG or plugin-version post-commit actions are needed.
---


<objective>
Runs universal post-commit actions after any non-wip/amend/undo code commit. Detects repo type: if `.kimi-plugin/marketplace.json` exists, follows the Marketplace Path (bump each modified plugin's version, bump the suite version, recompute every README shields.io badge from the filesystem, check documentation parity for newly-added plugins); otherwise follows the Standard Path (CHANGELOG only). Updates `CHANGELOG.md` with a new entry and commits the bump as a commit separate from the code change. The git tag itself is NOT created here — it is created POST-MERGE by the `commit` command's Step 8 (or locally in LOCAL/DEGRADED mode when no remote/`gh` is available).
</objective>

# Post-Commit Skill

Universal post-commit actions after a successful code commit.

## Step 0: Bump Range + Guard (run first, every time)

This block is the single source for the bump range: the `commit` command and agent point here, never restate it. `--no-bump` passed by the caller → skip this whole skill, unconditionally. Otherwise run:

```bash
# 1. Base branch: the PR's base (caller's PR_BASE, else the open PR's) > remote default > first local main/master/develop
[ -n "$PR_BASE" ] || PR_BASE="$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null)"
base_ref="${PR_BASE:+origin/$PR_BASE}"
[ -n "$base_ref" ] || base_ref="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)"
if [ -n "$base_ref" ]; then
  git fetch --quiet origin "${base_ref#origin/}" 2>/dev/null
  git rev-parse --verify --quiet "$base_ref" >/dev/null || base_ref="${base_ref#origin/}"
else
  for b in main master develop; do
    git rev-parse --verify --quiet "refs/heads/$b" >/dev/null && { base_ref="$b"; break; }
  done
fi
# 2. Fork point. None, or HEAD is on the base branch itself → old behaviour: last commit only
base="$(git merge-base HEAD "$base_ref" 2>/dev/null)"
if [ -z "$base" ] || [ "$base" = "$(git rev-parse HEAD)" ]; then
  base="$(git rev-parse --verify --quiet HEAD~1)"   # single-commit repo: empty → range = whole history (HEAD)
  if [ -n "$base" ]; then fb="HEAD~1 (last commit only)"; else fb="whole history (single-commit repo)"; fi
  echo "post-commit: no fork point from '${base_ref:-none}' -> fallback $fb" >&2
fi
# 3. Range to bump: since the branch's last bump commit, else since the fork point
bump_re='^chore: (bump marketplace and CHANGELOG|update CHANGELOG) to [0-9]+\.[0-9]+\.[0-9]+$'
last_bump="$(git log -1 --format='%H' -E --grep="$bump_re" ${base:+"$base.."}HEAD)"
since="${last_bump:-$base}"
# range = ${since:+"$since.."}HEAD ${base:+"^$base"} — written out at each use (bash and zsh alike; no word-splitting needed)
changed_plugins="$(git log --no-merges --format= --name-only ${since:+"$since.."}HEAD ${base:+"^$base"} -- plugins/ | cut -d/ -f2 | sort -u)"
new_subjects="$(git log --no-merges --format='%s' ${since:+"$since.."}HEAD ${base:+"^$base"} | grep -vE "$bump_re")"
if [ -n "$last_bump" ] && [ -z "$changed_plugins" ] && [ -z "$new_subjects" ]; then
  echo "bump: skipped (nothing since $(git log -1 --format='%h %s' "$last_bump"))"
else
  from=root; [ -n "$since" ] && from="$(git rev-parse --short "$since")"
  echo "bump: due since $from — plugins: $(printf '%s\n' "$changed_plugins" | tr '\n' ' ')"
fi
```

- `bump: skipped` → STOP, report that line. A branch already bumped with nothing new since (a CI-fix or review round that only re-pushes) never stacks a second bump.
- `bump: due` → continue. If the branch was already bumped, only what changed after that bump is bumped again (plugin B added after plugin A's bump is never merged unbumped).
- `PR_BASE`: the commit agent sets it to the branch the PR targets (`develop` in Git Flow) — `origin/HEAD` is the default branch, too far back for a PR into `develop`: other features' bump commits would land in the range.
- Steps 1, M1 read the range `${since:+"$since.."}HEAD ${base:+"^$base"}` (the `^"$base"` drops commits merged in from the base branch; plain `HEAD` in a single-commit repo); M3.5 diffs from `$base`. Never `HEAD~1` outside the fallback above. New shell → re-run this block.

## Step 1: Read the Branch's Commits

Every commit of the Step 0 range, not only the last one — a mandate lands several WIP commits. Merge commits and bump subjects are skipped; output is grouped by conventional type (oldest first within a type):

```bash
git log --no-merges --reverse --format='%s' ${since:+"$since.."}HEAD ${base:+"^$base"} \
  | grep -vE '^chore: (bump marketplace and CHANGELOG|update CHANGELOG) to [0-9]+\.[0-9]+\.[0-9]+$' \
  | awk '{ t = $0; sub(/[(:!].*/, "", t); print t "\t" $0 }' | sort -s -k1,1 | cut -f2-
```

Save these subjects for the CHANGELOG entry: one line per subject, each under its type's prefix (`references/changelog-type-mapping.md`).

## Step 2: Detect Repo Type

Check if `.kimi-plugin/marketplace.json` exists in the repo root.

- **EXISTS** → Follow **Marketplace Path** (Steps M1–M5)
- **DOES NOT EXIST** → Follow **Standard Path** (Steps S1–S2)

## Standard Path (any repo without marketplace.json)

### Step S1: Update CHANGELOG

Read the latest git tag to determine current version:

```bash
git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0"
```

Increment PATCH: `X.Y.Z` → `X.Y.(Z+1)`. Add a new entry at the top of `CHANGELOG.md` (create it with a `# Changelog` heading first if missing). Load `references/changelog-templates.md` for the exact entry format and `references/changelog-type-mapping.md` for the commit-type prefix.

### Step S2: Commit CHANGELOG

```bash
git add CHANGELOG.md
git commit -m "$(cat <<'EOF'
chore: update CHANGELOG to X.Y.Z
EOF
)"
```

STOP. Output summary. **No tag here** — it is created POST-MERGE by the `commit` command's Step 8 (or locally-only in LOCAL/DEGRADED mode when no remote/`gh` is available — see the Step 7 decision tree in `commands/commit.md`). Load `references/tag-timing.md` for the full post-merge rationale and the standalone-use exception.

## Marketplace Path (repo with .kimi-plugin/marketplace.json)

### Step M1: Detect Modified Plugins

```bash
printf '%s\n' "$changed_plugins"   # computed by Step 0 over its range
```

If no plugins modified, skip to Step M3 (still bump suite version). Skip directories without `.kimi-plugin/plugin.json`.

### Step M2: Bump Plugin Versions

For each modified plugin: read `plugins/{name}/.kimi-plugin/plugin.json`, increment PATCH (`X.Y.Z` → `X.Y.(Z+1)`), write it back. Load `references/plugin-version-bump.md` for the marketplace.json type-detection rule (`plugins[]` vs `core[]`).

### Step M3: Bump Suite Version + Recompute README Badges

Read `metadata.version` from `.kimi-plugin/marketplace.json`, increment PATCH (`X.Y.Z` → `X.Y.(Z+1)`), write it back.

Then recompute EVERY shields.io badge in `README.md` from the filesystem — never hand-maintain counts (they drift). Load `references/badge-recompute.md` for the exact count commands and `sed` replacements (version/plugins/agents/skills tokens).

### Step M3.5: Documentation Parity

For any plugin **added** in this commit, create its docs page and link it. Doc filenames are abbreviated (e.g. dir `nextjs-expert` → `docs/plugins/nextjs.md`), so match existing naming in `docs/plugins/`, not the raw dir. Load `references/plugin-docs-parity.md` for the detection command and the full per-plugin checklist.

### Step M4: Update CHANGELOG

Add a new entry at the top of `CHANGELOG.md`, using the new suite version `X.Y.Z` from Step M3 and `(plugin-name X.Y.Z)` for each bumped plugin. Load `references/changelog-templates.md` for the exact entry format and `references/changelog-type-mapping.md` for the commit-type prefix.

### Step M5: Commit the Bump

Stage all modified files:

```bash
git add CHANGELOG.md README.md .kimi-plugin/marketplace.json plugins/*/.kimi-plugin/plugin.json docs/
```

Commit with HEREDOC format:

```bash
git commit -m "$(cat <<'EOF'
chore: bump marketplace and CHANGELOG to X.Y.Z
EOF
)"
```

This MUST be a separate commit from the code changes. Never combine. **No tag here** — same post-merge rationale as Step S2. Load `references/tag-timing.md` for details.

## Version Bump Rules

- ALL commit types trigger **PATCH** bump only
- MINOR/MAJOR bumps are **manual user decisions**, never automatic
- The bump commit is always SEPARATE from code changes

## CHANGELOG Type Mapping

See `references/changelog-type-mapping.md` for the commit-type → CHANGELOG-prefix table used in Step S1 and Step M4 entries.
