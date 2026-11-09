---
name: hermes-cron
description: Use when scheduling Hermes Agent work - hermes cron create/edit/list/pause/resume/run/cancel/remove, schedule formats, --workdir (so .hermes.md loads), --timezone, --reasoning-effort, --catch-up, --grace-minutes, model pinning, delivery targets, preflight (blocked_config), failure alerts, daily/weekly/monthly job recipes. Not for what the jobs should say (hermes-rhythm), subagent limits (hermes-delegation) or messaging adapter setup (hermes-gateways).
---


<objective>
Create and operate scheduled jobs in Hermes Agent 0.23.0 with `hermes cron`
(or `/cron` in chat, or the agent's `cronjob_manage` tool): schedule syntax,
per-job working directory, timezone, reasoning effort, model pin, missed-run
policy, delivery targets, preflight validation, cancellation and health
checks, plus generic daily/weekly/monthly recipes. Every flag here was read in
the official cron docs or the v0.23.0 release notes.
</objective>

# Hermes Cron

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## Decision map

| Question | Load |
|----------|------|
| Every subcommand and flag | [cron-cli.md](references/cron-cli.md) |
| Schedule syntax, timezone, where output goes | [schedules-delivery.md](references/schedules-delivery.md) |
| Preflight, catch-up, cancel, alerts, doctor | [reliability.md](references/reliability.md) |
| Daily / weekly / monthly job recipes | [templates/cron-jobs.md](references/templates/cron-jobs.md) |
| `cron:` config block | [templates/cron-config.yaml](references/templates/cron-config.yaml) |

## Critical rules

1. **Always pass `--workdir <absolute dir>`** for jobs that must follow
   workspace rules. Without it a job runs detached: no `.hermes.md`,
   `AGENTS.md` or `CLAUDE.md` is loaded and tools run from the gateway's
   directory. The directory must exist and be absolute.
2. **SOUL.md still applies** (it comes from the profile home), but put job
   procedures in the prompt or `.hermes.md`, not in SOUL.md.
3. **The scheduler lives in the gateway.** No running gateway = no fires.
   Check `hermes cron status` after any change.
4. **Pin what must not drift.** Unpinned jobs follow `cron.model`, then the
   main model at fire time. Use `--pin` or `--model/--provider` for jobs
   whose output must stay stable; `--reasoning-effort` per job.
5. **Set the timezone.** Expressions use the profile `timezone:` unless
   `--timezone` is given; an invalid zone silently means server time
   (`hermes doctor` reports it).
6. **Stale briefs are useless:** use `--catch-up off` for time-bound reports.
7. **Deliver, don't send.** The final response goes to `--deliver`; cron
   sessions cannot create cron jobs and must not be told to message people.
8. **Canary first:** `--paused`, then `hermes cron run <job>`, then resume.

## Minimal job

```bash
hermes cron create "0 8 * * 1-5" "<PROMPT>" \
  --name "<job-name>" \
  --workdir "<ABSOLUTE_WORKSPACE_PATH>" \
  --timezone "<Area/City>" \
  --deliver "<TARGET>" \
  --catch-up off \
  --paused --paused-reason "canary"
hermes cron list               # note the job id
hermes cron run <job-name>     # manual run on the next scheduler tick (works while paused)
hermes cron runs <job_id> --limit 5
hermes cron resume <job-name>
```

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes cron`)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (timezone)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (cancel, --catch-up)
