# Phase C - apply, verify, roll back

Runs only after the owner's ONE go on the checklist of Phase B (relayed by
the lead when the agent runs as a sub-agent). The go covers that checklist
only. Every command runs over `ssh <alias>`, in the checklist order, and its
exit status is recorded in `<staging>/APPLY.log` (no secret values).

## 0. Re-check before the first write

Re-run `hermes --version` and pull `config.yaml` of each touched profile
again. Anything changed since Phase A → stop, redo the dry run for that
profile, ask for a new go.

## 1. Backup first (hermes-migration)

```bash
ssh <alias> 'hermes backup -o <backup dir>/hermes-full-<date>.zip; echo "exit=$?"'   # 0 = complete
ssh <alias> 'hermes backup --quick --label "pre-deploy"'
ssh <alias> 'hermes -p <profile> cron list' > <staging>/backup/cron-<profile>.txt      # every profile
```

Exit other than 0 → stop, nothing is applied. Also copy the existing
`<hermes home>/company/` tree, the `.hermes.md` / `AGENTS.md` of each workspace root and any send script into
`<backup dir>` on the server before replacing them.

## 2. Apply, in checklist order

1. Copy the staged company tree to `<hermes home>/company/` and run its
   `deploy.sh` ([company-tree.md](company-tree.md)): every business profile
   via `hermes profile install <dir> --name <name> --yes --force` (SOUL.md,
   config.yaml, skills, seeded MEMORY.md), the chief's SOUL.md + skills
   copied and its `config.snippet.yaml` merged into the live `config.yaml`.
2. `.hermes.md` → `chief_root` and each entity root (copy with `scp` to a temp
   path, then move into place); `git init` the roots the checklist marked.
3. Per changed key `hermes -p <profile> config get <key>` - a notice that
   Hermes may not read the key = unknown key → roll that profile back.
4. `.env` NAMES: values set by the owner, or copied server-side from the
   place he named so that the value never crosses the agent's output (no
   `echo`, no captured stdout, nothing in the log). Missing values are listed
   in the report, one line per name.
5. Workspace directories, `scripts_root`, `scratch_root`.
6. Send mechanism: nothing installed. The existing one (from discovery) is
   left untouched; its audit answers and any owner decision are already in
   the checklist (hermes-security `locked-send-pattern.md`).
7. Plugins the checklist requires (`hermes plugins install <name>` with the
   name verified by `hermes plugins` on this server).
8. `hermes sessions refresh-prompts` per profile whose SOUL.md changed;
   `hermes gateway restart` if config or platforms changed.
9. Cron: run the commands of each `profiles/<name>/cron/README.md` - every
   job is created paused.
10. Print every `A-COMPLETER.md` into the report's "pending" list.

## 3. Verify

```bash
ssh <alias> 'hermes config check'
ssh <alias> 'hermes doctor'; echo "exit=$?"          # exit 0 expected
ssh <alias> 'hermes -p <profile> cron list'           # every expected job, paused
ssh <alias> 'hermes -p <profile> cron run <name>'     # one canary per job, works while paused
ssh <alias> 'hermes -p <profile> cron runs <job_id> --limit 5'
ssh <alias> 'hermes -p <profile> cron resume <name>'  # only after its canary output is right
ssh <alias> 'hermes gateway status'
```

Plus: `/context` (or the checklist's equivalent) shows each `.hermes.md`
loaded from its root; a send attempt without a go is refused (locked
sender); grep the company roots for private markers (hermes-chief-of-staff
`partition.md`). A canary that delivers to the wrong target or leaks
private content stays paused and is a finding.

## 4. Roll back

Any failed check: stop, never stack a fix on a broken step.

| What broke | Return to the last green state |
|------------|--------------------------------|
| One profile's config | restore its `config.yaml` from `<backup dir>`, `hermes config check` |
| One installed profile | re-run `hermes profile install <previous company tree>/profiles/<name> --name <name> --yes --force` from the backed-up tree (user data preserved) |
| SOUL / `.hermes.md` | restore the backed-up files, `hermes sessions refresh-prompts` |
| A cron job | `hermes -p <profile> cron pause <name>` or `cron remove <name>` |
| Several things / unclear | `hermes import <zip>` (full backup; confirms before overwriting) |

Then re-run the verification, report the root cause, and prepare a
different approach as a new dry run.

## 5. Report

- host, versions (installed / latest / notes read), doctor exit before/after;
- decisions taken by the agent (with provenance) and the owner's answers;
- files and commands applied, with exit status; backup path and its exit;
- verification results per check; canaries resumed / still paused;
- pending: `.env` names without a value, unverified model ids, findings;
- rollback command ready for this deploy.

Then the test day (hermes-migration `references/test-day.md`).

## Sources

- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes backup`, `hermes import`, `hermes profile install|describe`, `hermes config check|get`, `hermes doctor`, `hermes sessions refresh-prompts`, `hermes gateway`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (`cron run`, `runs`, `pause`, `resume`, `remove`)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
