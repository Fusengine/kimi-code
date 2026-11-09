---
name: hermes-rhythm
description: Use when giving a Hermes Agent chief of staff a fixed rhythm - morning brief, daytime piloting check, evening review, weekly review, monthly dashboard, a commitments registry that resurfaces every open promise and "Go?" until closed, notifications to a dedicated decisions channel, and a daily fresh context. Not for cron flag syntax (hermes-cron), session internals (hermes-core) or adapter setup (hermes-gateways).
---


<objective>
Make the chief come to the owner at fixed times instead of waiting for
messages: what each ritual contains, how open commitments and pending
decisions survive until closed, where notifications go so they do not drown
the owner's conversation, and how the conversation starts fresh each day.
Every ritual is a Hermes cron job; this skill defines content and wiring,
hermes-cron owns the flags.
</objective>

# Hermes Rhythm

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## The rhythm

| Ritual | Default schedule | Content | Delivered to |
|--------|------------------|---------|--------------|
| Morning brief | `0 8 * * *` | Urgent · Decisions waiting · Company · Private · Agenda (one-minute read) | Owner conversation |
| Pilot check | During the day, e.g. `every 2h` | Chase blocked cards, deliver what is ready; silent if nothing | Decisions channel |
| Evening review | `0 18 * * *` | Done · Left · Waiting for the owner (no card list) | Owner conversation |
| Weekly review | `0 8 * * 1` | Pipeline, invoices, projects, open private dossiers, goals of the week | Owner conversation |
| Monthly dashboard | `0 8 1 * *` | Invoiced, unpaid, payroll and charges, admin deadlines of the month | Owner conversation |
| Daily fresh context | Once a day | Conversation reset; state lives in files, not chat | - |

Details per ritual: [rituals.md](references/rituals.md). Exact jobs:
[templates/cron-jobs.md](references/templates/cron-jobs.md).

## What is native and what is a pattern

| Piece | Status | Where |
|-------|--------|-------|
| Scheduled prompts with delivery to a platform/channel | Native (`hermes cron`) | hermes-cron |
| Silent run when nothing to report (`[SILENT]`) | Native | hermes-cron |
| Job loads `.hermes.md` rules | Native only with `--workdir` | hermes-cron |
| Commitments registry | **Pattern, not built-in** - a file or Kanban tasks read by every brief | [commitments-registry.md](references/commitments-registry.md) |
| Decisions channel | **Pattern** on native delivery targets | [decisions-and-reset.md](references/decisions-and-reset.md) |
| Daily conversation reset | **Not native since v0.22.0** - catalog plugin `hermes-session-reset-policy` or `/new` | [decisions-and-reset.md](references/decisions-and-reset.md), hermes-core |

## Critical rules

1. **Every ritual reads files, not chat history.** Registry, dossier READMEs
   and the board are the memory; the conversation can be reset daily.
2. **`--workdir` on every ritual job** so the workspace `.hermes.md` loads
   (cron jobs run detached otherwise).
3. **Stale briefs are useless** - morning brief with `--catch-up off`
   (the docs use this exact example).
4. **Nothing new = silence**, not "nothing to report" messages.
5. **Unanswered "Go?" items return in every brief** until answered.
6. **A ritual job never sends externally**; it reports to the owner. The
   chief's `approvals.cron_mode` is `approve`; sending stays blocked by
   `approvals.deny` and the go gate (hermes-security).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes cron`)
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ (Session continuity)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
