---
name: hermes-outbound
description: Use when anything a Hermes Agent prepares will leave the system - an email, a message to a third party, a PDF or document for a client - to apply the "nothing internal leaves" checklist, write in the owner's voice (tone, informal/formal address per contact, signature), show the owner exactly what the recipient will receive before the go, and run the chief's final trace scan. Not for approval settings or the go gate itself (hermes-security) or adapter setup (hermes-gateways).
---


<objective>
Guarantee that what leaves reads as if the owner wrote it: no internal notes,
no machine traces, no caution jargon, no work files; the owner's tone,
address form and signature; an exact preview shown before the go; a final
scan by the chief that sends any draft with a single trace back for
correction. Enforcement of "no send without go" is not a Hermes setting - it
is built with hermes-security's go gate (native config, exact preview, then
the owner's existing send mechanism).
</objective>

# Hermes Outbound

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## Native vs pattern

| Piece | Status in 0.23.0 | Where |
|-------|------------------|-------|
| Approval for outbound email/messages | **Not native.** Hermes approvals cover dangerous terminal commands, MCP calls, optional memory/skill writes - not "send this email" | hermes-security |
| "No send without go" | **Pattern**: `approvals.deny` on send commands, no send credential in the agent profile, exact preview, then the owner's existing send mechanism after the go | [hermes-security locked-send-pattern.md](../hermes-security/references/locked-send-pattern.md) |
| Secret redaction on delivered cron output | Native | hermes-cron |
| Checklist, owner's voice, preview, final scan | **Pattern** (this skill) | references below |

## The outbound sequence

1. **Draft** in the owner's voice ([owner-voice.md](references/owner-voice.md)).
2. **Clean** with the checklist ([nothing-internal.md](references/nothing-internal.md)).
3. **Scan** mechanically for traces ([templates/trace-scan.md](references/templates/trace-scan.md)).
   One hit → back to step 2. The owner never sees a draft with a trace.
4. **Preview** exactly what the recipient receives - from, to, cc, subject,
   body, attachments - and nothing else
   ([show-before-go.md](references/show-before-go.md)).
5. **Go** from the owner, for that exact preview.
6. **Send** after the go through the send mechanism already on the owner's
   server (hermes-security). A changed draft needs a new preview and a new go.

## Critical rules

1. **The recipient never sees the kitchen.** Only what they must read.
2. **The chief does the final control**, not the owner. The owner sees only
   drafts that already passed the scan.
3. **Preview = what is sent**, byte for byte: the attachment shown is the
   attachment sent, not "a version of it".
4. **A go covers one preview.** Any edit after the go → new preview, new go.
5. **Never present "send only after go" as a Hermes setting** - state that it
   is enforced by `approvals.deny`, the missing send credential and the
   prompt rules.
6. **Employees never send.** Only the chief (or the mail manager named in
   `profile.yaml`) triggers the owner's existing send mechanism, after the go.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/security (approval scope, `approvals.deny`, `approvals.cron_mode`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (secret redaction on delivery)
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email
