---
name: hermes-migration
description: Use when moving an existing Hermes Agent install to a chief-of-staff operating model - back up the current SOUL, workflow, config and cron jobs, rebuild around the eight rules, add outbound control, build the commitments registry from existing cards, add the rhythm jobs, verify private/company sealing, fix voice with a tested fallback, set the decisions channel and daily reset, run a real test day, and measure before/after (instruction size, tokens re-read per call, failures, broken promises). Not for upgrading Hermes versions (hermes-core) or first installs (hermes-core, hermes-deploy).
---


<objective>
Migrate a live Hermes install without losing anything and without a step the
owner cannot undo: measure first, back up, rebuild the instructions around
rules, add the missing controls and rhythm, verify the seal, prove it on a
real day, measure again. Every step is reversible and waits for the owner's
go.
</objective>

# Hermes Migration

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## The sequence

| # | Step | Owner skill | Reversible by |
|---|------|-------------|---------------|
| 0 | Measure "before" | [measures.md](references/measures.md) | read-only |
| 1 | Back up SOUL, workflow, config, cron, every profile | this skill | `hermes import <zip>` |
| 2 | New SOUL and `.hermes.md` around the eight rules, company and private | hermes-chief-of-staff | restore files from backup |
| 3 | Outbound control before every external email/document | hermes-outbound, hermes-security | restore the previous `approvals.deny` / SOUL.md from backup |
| 4 | Status sheets + commitments registry from existing cards and dossiers | hermes-rhythm, hermes-workspace | delete the registry file |
| 5 | Rhythm jobs: add brief + monthly, redo evening + weekly | hermes-rhythm, hermes-cron | `hermes cron pause/remove` |
| 6 | Verify private/company sealing on folders and agents | hermes-chief-of-staff (partition) | read-only |
| 7 | Voice: new provider, tested fallback, speech written for the ear | hermes-gateways | restore `tts.*` block |
| 8 | Decisions channel + daily fresh context | hermes-rhythm, hermes-core | restore previous delivery targets |
| 9 | Real test day, then measure "after" | [test-day.md](references/test-day.md) | - |

Commands and checks per step: [steps.md](references/steps.md). Tick list:
[templates/migration-checklist.md](references/templates/migration-checklist.md).

## Critical rules

1. **Measure before touching anything.** Without a "before", no claim of
   improvement holds.
2. **Back up every profile**, not only the chief; check the backup's exit
   status (0 = complete).
3. **One step, one go.** Show the diff of each step; apply after the owner's
   go; never chain steps silently.
4. **Edit SOUL.md, then refresh live sessions** with
   `hermes sessions refresh-prompts` (otherwise continuing sessions keep the
   old prompt).
5. **State what is not native**: outbound go gate, voice fallback, daily
   reset, multi-mailbox - each is a pattern from its owning skill.
6. **The test day is real traffic**, not a demo: brief, three typical
   requests, evening review.

## Sources

- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes backup`, `hermes import`, `hermes prompt-size`, `hermes sessions`, `hermes insights`, `hermes logs`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ (Session continuity)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
