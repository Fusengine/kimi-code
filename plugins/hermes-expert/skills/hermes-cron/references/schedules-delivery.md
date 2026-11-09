# Schedules, timezone, delivery

## Schedule formats

| Kind | Examples | Repeat |
|------|----------|--------|
| Relative one-shot | `in 30m`, `in 2h`, `in 1d` | once |
| Interval | `30m`, `every 30m`, `every 2h`, `every 1d`, `every hour` | forever |
| Natural day/time | `every day at 9am`, `daily at 7am`, `weekdays at 9am`, `weekends at 10am`, `every monday 9am`, `monday, wednesday at 9am`, `every 1d at 09:00` | forever |
| Cron expression | `0 9 * * *`, `0 9 * * 1-5`, `0 9 * * MON-FRI`, `0 */6 * * *`, `30 8 1 * *`, `0 0 * * 0` | forever |
| ISO timestamp | `2026-03-15T09:00:00` | once |

Times accept `9am`, `9:30pm`, `14:00`, `at 7`, `noon`, `midnight`. Natural
forms compile to cron expressions (`croniter`, installed by default). Prefer
explicit cron expressions in generated configs: they are unambiguous.

Common cadences:

| Cadence | Expression |
|---------|------------|
| Every weekday 08:00 | `0 8 * * 1-5` |
| Every day 18:00 | `0 18 * * *` |
| Friday 17:00 | `0 17 * * 5` |
| Monday 08:00 | `0 8 * * 1` |
| 1st of the month 08:30 | `30 8 1 * *` |
| Every 2 hours, 08:00-20:00 | `0 8-20/2 * * *` |

## Timezone

- Default: the profile's `timezone:` (IANA, e.g. `Europe/Paris`);
  `HERMES_TIMEZONE` overrides it; empty = server-local time.
- Per job: `--timezone <Area/City>`; the expression is that zone's wall clock
  and stays put across DST.
- Offset-less one-shot timestamps are read in the job's zone.
- Interval jobs have no wall clock; a timezone pin does nothing.
- A typo (`Asia/Tokio`) silently falls back to server time; `hermes doctor`
  reports it. Run `hermes doctor` after setting a zone.

## Delivery targets (`--deliver`)

| Target | Goes to |
|--------|---------|
| `origin` | where the job was created (default on messaging platforms) |
| `local` | `~/.hermes/cron/output/` only (default from the CLI) |
| `slack`, `telegram`, `discord`, `matrix`, `mattermost`, `whatsapp`, `signal`, `email`, `sms`, ... | that platform's home channel |
| `telegram:<chat_id>`, `telegram:<chat_id>:<thread_id>` | a Telegram chat / topic |
| `discord:#<channel>` | a Discord channel by name |
| `slack:<CHANNEL_ID>` | a Slack channel id (format seen in the docs' delivery examples, e.g. `slack:C0123456`) |
| `bot-chat`, `bot-chat:<profile>` | this or another local profile's Bot Chat |
| `room:<id>@<profile>` | a Bot Mode group-chat room (v0.23.0) |
| `all` | every connected home channel |
| `telegram,discord`, `origin,all` | comma-separated fan-out |

Home channels come from env vars such as `TELEGRAM_HOME_CHANNEL`,
`DISCORD_HOME_CHANNEL` (Slack home channel setup: hermes-gateways).

Delivered output is secret-redacted on every lane even if
`security.redact_secrets: false`. The run document under
`cron/output/<job_id>/` keeps the raw response.

## Silence and failure markers

- Final response contains `[SILENT]` -> no delivery on success (output still
  saved). Use for "say something only if there is news". Failed runs always deliver.
- `[CRON_FAILURE]` alone on the **first line** -> the run is recorded as failed.
- No-agent script jobs: empty stdout = silent tick.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (Schedule formats, Per-job timezone, Delivery options, Silent suppression, Declaring a failed run)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (timezone, HERMES_TIMEZONE)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (`room:<id>@<profile>`)
