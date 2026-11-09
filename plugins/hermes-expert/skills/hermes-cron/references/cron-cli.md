# hermes cron - commands and flags (0.23.0)

Three equivalent doors: the CLI (`hermes cron ...`), chat (`/cron add|edit|list|pause|resume|run|remove`),
and the agent tool `cronjob_manage` (old name `cronjob` still works). Jobs are
stored per profile in `~/.hermes/cron/jobs.json`; use `hermes -p <profile> cron ...`
for a named profile.

## Lifecycle

```bash
hermes cron list
hermes cron create "<schedule>" "<prompt>" [flags]     # alias: add
hermes cron edit <job_id_or_name> [flags]
hermes cron pause <job_id_or_name>
hermes cron resume <job_id_or_name>                     # a slot due while paused fires once (or is skipped per catch-up policy)
hermes cron run <job_id_or_name>                        # trigger on the next tick; works while paused
hermes cron cancel <job_id_or_name> [--reason "..."]    # stop the run in flight; schedule untouched (v0.23.0)
hermes cron remove <job_id_or_name>                     # delete; also cancels a live run
hermes cron status                                      # scheduler alive? next run? OVERDUE?
hermes cron runs [job_id] --limit 20                    # execution history
hermes cron incidents [--state alerted]                 # durable failure records; `incidents ack <id>`
hermes cron doctor                                      # read-only fleet check, exit 1 on findings
hermes cron tick                                        # run due jobs once and exit
hermes pause [--reason "..."] / hermes resume           # global emergency stop (all cron, kanban, gateway turns)
```

## create / edit flags

| Flag | Meaning |
|------|---------|
| `--name "<name>"` | human name usable instead of the id |
| `--skill <name>` (repeatable) | attach skills; on edit, repeated `--skill` replaces the list |
| `--add-skill`, `--remove-skill`, `--clear-skills` | edit only |
| `--workdir <abs dir>` | run inside that directory: project context file loaded, tools use it as cwd; `""` on edit clears |
| `--timezone <Area/City>` | wall-clock zone for this job; `""` on edit inherits the profile `timezone:` |
| `--reasoning-effort <level>` | `none, minimal, low, medium, high, xhigh, max, ultra`; `""` on edit clears; no effect on no-agent jobs; not settable by the agent tool |
| `--model <id> --provider <p>` | pin an explicit model |
| `--pin` / `--unpin` | lock the current main model onto the job / release |
| `--catch-up on\|off` | per-job missed-run policy (v0.23.0) |
| `--grace-minutes <0-1440>` | catch-up window for cron expressions; `0` = never catch up; `""` restores the computed window |
| `--continuity` / `--no-continuity` | recurring jobs: each run sees the previous run's output and is told not to repeat it; `--no-continuity` toggles it off on edit (official cron page; code: hermes_cli/cron.py L780, L795) |
| `--deliver <target[,target]>` | where the final response goes (see schedules-delivery.md) |
| `--paused [--paused-reason "..."]` | create disabled (safe canary) |
| `--script <file>` | script under `$HERMES_HOME/scripts/` (file, never a command line) |
| `--no-agent` | script-only job: stdout delivered verbatim, zero LLM calls, empty stdout = silent |
| `--interpreter <python path>` | pin a user venv for a Python script |
| `--schedule`, `--prompt` | edit only: change schedule or prompt |

The `repeat` count (default 1 for one-shots, forever otherwise) is exposed on
the `cronjob_manage` tool (`repeat=5`); a CLI flag for it is not shown in the docs.

## Model resolution at fire time

per-job pin (`--model/--provider` or `--pin`) -> `cron.model` / `cron.model_provider`
-> main model at that moment. The agent cannot point a job at a different
model; pins are user-owned.

```bash
hermes config set cron.model "<CRON_MODEL_ID>"   # fleet default for unpinned jobs
```

## Limits that matter

- Cron sessions cannot create cron jobs (management tools disabled inside a run).
- The agent does not send messages from a cron prompt; the final response is
  delivered to `--deliver`.
- Script jobs get a sanitized environment: provider keys are **not** inherited.
- `cron.max_parallel_jobs` caps total concurrency.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes cron`, `hermes pause`)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (Stop a running cron job, `--catch-up on|off`)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.22.0 (`cronjob` -> `cronjob_manage`)
