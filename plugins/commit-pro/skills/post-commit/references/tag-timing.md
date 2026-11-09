# Tag Timing Rationale

Load when: you need the full explanation for why Step S2 (Standard Path) and Step M5 (Marketplace Path) never push a git tag, and how the `commit` command's Step 8 decides when tagging actually happens.

## Standard Path (Step S2) / Marketplace Path (Step M5)

**No tag pushed here.** Under `/fusengine:commit`'s GitHub Flow, this commit lives on a feature branch that still has to pass CI and get merged (`gh pr merge --merge` — a real merge commit, never `--squash`) before it's part of `main`. Tagging and pushing the tag before that point risks tagging a commit that:

- never lands on `main` (CI fails, merge blocked by branch protection, PR closed unmerged), or
- gets superseded by review changes.

Local `git tag` creation is harmless on its own (it doesn't publish anything); the constraint that matters is that `git push origin vX.Y.Z` only runs once the merge is confirmed. That full sequencing — including local-only tagging when there's no PR to wait for — is decided entirely by Step 7/Step 8 of the `commit` command, not by this skill. See the two modes below.

## FULL mode (remote + `gh` OK)

Tag is created **and** pushed by `commit` command Step 8, only after Step 7 confirms the PR actually merged. The tag goes on the bump commit captured in Step 7.0, only once `git merge-base --is-ancestor <bump_sha> <base_branch>` succeeds (`base_branch` from Step 7.0: `main`, `master` or `develop`).

## LOCAL mode (no remote) / DEGRADED mode (no `gh` or not authenticated)

There's no PR/merge to wait for, so `commit` command Step 8 tags **locally** right after this skill's bump commit — but never runs `git push origin vX.Y.Z` automatically. The manual push command is printed for the user to run once a remote/`gh` is available and the change has actually landed on the base branch.

## Standalone Use

Standalone use of this skill outside the full `commit` flow (no PR/merge involved) may tag manually once the change is confirmed on its permanent branch.
