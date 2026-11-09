---
description: Auto-generate Pull Request with comprehensive description, test plan, and changelog. Hands push and PR creation to agent commit.
disable-model-invocation: false
---

# Create Pull Request

Generate and create a comprehensive Pull Request:

1. **Analyze Branch Changes**:
   ```bash
   git log main..HEAD --oneline
   git diff main...HEAD --stat
   ```

2. **Extract Commit Information**:
   - Parse all commit messages since branch diverged from main
   - Identify key features/fixes/changes
   - Categorize changes (Features, Bug Fixes, Documentation, etc.)

3. **Generate PR Description**:
   ```markdown
   ## Summary
   [Concise overview of changes]

   ## Changes
   - ✨ Feature: [Description]
   - 🐛 Fix: [Description]
   - 📚 Docs: [Description]

   ## Test Plan
   - [ ] Unit tests pass (`bun test`)
   - [ ] Linters pass (`bun run lint`)
   - [ ] Manual testing completed
   - [ ] [Specific test scenario]

   ## Breaking Changes
   [None / List any breaking changes]

   ## Screenshots
   [If applicable]

   ```

4. **Create PR** (hand-off to the commit agent):
   This command never pushes, opens a PR, merges, rebases, force-pushes or tags itself. Launch agent `commit` in **full mode** (rules `06-tooling-rules`, Git & GitHub Flow):
   - Brief it with: `mode: full`, `--no-merge`, the PR title, the generated description as the PR body, and the files of the branch.
   - It runs its branch check and security scan, commits anything not yet committed, bumps, pushes the branch, opens the PR and waits for CI; no merge here — the merge, tag and release happen at the end of the mandate, announced (D4) (merge is always a real `--merge`, never squash).
   - Blocked (secret in the diff, protected branch, push rejected) → it stops with `status: blocked`; report it, fix, hand off again. CI red → `status: left-open`, `ci: failed:<check>`: report it, fix, hand off again.

5. **Output PR URL**: the `pr:` line of the commit agent's report.

**Arguments**:
- $ARGUMENTS will be used as PR title or additional context

**Example Usage**:
- `/create-pull-request Add authentication` → Creates PR with title
- `/create-pull-request` → Auto-generates title from commits
