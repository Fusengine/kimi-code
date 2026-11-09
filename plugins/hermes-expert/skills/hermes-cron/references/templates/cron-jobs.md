# Cron job recipes (Hermes 0.23.0)

Generic, copy-paste-ready. Replace every `<PLACEHOLDER>`. Run them under the
right profile (`hermes -p <PROFILE> cron create ...`). Each job is created
**paused** as a canary: trigger once with `hermes cron run <name>`, read
`hermes cron runs <job_id>`, then `hermes cron resume <name>`.

Shared values used below:

```bash
WS="<ABSOLUTE_WORKSPACE_PATH>"   # holds .hermes.md; must exist
TZ_JOB="<Area/City>"             # e.g. Europe/Paris
TARGET="<DELIVERY_TARGET>"       # e.g. slack, slack:<CHANNEL_ID>, telegram:<CHAT_ID>, local
```

## Daily morning brief (weekdays 08:00, skip if late)

```bash
hermes cron create "0 8 * * 1-5" \
  "Prepare the morning brief following the 'Morning brief' procedure in .hermes.md. If there is nothing new since the last brief, reply with only [SILENT]." \
  --name "morning-brief" \
  --workdir "$WS" --timezone "$TZ_JOB" --deliver "$TARGET" \
  --catch-up off --reasoning-effort medium \
  --paused --paused-reason "canary"
```

## Daily evening review (every day 18:00)

```bash
hermes cron create "0 18 * * *" \
  "Run the 'Evening review' procedure in .hermes.md: what was done today, what is open, what needs a decision tomorrow." \
  --name "evening-review" \
  --workdir "$WS" --timezone "$TZ_JOB" --deliver "$TARGET" \
  --catch-up off \
  --paused --paused-reason "canary"
```

## Weekly review (Friday 17:00, heavier reasoning, pinned model)

```bash
hermes cron create "0 17 * * 5" \
  "Run the 'Weekly review' procedure in .hermes.md and produce the weekly report." \
  --name "weekly-review" \
  --workdir "$WS" --timezone "$TZ_JOB" --deliver "$TARGET" \
  --reasoning-effort high --pin \
  --catch-up on \
  --paused --paused-reason "canary"
```

## Monthly dashboard (1st of the month 08:30, may run late once)

```bash
hermes cron create "30 8 1 * *" \
  "Build the monthly dashboard described in .hermes.md for the previous month." \
  --name "monthly-dashboard" \
  --workdir "$WS" --timezone "$TZ_JOB" --deliver "$TARGET" \
  --reasoning-effort high \
  --catch-up on --grace-minutes 720 \
  --paused --paused-reason "canary"
```

## Recurring watcher (every 2 h, silent when nothing new, cheap)

```bash
hermes cron create "every 2h" \
  "Check <SOURCE> per the 'Watcher' procedure in .hermes.md. Report only new items; otherwise reply with only [SILENT]." \
  --name "watcher-2h" \
  --workdir "$WS" --deliver "$TARGET" \
  --reasoning-effort minimal \
  --paused --paused-reason "canary"
```

Interval schedules have no wall clock: `--timezone` and `--grace-minutes` do
not apply. Use `0 8-20/2 * * *` with `--timezone` to restrict to working hours.

## Zero-LLM watchdog (script only)

```bash
# Script must live in $HERMES_HOME/scripts/ ; empty stdout = silent; non-zero exit = alert
hermes cron create "every 5m" \
  --no-agent --script <watchdog-script>.sh \
  --name "<watchdog-name>" --deliver "$TARGET"
```

## Skill-backed job

```bash
hermes cron create "0 9 * * 1" "<PROMPT>" \
  --skill <skill-a> --skill <skill-b> \
  --name "<job-name>" --workdir "$WS" --timezone "$TZ_JOB" --deliver "$TARGET"
```

## After creating jobs

```bash
hermes cron list
hermes cron status
hermes cron doctor
```

Jobs are per profile and are **not** copied by `hermes profile create --clone*`.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
