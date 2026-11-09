# Decisions channel and daily fresh context

## Decisions channel

Notifications mixed into the owner's conversation hide the owner's own
messages. Route machine output (pilot checks, triage proposals, job
failures) to a dedicated channel, keep the owner conversation for dialogue
and the briefs. This is a **pattern** built on native cron delivery.

- Cron delivery targets are native: a platform's home channel (`slack`,
  `telegram`, `discord`, ...), a specific chat (`telegram:<chat_id>`), a
  named Discord channel (`discord:#<name>`), or several comma-separated.
  Full list and syntax: hermes-cron.
- A specific Slack channel by id appears in the docs only as
  `slack:C0123456` inside a sample output; confirm the exact Slack target
  syntax on the installed version (hermes-cron, hermes-gateways) before
  writing it. The Slack home channel is set with `SLACK_HOME_CHANNEL`.
- Per-channel behaviour (model, prompt) can be set with `channel_overrides`
  under the platform in `config.yaml` (hermes-gateways).
- Delivered cron output is secret-redacted on the way out (cron docs).
- Job failures always deliver, even when the prompt asks for `[SILENT]`.

Channel setup (adapter side):
[hermes-gateways notification-routing.md](../../hermes-gateways/references/notification-routing.md#pattern-a-dedicated-decisions-channel).

Owner answers ("go", "ok all", "ok except 3") may come from either channel;
the chief records them in the registry, not only in chat.

## Daily fresh context

**Not native since v0.22.0.** Gateway conversations no longer reset on idle
or daily timers; `session_reset.mode: idle|daily|both` is ignored by core and
`hermes doctor` warns about it. Options (detail in hermes-core,
`references/sessions-and-context.md`):

1. **Catalog plugin**: `hermes plugins install hermes-session-reset-policy`
   - reads the same `session_reset` block and restores time-based resets.
2. **Manual**: the owner (or a habit in the evening review) sends `/new` or
   `/reset` - both ask for confirmation.

A cron job that issues `/new` on the owner's conversation is UNVERIFIED -
do not promise it.

Why a fresh context is safe here: state lives in files (registry, dossier
READMEs, board), memory holds habits (`memories/`), and every ritual reads
files. A long running conversation re-read on every call is what drove
cost and drift before.

Prompt refresh after editing SOUL.md: `hermes sessions refresh-prompts`
(v0.23.0, hermes-core).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (Delivery options, `[SILENT]`, redaction)
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ (Session continuity, `hermes-session-reset-policy`)
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.22.0
