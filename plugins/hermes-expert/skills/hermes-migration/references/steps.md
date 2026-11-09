# Migration steps - commands and checks

Run on the server only after the owner's go for that step. Replace
`<profile>` for each profile (`hermes profile list`). Commands are from the
0.23.0 CLI reference; confirm with `--help` on the installed version.

## 1. Backup

```bash
hermes backup -o <backup dir>/hermes-full-<date>.zip    # full: config, skills, sessions, data
echo $?                                                  # 0 = complete, 1 = incomplete, 2 = already running
hermes backup --quick --label "pre-migration"            # fast state snapshot as a second restore point
hermes -p <profile> cron list > <backup dir>/cron-<profile>.txt
```

Also copy files outside the Hermes home that hold the old workflow: the
workspace `.hermes.md` / `AGENTS.md`, workflow documents, send scripts.
Restore path: `hermes import <zip>` (overwrites files in the Hermes home;
it asks for confirmation when an install exists).

## 2. New SOUL and workflow

- Chief SOUL.md from hermes-chief-of-staff `templates/soul-rules.md`;
  one per manager profile.
- Shared rules in `.hermes.md` at each workspace root (hermes-workspace).
- Long procedures of the old workflow → skills loaded on demand, not SOUL.
- Then `hermes sessions refresh-prompts` (per profile with `-p`).
- Check: `hermes prompt-size` per profile (measures.md).

## 3. Outbound control

Apply the go gate and the checklist (hermes-outbound, hermes-security):
`approvals.deny` for direct send commands, `approvals.cron_mode` per
hermes-security `approval-model.md`, no
send credential in the agent profile, exact preview then "Go ?". Audit the
send mechanism already on the server (sends only after an explicit go? from
which account?) and report; never install a replacement - no mechanism →
owner decision. Check: try a send without a go on a test address - it must
be refused.

## 4. Registry and status sheets

From existing cards (`hermes kanban list` if Kanban is used) and dossiers:
one README per open dossier (hermes-workspace template), one registry entry
per open promise or pending "Go?" (hermes-rhythm). Show the list to the
owner once to confirm.

## 5. Rhythm jobs

Create or edit jobs from hermes-rhythm `templates/cron-jobs.md`. Merge
duplicates of the old jobs (`hermes cron edit` or `remove`). Check:
`hermes cron list`, `hermes cron doctor`, one `hermes cron run <name>`.

## 6. Seal check

Run the checks in hermes-chief-of-staff `partition.md`: `.env` names per
profile, board/tenant per card, grep company roots for private markers,
`terminal.cwd` per profile. Any crossing → fix before step 9.

## 7. Voice

Pick a new primary TTS provider, add a tested backup (pattern, not
built-in), rewrite voice replies for the ear. Health check and fallback:
hermes-gateways. Check: force the primary to fail on a test profile and
confirm the backup speaks and the incident is reported.

## 8. Decisions channel and daily reset

Move machine notifications to the decisions channel (delivery targets of
pilot check, triage, cleanup). Daily reset: `hermes plugins install
hermes-session-reset-policy` or the `/new` habit (hermes-rhythm,
hermes-core). Check: `hermes doctor` no longer warns about `session_reset`.

## 9. Test day and "after"

[test-day.md](test-day.md), then re-run every measure in
[measures.md](measures.md) and fill the table.

## Rollback

Any step that breaks a check: stop, restore that step's files from the
backup (or `hermes import` the full zip), re-run the check, then retry with
a different approach. Never stack a fix on a broken step.

## Sources

- https://hermes-agent.nousresearch.com/docs/reference/cli-commands
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ (Session continuity)
