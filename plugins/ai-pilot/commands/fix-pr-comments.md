---
description: Systematically resolve Pull Request review comments using gh CLI to fetch comments and apply requested changes.
disable-model-invocation: false
---

# Fix PR Comments

Systematically address all PR review comments:

1. **Fetch PR Comments**:
   ```bash
   gh pr view [PR_NUMBER] --comments
   gh api repos/{owner}/{repo}/pulls/[PR_NUMBER]/comments
   ```

2. **Categorize Comments**:
   - **Must Fix**: Blocking issues (security, bugs, breaking changes)
   - **Should Fix**: Code quality, performance, best practices
   - **Nice to Have**: Style preferences, minor suggestions
   - **Questions**: Clarifications needed

3. **Address Each Comment**:
   For each comment:
   - Locate relevant file and line
   - Understand the requested change
   - > Use research-expert if clarification needed on best practices
   - Apply fix following project patterns
   - Mark comment as resolved

4. **Run Quality Checks**:
   > Use sniper to ensure all changes maintain code quality

   ```bash
   bun run lint
   bun test
   ```

5. **WIP Commit of the Fixes** (hand-off to the commit agent):
   Launch agent `commit` in **wip mode** on the PR's branch. Brief it with: `mode: wip`, the files changed for these comments, and the summary for the message (`fix: address PR review comments` + one line per comment fixed). It commits on the working branch only: no push, no bump, no PR, no merge, no tag.

6. **Push to the PR Branch and Notify** (hand-off to the commit agent):
   This command never pushes, opens a PR, merges, rebases, force-pushes or tags itself. Once the quality checks are green, launch agent `commit` in **full mode** (rules `06-tooling-rules`, Git & GitHub Flow):
   - Brief it with: `mode: full`, `--no-merge`, `--no-bump`, the existing PR number and its head branch, the files of the fix. `--no-bump`: each review round would otherwise stack a PATCH bump + CHANGELOG entry. Never on the final, merging full-mode run at the end of the mandate — that run bumps what these rounds left unbumped. It pushes to that PR's branch, watches CI and fills `ci:`; no new PR, no merge here — the merge, tag and release happen at the end of the mandate, announced (D4) (merge is always a real `--merge`, never squash; a force-push needs the owner).
   - Blocked (secret in the diff, push rejected) → it stops with `status: blocked`; fix, re-run step 4, hand off again. Red CI → `ci: failed:<check>` with the PR left open: fix, re-run step 4, hand off again.
   - Once it reports the push, notify the reviewers:
   ```bash
   gh pr comment [PR_NUMBER] --body "✅ All review comments addressed"
   ```

**Arguments**:
- $ARGUMENTS specifies PR number or focuses on specific comment type

**Example Usage**:
- `/fix-pr-comments 123` → Fix all comments for PR #123
- `/fix-pr-comments` → Fix comments for current PR
