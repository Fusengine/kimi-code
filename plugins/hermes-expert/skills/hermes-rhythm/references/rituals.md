# Rituals

Each ritual answers one question for the owner. Keeping them separate and
short is what makes them read; a combined daily wall of text gets skipped.

## Morning brief - "what needs me today?"

Order is fixed so the owner can stop reading at any line:

1. **Urgent** - due within 48 h, a client blocked, money waiting, a legal
   deadline. Each item ends with the one action proposed.
2. **Decisions waiting** - every open "Go?" from the registry, oldest first,
   with how long it has waited.
3. **Company** - movement on dossiers, stalled items with a proposal.
4. **Private** - same, only in the owner's private conversation (see
   partition in hermes-chief-of-staff).
5. **Agenda** - today's appointments, read from the calendar tool.

One-minute read. Tag each line company/private. Format:
[templates/brief-format.md](templates/brief-format.md).

## Pilot check - "is anything stuck?"

Runs during the day. Lists cards blocked or past due (`hermes kanban list
--status blocked`, or the registry), chases the manager on the card, and
delivers finished work. Replies `[SILENT]` when nothing changed.

## Evening review - "what moved today?"

Three blocks: **Done** (deliverables handed over), **Left** (open, with next
step and date), **Waiting for you** (decisions). No card dump; summarise.

## Weekly review - "where are we this week?"

Client pipeline, invoices sent and unpaid, projects and promised delivery
dates, open private dossiers, goals for the week. Proposes the three things
that matter most.

## Monthly dashboard - "how is the company doing?"

Invoiced this month, unpaid with age, payroll and social charges, admin
deadlines of the month (tax, insurance, filings). Figures come from the
finance files; every figure carries its source file so the owner can check.
Mark unconfirmed figures as such - never invent a number.

## Shared rules for every ritual

- Read the registry, dossier READMEs and the board; never rely on chat
  memory.
- Reply in the owner's language and tone (profile.yaml).
- Each item proposes one next step; open questions become registry entries.
- Use `--continuity` on recurring summaries where repetition is a problem
  (the job sees its previous output and is told to avoid repeating it).
- Chain jobs with `context_from` when one ritual needs another's output
  (e.g. weekly review reads the last evening review).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (`[SILENT]`, `--continuity`, `context_from`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban (`hermes kanban list --status`)
