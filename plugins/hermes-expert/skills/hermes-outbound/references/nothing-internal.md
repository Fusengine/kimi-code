# Nothing internal leaves - checklist

Multi-agent work leaves residue: review notes, agent names, card numbers,
hedges added "just in case". Inside, that residue is useful; outside, it
tells a client they are reading a machine's work file. The checklist exists
because a single leaked internal block in a client document costs more trust
than the whole document earns.

## The four families

| Never leaves | Examples to look for |
|--------------|----------------------|
| **Internal notes** | "internal version", assumptions, validation notes, reservations, "to be confirmed", TODO, open questions to the owner |
| **Machine traces** | Agent or manager names, "reviewed by <agent>", card or task numbers, file paths, workspace folder names, work sources and research trails, model names, tool names |
| **Caution jargon** | Generic disclaimers, confidence levels, "as an AI", legal mentions added by default rather than required |
| **Work files** | An internal PDF attached as is, drafts with tracked changes or comments, files with internal metadata (author = agent, internal title) |

## Checklist (tick every line before the preview)

- [ ] Every sentence is something the recipient needs to read.
- [ ] No name of an agent, profile, manager or employee.
- [ ] No card/task id, no path, no folder name, no URL to an internal tool.
- [ ] No "to be confirmed", no assumption phrased as such - confirm or remove.
- [ ] No confidence level, no generic disclaimer; legal text only when the
      content requires it and the owner's legal manager wrote it.
- [ ] Facts that came from research are stated, not their research trail.
- [ ] Attachments are the clean recipient version (exported fresh), named
      for the recipient, not the internal deliverable name.
- [ ] Document metadata (title, author, comments, tracked changes) cleaned.
- [ ] Address form, language and signature match the contact (owner-voice.md).
- [ ] Trace scan passed with zero hits (templates/trace-scan.md).

## Where to put it

- In the chief's SOUL.md: rule 6 "nothing internal leaves" (one line).
- In the mail manager's SOUL.md: the same line + "run the outbound skill
  before any preview".
- The full checklist stays here (or as a Hermes skill the profile loads with
  `skills.auto_load`, hermes-extend) - not pasted into SOUL.md.

## When a trace is found

One hit is enough to send the draft back for correction before the owner
sees it. Log the family of the hit in the dossier's `travail/` notes so the
pattern can be fixed at its source (a manager prompt, a template).
