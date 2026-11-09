# Learning and guardrails

## It learns

Every sender the owner confirms enters a sender memory with its category and
folder. Next time it is filed without deliberation; the proposal list still
shows it, grouped under "known senders" so the owner can skim.

Storage options (pattern):

- A file in the mail manager's workspace, e.g. `senders.tsv` with
  `address-or-domain <TAB> category <TAB> folder <TAB> confirmed-on`.
  Readable, diffable, survives memory limits.
- Hermes built-in memory is small (`memory.memory_char_limit` default 2200
  chars, configuration docs) - use it for habits, not for a sender table.
  An external memory provider plugin is an alternative (hermes-extend).

Corrections: "ok except 4 → Billing" updates the entry for that sender, and
the correction counts as the confirmation. A sender corrected twice in the
same direction is a rule; record it as such.

## It never moves anything alone

Rule: no email is moved, marked read or deleted without the owner's
validation. No answer → nothing moves.

- The triage run is **read-only**: fetch without setting `\Seen` where the
  tool allows it (e.g. IMAP `BODY.PEEK[]`; check the option of the tool in
  use), never expunge.
- Accepted answers: "ok all", "ok except <numbers>", or per-item edits.
  Anything else → ask once, then wait.
- Apply only the confirmed list, in one pass, and report what moved.
- Note: the Hermes email adapter marks existing inbox messages as seen when
  it starts and processes UNSEEN messages as conversations (email docs). Do
  not point the conversation adapter at a mailbox you want triaged
  untouched; use a read-only tool (Himalaya skill or an IMAP/MCP tool) for
  triage - see [mailbox-topology.md](mailbox-topology.md).

Enforcement: prompt rule in the mail manager's SOUL.md, plus moves and
deletes only for the confirmed list after the owner's explicit go (the go
gate in hermes-security), plus `approvals.deny` patterns for direct delete
commands of the mail tool.

## Ignored on purpose

`mail_triage.ignore_senders` in `profile.yaml`: sources the owner decided to
ignore (e.g. a noisy monitoring system). They are skipped before any check
and never appear in the report. Review the list in the weekly review.

## Silence

A run with nothing new replies `[SILENT]` (native cron delivery suppression,
cron docs). Failed runs still deliver, so a broken mailbox is noticed.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email (adapter marks existing mail seen, polls UNSEEN)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (memory limits)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (`[SILENT]`)
- https://www.rfc-editor.org/rfc/rfc9051 (IMAP4rev2, `BODY.PEEK`)
