---
description: Smart conventional commit with security validation, branch flow enforcement, and auto-detection. Use for git commit, commit changes, save work, stage and commit.
argument-hint: "[message] | [type scope message] | (empty for auto-detection)"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(git tag:*), Bash(git push:*), Bash(git pull:*), Bash(git describe:*), Bash(git branch:*), Bash(git checkout:*), Bash(git rev-parse:*), Bash(git remote:*), Bash(git merge-base:*), Bash(git fetch:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh pr merge:*), Bash(gh pr checks:*), Bash(gh pr edit:*), Bash(gh auth:*), Bash(gh run list:*), Bash(gh run watch:*), Bash(gh run view:*), Bash(gh run rerun:*), Bash(git rev-list:*), Bash(npm view:*), Bash(command:*), Read, Edit
disable-model-invocation: false
---

# Smart Conventional Commit

## Current State

!`git status`

## Staged Changes

!`git diff --staged --stat`

## Recent Commits (style reference)

!`git log --oneline -5`

## Current Branch

!`git branch --show-current`

## Instructions

Based on the context above, create a professional commit.

### Step 0: Branch Check (GitHub Flow enforcement)

Read current branch from above.

**If current branch is `main`, `master`, `develop`, or `production`:**

BLOCK direct commits and propose a feature branch:

```text
🌿 Branch Protection
───────────────────────────────
Current: <branch>
Issue: Direct commits to protected branches discouraged (GitHub Flow)
───────────────────────────────

Pre-detect commit type/scope from staged changes (Step 2 logic) to suggest branch name:
  - feat(seo) → feat/seo
  - fix(sniper) → fix/sniper
  - chore(deps) → chore/deps

Proposed branch: <type>/<scope-or-summary>

Options:
  Y → Create branch + continue commit
  N → Abort
  C → Custom branch name
```

If user accepts → execute `git checkout -b <branch>` then proceed to Step 1.
If user declines → STOP, do not commit.

**If current branch already a feature branch** (e.g. `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`, `perf/*`, `test/*`, `ci/*`, `build/*`, `style/*`) → skip to Step 1 directly.

**Exceptions** (allow direct commit on main):
- Repo has only `main` branch and no remote (solo prototype)
- User explicitly passes `--no-branch-check` in `$ARGUMENTS`
- Commit type is `chore` AND scope is `release` or `version` (post-commit bump commits)

### Step 1: Security Check

BLOCK and output if secrets detected:

```text
🔒 Security Alert
───────────────────────────────
Found: [file or pattern]
Action: Commit blocked
Fix: Remove sensitive data before committing
```

Check for:
- `.env`, `.env.*` files
- Patterns: `password=`, `secret=`, `api_key=`, `token=`
- Files: `*.pem`, `*.key`, `*credentials*`

### Step 2: Analyze and Detect

Output analysis:

```text
📊 Analysis
───────────────────────────────
Files changed: [X]
Files staged: [Y]
Pattern detected: [type]
```

### Step 3: Generate Message

Format: `type(scope): imperative description`

**FORBIDDEN (NO AI SIGNATURE):**
- NEVER add "Co-authored-by: Kimi" or any AI mention
- Commit must appear 100% human-written

### Step 4: Propose Commit

Output proposal:

```text
📝 Proposed Commit
───────────────────────────────
type(scope): description

[body if needed]
───────────────────────────────

⚡ Ready to commit? [Y/N/E]
```

### Step 5: Execute and Confirm

On confirmation, execute and output:

```text
✅ Committed successfully
───────────────────────────────
Hash: [short-hash]
Message: type(scope): description
Files: [X] changed
```

Execute with HEREDOC format:

```bash
git commit -m "$(cat <<'EOF'
type(scope): description
EOF
)"
```

If $ARGUMENTS provided, use as hint for the message.

### Step 6: Post-Commit (universal)

After step 5 succeeds, execute the `post-commit` skill (CHANGELOG + version bump only — **no tag here**, see Step 8 for why).

This runs for ALL repos — the skill auto-detects the repo type internally.

