# Reliability: preflight, missed runs, cancel, alerts, health

## Preflight (`cron.preflight`, default on)

Before any LLM call the scheduler checks that the job can succeed:

- the provider key resolves (unpinned jobs with a `fallback_providers` chain
  skip this; pinned jobs are always checked),
- attached skills are ready (env vars, commands, credential files),
- delivery targets are known and have gateway credentials (`local`/`origin`
  are not checked),
- every MCP server the job names resolved to at least one tool for this profile.

Failure -> `last_status: blocked_config`, **one** alert, **no tokens spent**;
the next healthy run clears it. The message names the profile and
`HERMES_HOME` it read: if an interactive session works but the job is blocked,
the gateway runs with a different home or env (service unit, Docker, a
multiplexed satellite profile reading its own `.env`).

Disable only for debugging: `hermes config set cron.preflight false`.

## Missed runs (gateway down, machine asleep)

| Setting | Effect |
|---------|--------|
| default | a recurring job missed during an outage catches up **once** (never once per slot); paused jobs never catch up |
| `cron.catch_up_missed: false` | past-grace misses are skipped and re-anchored to the next occurrence (logged) |
| `--catch-up on` / `--catch-up off` (per job, v0.23.0) | overrides the global policy; `off` for time-bound briefs |
| `--grace-minutes N` (0-1440) | lateness window for cron expressions; default half the period clamped 2 min-2 h; `0` = never late-run |

One-shots keep a 120-second grace. Catch-ups show as `⚠ late` /
`⚠ catch-up after missed fire` in `hermes cron list`.

## Stopping things

| Need | Command |
|------|---------|
| Stop the current run only | `hermes cron cancel <job> [--reason "..."]` (script: process tree killed; agent: interrupted at next checkpoint; not counted as a failure) |
| Stop future fires of one job | `hermes cron pause <job>` |
| Delete a job (cancels a live run) | `hermes cron remove <job>` |
| Stop everything now | `hermes pause --reason "..."`; `hermes resume` to lift. Manual `cron run` still works while paused |

## Failure alerts

- First failure of an error signature always alerts; repeats are held while
  the incident is `alerted`; `cron.failure_repeat_alert_hours` (docs example
  6; `0` = alert every failing run) sends one reminder.
- `hermes cron incidents`, `hermes cron incidents ack <id>`.
- After repeated failures Hermes nudges you to fix, pause or remove the job.

## Health checks

```bash
hermes cron status     # scheduler alive, last tick, soonest run; "OVERDUE" = ticker stopped -> hermes gateway restart
hermes cron list       # per-job status, pinned, late / missed-fire warnings, delivery UNVERIFIED
hermes cron doctor     # exit 1 while any finding stands (failed runs/deliveries, overdue, missing scripts or workdirs)
hermes cron runs <job_id> --limit 20
hermes logs --component cron --since 1d
```

`hermes cron doctor || <alert>` is a valid watchdog, but a successful
catch-up keeps the lateness finding until the next on-time fire.

Named profile under the multiplexed gateway: `hermes cron status` names the
host scheduler; a stale heartbeat points to
`hermes --profile default gateway restart`.

Cron store not writable (disk full, read-only mount): `cron status` leads with
`⚠ Cron store is NOT writable`; fix the disk, no restart needed.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (Pre-dispatch configuration validation, Catch-up window, Local missed-run policy, Lifecycle actions, Failure incidents, Fleet health check)
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes pause`)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (cancel, per-job catch-up)
