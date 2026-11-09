---
description: Monitor CI/CD pipeline and automatically fix failures. Watches GitHub Actions runs and applies fixes when tests fail.
disable-model-invocation: false
---

# Watch CI/CD

Monitor and auto-fix CI failures:

1. **Get Latest CI Run**:
   ```bash
   gh run list --limit 1
   gh run view [RUN_ID]
   gh run view [RUN_ID] --json headBranch,event
   ```
   **Pick the fix branch now, before any fix touches the tree:**
   - **Run from a PR** (`gh pr list --head <headBranch> --state open` returns one) → the fix goes on that PR's head branch: `git switch <headBranch>` if not already on it (dirty tree → stop and report, never stash). No new PR.
   - **Run on a protected branch** (`main`/`master`/`develop`/`production`, e.g. a push run) → stay put: the commit agent's Step 0 moves the fix to a new `fix/ci-<scope>` branch and full mode opens a **new PR** for it. That is expected — say so in the report. The PR stays open (`--no-merge`); merge, tag and release happen at the end of the mandate, announced; a push to the protected branch itself needs the owner.

2. **Check Status**:
   - ✅ Success → Done
   - 🔄 In Progress → Wait (sleep 30s, check again)
   - ❌ Failed → Proceed to fix

3. **Analyze Failures**:
   ```bash
   gh run view [RUN_ID] --log-failed
   ```

   Extract:
   - Which jobs failed
   - Error messages
   - Stack traces
   - File locations

4. **Categorize Failures**:
   - **Linter Errors**: Run linters locally, fix with sniper
   - **Test Failures**: Identify failing tests, fix logic
   - **Build Errors**: Resolve compilation/build issues
   - **Dependency Issues**: Update/fix package conflicts

5. **Apply Fixes**:
   Based on failure type:
   - > Use sniper for linter errors
   - > Use research-expert for framework-specific issues
   - Fix code logic for test failures
   - Update dependencies for build issues

6. **Verify Locally**:
   ```bash
   bun run lint
   bun test
   bun run build
   ```

7. **Commit and Push** (hand-off to the commit agent):
   This command never commits, pushes, opens a PR, merges, rebases, force-pushes or tags itself.
   - **WIP commit**: launch agent `commit` with `mode: wip`, the files changed by the fix, and the summary for the message (`fix(ci): resolve CI pipeline failures` + one line per fix). It commits on the working branch only: no push, no bump, no PR, no merge, no tag.
   - **Push**: then launch agent `commit` in **full mode** (rules `06-tooling-rules`, Git & GitHub Flow) with `mode: full`, `--no-merge`, and the branch picked in step 1. Onto an existing PR, also pass `--no-bump`: each CI round would otherwise stack a PATCH bump + CHANGELOG entry on the same PR. Never on the final, merging full-mode run at the end of the mandate — that run bumps what these rounds left unbumped. It pushes, watches CI and fills `ci:` (under `--no-merge` too); no merge here — the merge, tag and release happen at the end of the mandate, announced (D4) (merge is always a real `--merge`, never squash; a force-push needs the owner).
   - Blocked (secret in the diff, push rejected) → it stops with `status: blocked`; go back to step 3 with its report. Red CI is not a block: it reports `status: left-open`, `ci: failed:<check>` → step 8.

8. **Monitor New Run**:
   Read the `ci:` line of the commit agent's report; `failed:<check>` → repeat from step 3 (the next push passes `--no-bump`: the PR exists now). `watched-and-passed` / `no-checks-verified` → done. Empty or missing `ci:` → not verified: run `gh pr checks <pr> --watch` yourself before concluding.

**Arguments**:
- $ARGUMENTS can specify specific job to watch

**Example Usage**:
- `/watch-ci` → Monitor latest CI run
- `/watch-ci test` → Watch only test jobs
