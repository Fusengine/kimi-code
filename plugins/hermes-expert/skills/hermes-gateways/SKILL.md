---
name: hermes-gateways
description: Use when wiring Hermes Agent to the outside world - the single multi-profile gateway (default since v0.22.0), one shared bot routed to profiles (`gateway.profile_routes`), agent-to-agent calls (`a2a` platform), messaging adapters (Slack, Telegram, Discord, Email and the other bundled platform plugins), several mailboxes, home channels and routing notifications to a dedicated channel, `hermes send`, voice replies (TTS/STT providers, `/voice`), written-for-the-ear replies, or a backup voice when a TTS provider fails. Not for approvals and send gating (hermes-security), cron schedules (hermes-cron) or plugin/MCP management (hermes-extend).
---


<objective>
Connect one or more Hermes Agent profiles to messaging platforms through the
single multiplexed gateway, route proactive output (briefs, alerts, decisions)
to the right channel, and give the agent a voice that keeps working. Every key,
flag and env var below was read in the official 0.23.0 docs or source; anything
that is a design pattern rather than a Hermes feature is labelled **Pattern**.
</objective>

# Hermes Gateways

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## Native vs pattern

| Need | Status in 0.23.0 | Where |
|------|------------------|-------|
| One gateway process serving every profile | Native, default (`gateway.multiplex_profiles`) | [multiplex-gateway.md](references/multiplex-gateway.md) |
| Slack / Telegram / Discord / Email adapters | Native, bundled platform plugins (auto-loaded) | [messaging-adapters.md](references/messaging-adapters.md) |
| Several mailboxes for one owner | **Pattern** - one Email adapter = one mailbox per profile | [messaging-adapters.md](references/messaging-adapters.md#several-mailboxes) |
| Proactive output to a dedicated channel | Native targets (`deliver`, `hermes send`, home channel) + **Pattern** for a "decisions" channel | [notification-routing.md](references/notification-routing.md) |
| TTS / STT providers, `/voice` modes | Native | [voice.md](references/voice.md) |
| Replies written for the ear | **Pattern** (prompt rules) + native normalisation knobs | [voice.md](references/voice.md#written-for-the-ear) |
| Backup voice when the TTS provider fails | **Pattern** - no native TTS fallback chain | [voice.md](references/voice.md#backup-voice-pattern) + [tts-healthcheck.sh](references/templates/tts-healthcheck.sh) |

## Decision map

| Question | Load |
|----------|------|
| How many gateway processes? Park one profile? Shared bot token (`profile_routes`)? Agent-to-agent (`a2a`)? | [multiplex-gateway.md](references/multiplex-gateway.md) |
| Enable Slack/Telegram/Discord/Email, allowlists, pairing | [messaging-adapters.md](references/messaging-adapters.md) |
| Where do briefs, alerts, failures and decisions land? | [notification-routing.md](references/notification-routing.md) |
| Voice in/out, providers, voice that degrades gracefully | [voice.md](references/voice.md) |
| Ready-to-fill files | [templates/](references/templates/) |

## Critical rules

1. **One host gateway.** Never `gateway install` a named profile on a
   multiplexed host; it refuses (exit 78). Manage a served profile with
   `hermes -p <name> gateway stop|start|restart` (park / unpark / reconnect).
2. **One bot credential = one profile.** The same `(platform, token)` in two
   profiles parks the duplicate adapter (`duplicate_credential`).
3. **Secrets in each profile's `.env`, never in `config.yaml`.** Credentials,
   allowlists and outbound egress (cron delivery, `hermes send`; `send_message`
   is not a model-callable tool at v0.23.0 - tools/send_message_tool.py L28-30,
   toolsets.py L186-187) are resolved per profile and never fall back to the
   default profile.
4. **Allowlist every adapter.** The gateway denies unlisted users by default;
   never set `GATEWAY_ALLOW_ALL_USERS=true` on a profile with terminal access.
5. **The Email adapter replies by itself** (SMTP, in-thread). Never point it at
   a mailbox where "nothing leaves without the owner's go" applies - use a
   dedicated agent address, or read-only triage (hermes-mail-triage) plus the
   go gate (hermes-security).
6. **Explicit `stt.provider` is strict** (no silent engine switch), and there is
   no automatic TTS provider fallback: a backup voice is something you build.
7. Restart the gateway after editing platform config
   (`hermes gateway restart` on the default profile), then confirm with
   `hermes gateway status` and `/platform list`.

## Workflow

1. Freshness check, then `hermes gateway status` and `hermes status --full`
   to see the host process and served profiles.
2. Per profile: fill `.env` from [profile.env.example](references/templates/profile.env.example)
   (`hermes -p <name> config set UPPER_SNAKE value` writes to that `.env`).
3. Per profile: merge [gateway-config.yaml](references/templates/gateway-config.yaml)
   into its `config.yaml` (`hermes -p <name> config edit`).
4. Route proactive output ([notification-routing.md](references/notification-routing.md)),
   then test with `hermes -p <name> send --to <target> "routing test"`.
5. Voice: pick providers, then install the backup-voice pattern if voice
   matters ([voice.md](references/voice.md)).
6. Verify: `hermes doctor`, `hermes gateway status`, one real message per
   platform, one voice note round trip.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email
- https://hermes-agent.nousresearch.com/docs/user-guide/features/tts
- https://hermes-agent.nousresearch.com/docs/user-guide/features/voice-mode
- https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins (bundled platform plugins)
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes send`, `hermes config`)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 ("Every messaging adapter is now a plugin")
