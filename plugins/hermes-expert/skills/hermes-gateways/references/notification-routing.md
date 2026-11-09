# Routing notifications to the right channel

Hermes produces two kinds of output: **replies** (they go back to the chat that
asked) and **proactive output** (cron results, alerts, failures, restart notices,
background results). Only the second kind needs routing.

## Native routing primitives

| Primitive | What it does | Syntax |
|-----------|--------------|--------|
| Home channel | Default target for a platform's proactive output | `SLACK_HOME_CHANNEL`, `TELEGRAM_HOME_CHANNEL`, `DISCORD_HOME_CHANNEL`, `EMAIL_HOME_ADDRESS` in the profile `.env`; or `/sethome` inside the chat |
| Cron `deliver` | Where a job's result goes | `origin`, `local`, `slack`, `slack:C0123456789`, `slack:U0123456789` (DM), `telegram:<chat_id>[:<thread_id>]`, `discord:#channel`, `email` |
| Cron failure destination | Where failure notices go | `--failure-deliver` flag on `hermes cron create` / `hermes cron edit` (stored as the `failure_deliver` job field): present in code (hermes_cli/subcommands/cron.py L49, L126; cron/jobs.py L1715, L1830; hermes_cli/cron.py L776 at v0.23.0), **undocumented** on the official cron page - verify on your version |
| `hermes send` | One-shot message from any script, no agent | `hermes send --to slack:C0123456789 "text"`, `--file`, `--subject`, `--list` |
| `send_message` | Documented on the Slack page, but **not registered as an agent-callable tool at v0.23.0** (tools/send_message_tool.py L28-30; toolsets.py L186-187). Its helpers serve cron delivery, `hermes send` and the Kanban notifier | same target shapes; check `hermes tools list` before relying on it |
| `/bg <prompt>` | Background task; result returns to the same chat | - |
| Restart notices | "Agent is back / was interrupted" to each platform's home channel | `gateway.platforms.<platform>.gateway_restart_notification: false` to mute |
| Circuit-breaker alert | Paused adapter reported to the home channel of another live platform | automatic; resume with `/platform resume <name>` |

`hermes send` needs no running gateway for bot-token platforms (Telegram,
Discord, Slack, Signal, SMS, WhatsApp Cloud API); exit codes `0` ok, `1`
delivery failure, `2` usage error - use `-q` in scripts.

## Keeping noise out of the main chat

- `display.tool_progress: off | new | all | verbose | log` (global or per
  platform under `display.platforms.<platform>`). `log` writes
  `~/.hermes/logs/tool_calls.log` instead of chat bubbles.
- `display.suppress_warning_notifications: true` (global, with per-platform
  override under `display.platforms`) mutes engine warnings, retry/fallback
  diagnostics, cron and Kanban failure notices on that surface. It changes
  presentation only - logs and failure state are kept.
- `display.background_process_notifications: concise | all | result | error | off`.
- `display.platforms.<platform>.cleanup_progress: true` (Telegram, Discord)
  deletes progress bubbles after the final answer.
- Silence tokens: a final answer that is exactly `[SILENT]` / `NO_REPLY`
  is not delivered (a human message still gets a short notice unless the room
  sets `channel_overrides.<id>.allow_silence: true`). Cron uses the same tokens
  for "say nothing when nothing changed".
- `gateway.platforms.<platform>.typing_indicator: false` for quiet surfaces.

## Per-channel behaviour

`platforms.<platform>.channel_overrides.<channel or thread id>` sets `model`,
`provider`, `system_prompt` (ephemeral, per turn) and `allow_silence` for one
channel; lookup is exact id, then parent id. Precedence for the model:
session `/model` > `channel_overrides` > global config. On Slack,
`slack.channel_prompts` and `slack.channel_skill_bindings` do the same by
channel ID.

## Pattern: a dedicated "decisions" channel

Hermes has no notion of a decisions channel; build it from the primitives:

1. Create a private channel (for example `#decisions`) and invite the bot;
   note its channel ID (Slack: channel details -> About).
2. Restrict who can act there: keep `SLACK_ALLOWED_USERS` to the owner and,
   if the bot must only listen in a few channels, list them in
   `slack.allowed_channels`.
3. Give the channel its own instructions with
   `slack.channel_prompts: {"<decisions id>": "<one decision per message: context, options, recommendation, what happens on go>"}`.
4. Send decision requests there explicitly: cron jobs with
   `deliver: slack:<decisions id>`, scripts with
   `hermes send --to slack:<decisions id> --subject "[DECISION]" --file <draft>`
   (run by a script or timer, not by the agent), and a cron "pilot check"
   whose delivery is that channel and whose prompt lists the pending decisions.
   The agent has no send tool for this at v0.23.0.
5. Keep failures elsewhere: point the home channel (and, if you accept an
   undocumented flag, the job's `--failure-deliver`) at an ops channel so
   decisions are never buried under alerts.
6. Approval prompts for dangerous commands are not routed by this: they appear
   in the chat where the session runs. Moving them to another UI requires an
   approval-transport plugin (`security.approval.transport`, hermes-security).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ (silence tokens, channel_overrides, tool progress, background sessions, restart notifications, circuit breaker, warning suppression)
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack (Home Channel, cron delivery targeting, send_message, allowed_channels, channel_prompts, channel_skill_bindings)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (Delivery options, no-agent mode)
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes send`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins (approval transports)
- https://github.com/NousResearch/hermes-agent/blob/v0.23.0/tools/send_message_tool.py (L28-30), toolsets.py (L186-187), cron/jobs.py (L1715, L1830), hermes_cli/cron.py (L776), hermes_cli/subcommands/cron.py (L49, L126: `--failure-deliver`)