**Bump range**: the skill's Step 0 block decides (single source — do not restate it here): `--no-bump` in `$ARGUMENTS` → skipped; branch already bumped with nothing new since → skipped; otherwise bumps what changed since the last bump (or since the fork point). A re-push round on the same PR never stacks a bump; a plugin changed after the first bump is never merged unbumped.

### Step 7: Auto-Release (push + PR + CI watch + merge)

#### Step 7.0: Base branch + release target (every mode, on the current branch, BEFORE any push or merge)

`gh pr merge --delete-branch` switches to the base branch and deletes the local feature branch, so the release target is captured here, while the branch is still checked out and not yet merged. Self-contained: it relies on no variable from another step or shell.

```bash
# Base branch: caller's PR_BASE > the open PR's base > remote default branch > first local main/master/develop
base_branch="${PR_BASE:-$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null)}"
[ -n "$base_branch" ] || base_branch="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)"
base_branch="${base_branch#origin/}"
if [ -z "$base_branch" ]; then
  for b in main master develop; do
    git rev-parse --verify --quiet "refs/heads/$b" >/dev/null && { base_branch="$b"; break; }
  done
fi
git fetch --quiet origin "$base_branch" 2>/dev/null
# Fork point; HEAD on the base branch itself (LOCAL solo repo) → last commit only
fork="$(git merge-base HEAD "origin/$base_branch" 2>/dev/null || git merge-base HEAD "$base_branch" 2>/dev/null)"
[ "$fork" = "$(git rev-parse HEAD)" ] && fork="$(git rev-parse -q --verify HEAD~1)"
# Release target = the last bump commit in fork..HEAD only (never older history)
bump_line=""
[ -n "$fork" ] && bump_line="$(git log -1 -E --format='%H %s' --grep='^chore: (bump marketplace and CHANGELOG|update CHANGELOG) to [0-9]+\.[0-9]+\.[0-9]+$' "$fork..HEAD")"
bump_sha="${bump_line%% *}"
version="$(printf '%s\n' "$bump_line" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+$')"
echo "base_branch=$base_branch bump_sha=${bump_sha:-none} version=${version:-none}"
```

`bump_sha` empty → no tag in Step 8 (`--no-bump` on every run, or nothing bumped on this branch). Shell variables do not survive a new shell: the echoed line is the record — if Step 8 runs in another shell, set these three values literally from it first.

After that, if current branch is a feature branch (not main/master), run the **remote-flow decision tree** below — **no Y/N prompts** in FULL mode.

#### Remote-flow decision tree (run first, every time)

```
git remote -v
```

- **Empty output → LOCAL mode.**
  No remote at all. STOP after Step 6 — do not push, do not open a PR, do not merge.
  In this mode, tag right away (see Step 8, LOCAL/DEGRADED branch): local `git tag` only, never pushed automatically.
  Output explicitly:
  ```text
  📍 No remote configured — remote ritual skipped (push/PR/merge).
  Manual commands for later:
    git remote add origin <url>
    git push -u origin <current-branch>
    gh pr create --base <base_branch> --title "<subject>" --body-file - <<'EOF'
    <body>
    EOF
    (after merge) git tag vX.Y.Z <bump_sha> && git push origin vX.Y.Z
  ```

