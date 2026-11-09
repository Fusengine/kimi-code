# Go gate: the agent prepares and shows, the owner decides, the server's own mechanism sends

**This is a pattern, not a Hermes feature.** Hermes 0.23.0 has no setting that
holds every outgoing email or message until the owner says go
([approval-model.md](approval-model.md)). The plugin ships **no send script**
and installs none: the send runs through the mechanism already on the owner's
server.

## The three parts

1. **Hermes-native config blocks direct sending** (agent profile):
   - `approvals.deny` lists the sending CLIs (speed bump, not a guarantee):
     `"*msmtp*"`, `"*sendmail*"`, `"*swaks*"`, `"*himalaya*send*"`,
     `"*hermes send*"`, `"*chat.postMessage*"`, plus moving/deleting mail if
     that also needs a go (`"*himalaya*move*"`, `"*himalaya*delete*"`) -
     template [security-config.yaml](templates/security-config.yaml).
   - `approvals.cron_mode`: `approve` on the chief only, default `deny` on
     every other profile (approval-model.md),
     `delegation.subagent_auto_approve: false`,
     never `approvals.mode: off`; audit `command_allowlist`.
   - No send credential in the profile `.env`, `terminal.env_passthrough`,
     `terminal.docker_forward_env` or any file the agent's OS user can read.
   - Email adapter off for real mailboxes (it auto-replies via SMTP).
   - `hermes send` and cron delivery reuse the **gateway's** bot tokens: keep
     them for owner-facing channels only; a bot token that can post to third
     parties is a send credential.
2. **Shown as is, then "Go ?"**: the agent prepares the outgoing item and shows
   it in the owner's conversation exactly as the recipient will get it - from,
   to, cc, subject, full text, attachments by name - then asks "Go ?"
   (hermes-outbound `show-before-go.md`). Any change after the go means a new
   preview and a new go.
3. **After the go, the server's existing mechanism sends.** The send runs
   through what SSH discovery found on the owner's server (for example an
   existing send script). The agent never ships, installs or rewrites a
   replacement; it audits the existing one and reports.

## Audit of the existing send mechanism (report, do not fix)

| Question | Answer recorded in the checklist |
|----------|----------------------------------|
| What is it (path, owner, how it is triggered)? | from discovery |
| Does it send only after an explicit go from the owner? | yes / no / unclear |
| From which account / sender identity does it send? | address or account |
| Where do its credentials live; can the agent's OS user read them? | path, readable yes/no |
| Can the agent trigger it without the go? | yes / no |

Any "no", "unclear" or readable credential is listed as an **owner decision**,
never fixed by the agent. If the server has **no** send mechanism, the
checklist says so as an owner decision; nothing is invented.

## Verify

1. As the agent's OS user, a direct send command from the deny list is refused.
2. No send credential appears in the profile `.env`, `env_passthrough`,
   `docker_forward_env` or `config.yaml`.
3. One real round trip: preview shown, "Go ?", go given, the existing mechanism
   sends to the owner's own address; nothing left before the go.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/security (what triggers approval, deny rules threat model, env passthrough)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (cron scripts get `terminal.env_passthrough`)
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email (adapter replies via SMTP)
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes send` reuses gateway credentials)
