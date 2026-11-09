# Messaging adapters

## Adapters are plugins (v0.23.0)

Every messaging adapter now ships as a **bundled platform plugin** under
`plugins/platforms/<name>/` in the Hermes tree (slack, telegram, discord,
email, signal, whatsapp, whatsapp_cloud, matrix, mattermost, teams,
google_chat, sms, irc, line, feishu, dingtalk, wecom, weixin, qqbot,
bluebubbles, ...). "Nothing changes for users":

- Bundled platform plugins are **auto-loaded**; `plugins.enabled` does not gate
  them. A channel starts when its credentials are present, or explicitly via
  `platforms.<name>.enabled: true` in the profile's `config.yaml`.
- `platforms.<name>.enabled: false` is authoritative: credentials left in
  `.env` no longer start the adapter (startup logs one WARNING per platform).
- Third-party adapters under `~/.hermes/plugins/platforms/` are opt-in via
  `plugins.enabled` (explicit consent for foreign code).
- Some pages write the block as `gateway.platforms.<name>`; the messaging pages
  and the loader (`gateway/config.py`) use top-level `platforms:`. Use the
  top-level form and confirm with `hermes config get platforms.<name>`.

Setup wizard for any platform: `hermes gateway setup` (or `hermes setup gateway`).

## Access control (all platforms)

- Default: **deny** everyone not in an allowlist or paired.
- Per platform: `SLACK_ALLOWED_USERS`, `TELEGRAM_ALLOWED_USERS`,
  `DISCORD_ALLOWED_USERS`, `EMAIL_ALLOWED_USERS`, ...; cross-platform
  `GATEWAY_ALLOWED_USERS`; open access `GATEWAY_ALLOW_ALL_USERS=true` (not for
  bots with terminal access).
- DM pairing: unknown users get a code, you approve it:
  `hermes pairing approve <platform> <code>`, `hermes pairing list`,
  `hermes pairing revoke <platform> <user_id>`. Codes expire after 1 hour.
- `unauthorized_dm_behavior: pair | ignore | decline` (global or under the
  platform; the platform value wins). `pair` is the default for chat-style DM
  platforms, `ignore` drops silently, `decline` sends one short refusal then
  ignores that sender for 24 hours (text via `unauthorized_dm_decline_message`).
  Email defaults to `ignore`.
- Admin vs user tiers gate slash commands; `/whoami` shows your tier.

## Slack (Socket Mode)

`.env`: `SLACK_BOT_TOKEN` (xoxb-), `SLACK_APP_TOKEN` (xapp-),
`SLACK_ALLOWED_USERS` (member IDs), optional `SLACK_HOME_CHANNEL` (channel ID)
and `SLACK_HOME_CHANNEL_NAME`. `hermes slack` generates the app manifest.
Invite the bot to each channel (`/invite @<bot>`).

Useful `config.yaml` keys (under `slack:` unless noted):
- `require_mention`, `free_response_channels` (or `SLACK_FREE_RESPONSE_CHANNELS`)
- `allowed_channels` (or `SLACK_ALLOWED_CHANNELS`): everything else is
  silently ignored; 1:1 DMs stay exempt.
- `channel_prompts: {"<channel id>": "<prompt>"}` - ephemeral per-turn prompt.
- `channel_skill_bindings: [{id: "<channel id>", skills: [...]}]` - skills
  injected at session start in that channel.
- `platforms.slack.extra.reply_in_thread`, `platforms.slack.reply_to_mode`.
- Several workspaces in one gateway: comma-separated `SLACK_BOT_TOKEN`, one
  `SLACK_APP_TOKEN`.
- Voice: incoming audio is transcribed with the configured STT; TTS replies go
  out as audio file attachments.

## Telegram

`.env`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`, optional
`TELEGRAM_HOME_CHANNEL` (chat id, e.g. `-100...`). Mobile-friendly defaults:
`tool_progress` off, long-running heartbeat bubble on. Voice replies arrive as
native voice bubbles (Opus/OGG).

## Discord

`.env`: `DISCORD_BOT_TOKEN`, `DISCORD_ALLOWED_USERS` (or
`DISCORD_ALLOWED_ROLES`), optional `DISCORD_HOME_CHANNEL`,
`DISCORD_REQUIRE_MENTION=false`, `DISCORD_FREE_RESPONSE_CHANNELS`. DMs need no
mention. `/voice join` puts the bot in your voice channel.

## Email (IMAP/SMTP)

`.env` (required): `EMAIL_ADDRESS`, `EMAIL_PASSWORD` (app password),
`EMAIL_IMAP_HOST`, `EMAIL_SMTP_HOST`, and `EMAIL_AUTHSERV_ID` (exact
authserv-id of your receiving server's topmost `Authentication-Results`
header, e.g. `mx.google.com`) unless sender authentication is turned off.
Optional: `EMAIL_IMAP_PORT` (993), `EMAIL_SMTP_PORT` (587),
`EMAIL_POLL_INTERVAL` (15 s), `EMAIL_ALLOWED_USERS`, `EMAIL_HOME_ADDRESS`
(cron delivery target), `EMAIL_ALLOW_ALL_USERS` (not recommended).

Behaviour that matters for a personal assistant:
- On start it marks every existing inbox message as seen and only handles new
  mail; it **replies automatically** via SMTP in-thread.
- Without an allowlist, unknown senders are ignored silently.
- Mail is acted on only when `Authentication-Results` authenticates the
  `From:` domain (DMARC or aligned SPF/DKIM). Opt-out
  (`platforms.email.require_authenticated_sender: false` /
  `EMAIL_TRUST_FROM_HEADER=true`) means a forged `From:` is trusted.
- `platforms.email.skip_attachments: true` drops attachments before decoding.
- Loopback relays (Proton Mail Bridge): `platforms.email.extra.imap_security`,
  `smtp_security` (`tls|starttls|plain`), `imap_tls_verify`, `smtp_tls_verify`.
- The docs say: use a **dedicated** account, never your personal mailbox.

## Several mailboxes

The Email adapter holds exactly one account per profile (one set of
`EMAIL_*` variables in that profile's `.env`). Options, in order of preference:

1. **Triage, not conversation** (the usual owner need): keep the adapter off
   and let a cron job read every mailbox with the bundled **Himalaya** skill,
   which supports several accounts (`[accounts.<name>]` in
   `~/.config/himalaya/config.toml`, `himalaya --account <name> envelope list`).
   Moving, deleting and sending stay behind the owner's go (go gate,
   hermes-security) - deny the raw `himalaya ... send|move|delete` commands.
2. **One profile per mailbox** when each address must converse on its own:
   each profile carries its own `EMAIL_*` set and allowlist; the multiplexed
   gateway serves them all, and their sessions never mix.
3. An IMAP MCP server or plugin (hermes-extend) - check the catalog first,
   never assume one exists.

Pattern (not a feature): sender reputation checks (SPF/DKIM/DMARC verdicts,
blocklists) beyond the adapter's own `From:` check are a skill or script -
see hermes-mail-triage.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins (bundled platform plugins, opt-in rules)
- https://github.com/NousResearch/hermes-agent/tree/main/plugins/platforms
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ (Security, DM pairing, disabling a platform)
- https://github.com/NousResearch/hermes-agent/blob/v0.23.0/website/docs/user-guide/security.md (DM pairing: `unauthorized_dm_behavior` values `pair | ignore | decline`, `unauthorized_dm_decline_message`)
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email
- https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/email/email-himalaya
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