- **Non-empty output → a remote exists.** Check tooling next:
  ```bash
  command -v gh        # exit 0 = gh installed
  gh auth status        # exit 0 = authenticated
  ```
  - **`gh` missing OR `gh auth status` fails → DEGRADED mode.**
    Still push the branch (git itself doesn't need `gh`):
    ```bash
    git push -u origin <current-branch>
    ```
    Then STOP — skip PR creation/merge/watch entirely. Never fail silently: state exactly which check failed (`gh` not installed vs. not authenticated) and print the manual commands the user must run once `gh` is available (PR create with `--body-file -` on stdin, merge with `--merge`, then the Step 8 tag sequence). Tag locally per Step 8's LOCAL/DEGRADED branch.
  - **`gh` present and authenticated → FULL mode.** Proceed with steps 1-4 below.

  In both branches, the first push always uses `-u`: this transparently covers the case where the current branch has no upstream yet (first push sets it) and is a no-op if upstream already exists.

#### FULL mode steps (remote + `gh` OK)

1. **Push branch**:
   ```bash
   git push -u origin <current-branch>
   ```
2. **Create the PR if absent** (else reuse the existing one), body piped via `--body-file -` on stdin — never inline in `--body`, to avoid quoting/escaping issues, and no temp file to write or clean up:
   ```bash
   gh pr view --json url -q .url 2>/dev/null || gh pr create --base "$base_branch" --title "<commit subject>" --body-file - <<'EOF'
   ## Summary
   - <bullets from commit body>

   ## Changes
   <major changes>

   ## Test plan
   - [x] / [ ] as applicable

   ## Breaking changes
   None / <description>
   EOF
   ```
3. **CI watch — always, `--no-merge` included** (it is what fills the report's `ci:` line; a caller looping on red CI reads it). Checks take a few seconds to register after `gh pr create`/a push — never `--watch` immediately ([cli/cli#7401](https://github.com/cli/cli/issues/7401)): poll until checks register (bounded, ~90s), THEN watch. **Never pipe** the `--watch` call itself (e.g. `| tail`): a pipe swallows the exit code.
   ```bash
   pr=<pr>
   max_attempts=18   # 18 × 5s ≈ 90s
   attempt=0
   until gh pr checks "$pr" 2>&1 | grep -qv "no checks reported"; do
     attempt=$((attempt + 1))
     [ "$attempt" -ge "$max_attempts" ] && { echo "Timeout: no checks registered — verify before treating as zero-CI." >&2; break; }
     sleep 5
   done
   gh pr checks "$pr" --watch
   ci_rc=$?
   ```
   `ci_rc` 0 → `ci: watched-and-passed`. Non-zero → `ci: failed:<check>` (name it from `gh pr checks "$pr"`). Poll timed out → verify zero CI (no workflow under `.github/workflows/` triggers on `pull_request`/`push`) → `ci: no-checks-verified`; otherwise report the timeout, never assume zero CI.
4. **Merge** — skipped under `--no-merge` (stop after step 3, PR left open). Real merge commit, **never squash** (squash rewrites the branch's commits into a brand-new one on `main`; a `--merge` commit keeps them intact). The release tag points to the bump commit; merge (never squash) keeps it in main's history — squash would orphan it. Full rationale: `git-flow` skill's "CI Gate Before Merge" section. Branch on **whether required status checks are configured** (`gh pr merge --auto` only ever waits for *required* checks — on a repo where checks run but aren't required, `--auto` merges immediately without waiting):
   1. **Required checks configured** (verify: `gh pr checks <pr> --required` returns checks, not `no required checks reported`) → the only case `--auto` actually gates, no race:
      ```bash
      gh pr merge <pr> --auto --merge --delete-branch
      ```
   2. **Checks exist but none are required** → don't use `--auto` here (it wouldn't wait). Gate on step 3's exit code, so the merge only runs if checks passed:
      ```bash
      [ "$ci_rc" -eq 0 ] && gh pr merge "$pr" --merge --delete-branch
      ```
   3. **Repo has no CI checks at all** (step 3 reported `no-checks-verified`), merge immediately:
      ```bash
      gh pr merge <pr> --merge --delete-branch
      ```
   A non-required check never blocks the merge — only *required* checks gate; mark CI checks required in branch protection so case 1 has teeth.
5. Output PR URL + `ci:` + merge status. On successful merge, proceed to **Step 8** to create/push the release tag on the bump commit captured in Step 7.0.

**Leave the PR OPEN (push + PR + CI watch, do NOT merge, skip Step 8's push) if**:
- User passes `--no-merge` in `$ARGUMENTS`
- CI checks **FAIL** → report the failing check, leave PR open for the user
- Branch protection rejects the merge → report, leave open

**Skip PR/merge (stay in LOCAL/DEGRADED behavior) if**: `--no-pr` in `$ARGUMENTS`, or branch already merged.

### Step 8: Release Tag — timing depends on the Step 7 mode

The release tag points to the **bump commit** captured in Step 7.0 (`base_branch`, `bump_sha`, `version`), never to the merge commit or the base branch's tip. Never re-read it here: after the merge the feature branch may be gone and the base branch carries other releases' bumps. Empty `bump_sha` → no tag.

#### FULL mode (remote + `gh` OK) — tag only after a validated merge

Only runs once Step 7 actually merged the PR (never before — a tag created before the merge is validated could end up on a commit that CI rejects or that never reaches the base branch). Every step is chained: any failure prints `TAG FAILED` and stops, never ✅. An existing tag is accepted only if it already points at `bump_sha` (idempotent re-run).

```bash
if [ -z "$bump_sha" ]; then
  echo "no tag: no bump commit between the fork point and HEAD (Step 7.0)"
else
  git checkout "$base_branch" && git pull --ff-only origin "$base_branch" && git fetch --prune \
    && { git merge-base --is-ancestor "$bump_sha" "$base_branch" || { echo "bump commit $bump_sha not in $base_branch (merge not landed?)" >&2; false; }; } \
    && { existing="$(git rev-parse -q --verify "refs/tags/v$version^{commit}")"
         if [ -z "$existing" ]; then git tag "v$version" "$bump_sha"
         elif [ "$existing" != "$bump_sha" ]; then echo "v$version already exists on $existing, not on $bump_sha" >&2; false; fi; } \
    && git push origin "v$version" \
    && [ "$(git rev-list -n1 "v$version")" = "$bump_sha" ] \
    && echo "v$version -> bump commit $bump_sha, on $base_branch ✅" \
    || { echo "TAG FAILED: v$version -> $bump_sha on $base_branch (see the error above)" >&2; false; }
fi
```

**Why the tag waits for post-merge**: the merge strategy is `--merge` (real merge commit, never `--squash`), so the branch's commits — including the bump commit — do land on `main` intact once the merge succeeds. The risk this guards against isn't squash-orphaning, it's *sequencing*: a tag pushed before Step 7 confirms the merge could point at a commit that CI later fails, or that branch protection blocks from ever reaching `main`. Waiting for a validated merge, then verifying with `git merge-base --is-ancestor`, keeps the tag meaningful.

#### LOCAL mode (no remote) / DEGRADED mode (no `gh`) — tag locally, never auto-push

There is no PR/merge to wait for, so tag the bump commit captured in Step 7.0 right away:

```bash
[ -n "$bump_sha" ] && git tag "v$version" "$bump_sha"
```

Do **not** run `git push origin vX.Y.Z` automatically — there is either no remote to push to, or no confirmed merge yet. Print the manual command for the user to run once the remote/`gh` prerequisite is met and the change has actually landed on `main`.

Output tag verification (FULL mode) or the manual push reminder (LOCAL/DEGRADED mode) alongside the PR URL + merge status from Step 7.

### Step 9: Release Workflow — watch it to the end (FULL mode only, conditional)

The release ends at the registry, not at the tag — **when the repo has a tag-triggered release workflow** (e.g. `Publish` to npm). Full procedure: `skills/git-flow/references/release-workflow.md`.

1. Verify, never assume: no `.github/workflows/` directory, or no workflow with an `on: push: tags` trigger → `publish: none`; nothing to watch, stop here (this is the case for repos without CI).
2. Otherwise find the tag's runs (`gh run list --commit "$(git rev-list -n1 vX.Y.Z)" --event push`, polled ~90s, they register late) and `gh run watch <id> --exit-status` each one, never piped.
3. Failure → `gh run view <id> --log-failed` at once. Flaky (threshold just over its limit, network/registry timeout, runner crash — not caused by the diff) → `gh run rerun <id> --failed`, max 2 reruns, then escalate. Real defect (compile/type/lint, deterministic test, auth, same failure twice) → stop, never rerun; report run URL, job, step and the log lines that prove the cause.
4. Announce "published" only when the final attempt is fully green (post-publish verify jobs included) **and** the registry serves X.Y.Z (`npm view <pkg> version` or the matching registry query). Until then: `tagged, publish pending` or `publish failed:<job>`.
