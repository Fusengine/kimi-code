# Checklists and upkeep

## End of task (every agent, before reporting done)

- [ ] Right dossier, right root (company or private).
- [ ] Received pieces untouched in `pieces/`.
- [ ] Notes in `travail/` as `.md`.
- [ ] Temporary files outside the workspace (scratch).
- [ ] Deliverable named `YYYY-MM-DD_subject_vN.ext` in `livrables/`.
- [ ] Any new reusable script in its own folder with a README.
- [ ] Nothing deleted; candidates moved to `archives/to-delete/`.
- [ ] Dossier README updated: status, next action, deadline.

Put this list in `.hermes.md` (template) so managers and employees all load
it; the manager checks it on the employees' output, the chief on the
manager's.

## The chief keeps order

- Daily: file `00-inbox/` (propose, then move what is unambiguous).
- On close: move finished dossiers to `archives/YYYY/`.
- Weekly: ask once whether to delete what waits in `to-delete/`.

## Weekly cleanup job

Runs once a week (e.g. Friday 17:00). Two parts:

1. **Safe tidy, without asking** - only reversible moves inside the same
   root: inbox items with an obvious dossier, closed dossiers to
   `archives/YYYY/`, stray temporary files to scratch, one-shot scripts to
   `to-delete/`.
2. **Ask before deleting** - list `archives/to-delete/` (path, size, age,
   why) and ask the owner. Nothing in `to-delete/` → no message
   (`[SILENT]`). Deletion only after the owner's go, through a locked script.

Template: [templates/cleanup-job.md](templates/cleanup-job.md).

"Reversible" is the test: a move inside the root can be undone; a delete, a
move across roots, or anything touching the private space cannot be
casually undone → decision path (hermes-chief-of-staff).

Back the "never deletes" rule with mechanisms, not only words: `approvals.deny`
patterns for `rm`/`find -delete` style commands in workspace profiles - they
apply whatever `approvals.cron_mode` says (the chief usually runs `approve`,
hermes-security `approval-model.md`).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/security (`approvals.deny`, `approvals.cron_mode`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (`[SILENT]`)
