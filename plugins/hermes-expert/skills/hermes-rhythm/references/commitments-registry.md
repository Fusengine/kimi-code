# Commitments registry

Promises made in chat ("I'll handle it") and questions asked ("Go?") vanish
when the context is compressed or reset. The registry moves them into a file
or onto the board, where every ritual reads them until they are closed. This
is a **pattern, not a Hermes feature**.

## What enters the registry

| Type | Enters when | Closes when |
|------|-------------|-------------|
| Promise | The chief or a manager says it will do something | The deliverable is handed over |
| Decision | A "Ready. I recommend X. Go?" is sent | The owner answers go / no / change |
| Waiting on third party | A reply, document or payment is expected | It arrives or the owner drops it |
| Deadline | A date is found in a dossier or mail | Done or explicitly dropped |

## Storage options

**A. Kanban (preferred when managers already use cards).** Each commitment
is a task; decisions are tasks in `blocked` waiting on the owner; the brief
reads `hermes kanban list --status blocked` and `--status todo`. Durable rows
in SQLite, visible to every profile on the board, comments keep history.

**B. Markdown file in the workspace** (simple, readable by the owner):
`<workspace root>/registry.md`, one line per item, read by every ritual job
(the job's `--workdir` must be the root that holds it).

```markdown
| id | type | what | who | since | due | status |
|----|------|------|-----|-------|-----|--------|
| C-014 | decision | Send follow-up to <client> (draft v2, reviewed) | chief | 2026-09-28 | - | waiting go |
| C-015 | promise | Payslip for <month> | finance manager | 2026-10-01 | 2026-10-05 | in progress |
```

Keep one registry per partition (company, private) so the seal holds.

## Rules

1. **Write at the moment of the promise**, not at the evening review.
2. **Only closure removes an item** - by delivery, an answer, or the owner
   dropping it. Silence never closes anything.
3. **Every open decision appears in every morning brief** with its age.
4. **Ageing is a signal**: an item open past its due date moves to Urgent.
5. **Corrections update the same item**, never create a new one.

## Building it on an existing install

From existing cards and dossiers (hermes-migration step 4): list open cards
(`hermes kanban list`), grep dossier READMEs for "next step" and dates, scan
the last weeks of sent replies for promises, then confirm the list with the
owner once.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban (statuses, CLI, comments)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (`--workdir`)
