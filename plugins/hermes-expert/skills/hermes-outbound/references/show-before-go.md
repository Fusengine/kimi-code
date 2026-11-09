# Show exactly what will leave, then the go

The owner approves what the recipient will receive - not a summary of it,
not an earlier draft. The preview is the contract that the go refers to.

## The preview

Show these fields and nothing else (template:
[templates/outbound-preview.md](templates/outbound-preview.md)):

- **From** - the exact sending address
- **To / Cc / Bcc** - exact addresses
- **Subject**
- **Body** - the full text, rendered as sent
- **Attachments** - file name as the recipient will see it, page count,
  and the file itself (attached to the preview message)

Then one line: "Ready. I recommend sending. Go?"

No internal commentary inside the preview block. Notes for the owner (why
this wording, what changed since v1) go above the block, clearly separated,
and are never part of what is sent.

## The chief's final control

Before the preview reaches the owner, the chief:

1. Re-reads the exact outgoing version, looking only for internal traces
   (checklist families in [nothing-internal.md](nothing-internal.md)).
2. Runs the mechanical scan ([templates/trace-scan.md](templates/trace-scan.md))
   on the body and on the text of every attachment.
3. One hit → back for correction; the owner never sees that version.

## Binding the go to the preview

So that "go" cannot send something else:

- Keep the prepared message as a file in the dossier (`livrables/`); the
  attachment shown in the preview is that exact file.
- After the go, the send runs through the send mechanism already on the
  owner's server, never through a script this plugin ships
  ([hermes-security locked-send-pattern.md](../../hermes-security/references/locked-send-pattern.md)).
- Any edit → new preview, new go.

This binding is a **pattern** - Hermes has no native "send after go" gate.
Back it with `approvals.deny` patterns that block direct use of mail
tools/commands (checked even when `approvals.cron_mode: approve`), and no
send credential in the agent profile (hermes-security).

## What counts as a go

Explicit words defined in the chief's SOUL.md (e.g. "go", "send", "ok").
Silence, a thumbs-up on another message, or "looks good" on an earlier
version are not a go. A go is recorded in the registry with the preview it
approved (hermes-rhythm).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/security (`approvals.deny`, `approvals.cron_mode`)
