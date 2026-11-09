# Logs and health checks

## First three commands

```bash
hermes doctor          # config, dependencies, services; exit 1 while a problem remains (--fix repairs what it can)
hermes status          # model, provider, credentials, gateway, platforms, jobs (--full / --deep for more)
hermes gateway status  # served profiles, multiplex blockers
```

`hermes doctor` is safe as a CI/health gate because of its exit code.

## Log files

All in `~/.hermes/logs/` (named profiles: `<profile>/logs/`). Secrets are
redacted by default (`security.redact_secrets: true`).

| `hermes logs <name>` | File | Captures |
|----------------------|------|----------|
| `agent` (default) | `agent.log` | API calls, tool dispatch, session lifecycle |
| `errors` | `errors.log` | warnings and errors only |
| `gateway` | `gateway.log` | platform connections, message dispatch, webhooks |
| `gui` | `gui.log` | dashboard / TUI gateway / websocket |
| `desktop` | `desktop.log` | Electron app |
| `mcp` | `mcp-stderr.log` | stderr of stdio MCP servers |
| `update` | `update.log` | every `hermes update` run |
| `handoff` | `desktop-update-handoff.log` | Desktop-driven updates |

```bash
hermes logs list                        # files and sizes
hermes logs errors -n 200
hermes logs gateway -f                  # follow
hermes logs --level WARNING --since 2h
hermes logs --component cron            # gateway | agent | tools | cli | cron
hermes logs --session <id-substring>
```

## Area-specific checks

| Area | Command |
|------|---------|
| Cron scheduler alive, next run, overdue jobs | `hermes cron status`, `hermes cron doctor` (exit 1 on findings) |
| Cron run history | `hermes cron runs [job] --limit 20` |
| Subagent live transcripts | `~/.hermes/cache/delegation/live/<delegation_id>/task-<n>.log` (pruned after 7 days) |
| Update outcome | `~/.hermes/logs/update_receipts/latest.json`, `hermes logs update` |
| Dependencies | `hermes pm status` |
| Context actually loaded | `/context` inside a session |
| Prompt size | `hermes prompt-size` |
| Support bundle | `hermes dump`, `hermes debug` |

## Typical symptoms

| Symptom | Look at |
|---------|---------|
| Bot silent | `hermes gateway status`, `hermes logs gateway`; parked profile -> `hermes -p <name> gateway start` |
| Scheduled job never fired | `hermes cron status` (OVERDUE = scheduler stopped) -> `hermes gateway restart` |
| Job `blocked_config` | preflight failure: missing key, skill, delivery creds or MCP (hermes-cron) |
| Agent ignores project rules | `/context`; wrong working directory or a higher-priority file wins (persona-context-files.md) |
| Key set but no effect | `hermes config get <key>` notice "Hermes may not read it" -> key unknown |
| Mixed versions after update | update fleet matrix; `hermes gateway restart` |

## Backups

`hermes backup` / `hermes import` move a full home between machines;
`hermes profile export` excludes credentials by design.

## Sources

- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes logs`, `hermes doctor`, `hermes status`, `hermes backup`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (How it works, `cron doctor`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation (Live Transcripts)
- https://hermes-agent.nousresearch.com/docs/getting-started/updating (receipts)
