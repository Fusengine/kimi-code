---
description: Execute GitHub issues using full EPCT workflow (Explore-Plan-Code-Test). Converts issue requirements into completed PR.
disable-model-invocation: false
---

# Run GitHub Issue Tasks

Execute GitHub issue with complete EPCT workflow:

1. **Fetch Issue Details**:
   ```bash
   gh issue view $ARGUMENTS
   ```

   Extract:
   - Issue title and description
   - Acceptance criteria
   - Labels and priority
   - Related issues/PRs

2. **Execute EPCT**:
   Run `/epct [ISSUE_TITLE]` workflow:

   **EXPLORE**: Understand affected components
   **PLAN**: Design solution
   **CODE**: Implement changes
   **TEST**: Validate implementation

3. **Create Branch**:
   ```bash
   git checkout -b issue-$ISSUE_NUMBER-[slug]
   ```

4. **WIP Commit** (hand-off to the commit agent):
   Launch agent `commit` with `mode: wip`, the files changed for the issue, and the summary for the message (`feat: [ISSUE_TITLE]`, body `Fixes #$ISSUE_NUMBER` + one line per change). It commits on the working branch only: no push, no bump, no PR, no merge, no tag.

5. **Create PR** (hand-off to the commit agent):
   This command never pushes, opens a PR, merges, rebases, force-pushes or tags itself. Once EPCT's TEST phase is green, launch agent `commit` in **full mode** (rules `06-tooling-rules`, Git & GitHub Flow):
   - Brief it with: `mode: full`, `--no-merge`, the files of the issue, the PR title `Fixes #$ISSUE_NUMBER: [TITLE]` and this body:
   ```markdown
   ## Summary
   Resolves #$ISSUE_NUMBER

   ## Changes
   [List of changes]

   ## Test Plan
   [How tested]
   ```
   - It pushes the branch, opens the PR and waits for CI; no merge here — the merge, tag and release happen at the end of the mandate, announced (D4) (merge is always a real `--merge`, never squash).
   - Blocked (secret in the diff, push rejected) → it stops with `status: blocked`; fix through EPCT, hand off again. CI red → `status: left-open`, `ci: failed:<check>`: fix through EPCT, hand off again.

6. **Link Issue**:
   ```bash
   gh issue comment $ISSUE_NUMBER --body "PR created: [PR_URL]"
   ```
   `[PR_URL]` = the `pr:` line of the commit agent's report.

**Arguments**:
- $ARGUMENTS = GitHub issue number

**Example Usage**:
- `/run-tasks 42` → Execute issue #42 with full workflow
