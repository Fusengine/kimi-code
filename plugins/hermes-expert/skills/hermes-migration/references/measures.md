# Before / after measures

A migration is justified by numbers taken the same way twice. Take every
measure before step 1 and after the test day, with the same command, the
same profile and the same period length.

| Measure | How (0.23.0) | Why it matters |
|---------|--------------|----------------|
| Instruction size | `hermes prompt-size` per profile (`--json` for scripts): system prompt total, context files, skills index, memory, tool schemas. Also `wc -c` of SOUL.md and the workspace `.hermes.md` | Fixed cost of every call; long procedures dilute the rules |
| Tokens re-read per call | `hermes insights --days 7` (usage over the period) and `hermes sessions stats`; message count of the owner's main session in `hermes sessions list` | A never-reset conversation is re-sent on every call |
| Failures | `hermes logs` (errors, gateway) over the period - count by kind (voice/TTS, delivery, tool); `hermes cron list` / `hermes cron doctor` for `delivery_failed`, failure streaks | Silent failures erode trust (e.g. a broken voice for days) |
| Broken promises | Registry: items past due or open > 7 days; before migration, count promises found in chat with no delivery | The main symptom a chief of staff must remove |
| Cards per request | Cards opened for one request including corrections (`hermes kanban list`, filter by dossier) | Target 1 card that receives corrections |
| Owner interruptions | Messages sent to the owner per day vs messages needing a decision | Protecting the owner's time |
| Initiative | Rituals delivered on time per week (`hermes cron list` last runs) | Pilot, don't wait |

## Rules

- Same window: e.g. the 7 days before step 1 and 7 days after the test day.
- Record the command output, not a summary - paste into
  [templates/measures-table.md](templates/measures-table.md) with the raw
  file next to it.
- A measure that cannot be taken the same way twice is dropped, not
  estimated.
- Token figures depend on the provider's accounting; compare like with
  like (same model) or say so.

## Sources

- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes prompt-size`, `hermes insights`, `hermes sessions stats`, `hermes logs`, `hermes cron doctor`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (delivery_failed, failure_streak)
