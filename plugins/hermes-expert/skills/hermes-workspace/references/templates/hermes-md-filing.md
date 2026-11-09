# `.hermes.md` filing block - template

Three files, nested (layout.md): `<chief_root>/.hermes.md` is the full
reference (tree, "where does it go?" table from layout.md, the company /
private criterion, transition symlinks); `<company>/.hermes.md` and
`<private>/.hermes.md` carry the block below plus their own rules (company:
outbound email block at the end). Same rules for the chief and every agent.
Keep each short - it is loaded into every session started under that root
(context-file cap applies, hermes-core).

```markdown
# Workspace rules - <root label>

<chief_root> is synced to <owner>'s drive: everything written here is seen
by <owner>. Full reference: <chief_root>/.hermes.md.

This root is <company | private>. Never copy, link or attach anything from
the other root. Unsure whether something is company or private: ask the
chief. Never create a new top-level folder - ask the chief.

## Where things go
- New matter: dossiers/YYYY-MM_subject/ with README.md, pieces/, travail/, livrables/
- Client work: clients/<client>/
- Not yet filed: 00-inbox/
- Closed: archives/YYYY/ · Candidates for deletion: archives/to-delete/
- Scripts: <scripts_root>/<name>/ with a README - never in this root
- Temporary files: <scratch_root>/<card-id>/ - never in this root

## Rules
- pieces/ are never modified. Notes are .md in travail/.
- Deliverables: livrables/YYYY-MM-DD_subject_vN.ext - never "final",
  "current", "latest", "now" in a name; new version = vN+1, old one to archives/
- Nothing is deleted by an agent. Move to archives/to-delete/; the list goes
  to the chief, who asks <owner>; only what <owner> approves is deleted.
- Employees write only in the folder of their card.
- No secrets here (.env, tokens, passwords, cookies, HAR, key exports).
- Transition symlinks (old paths): <old path> -> <new path>. Never create
  anything under them.
- Knowledge: knowledge/ follows knowledge/SCHEMA.md.

## Before reporting a task done
Right dossier · notes in .md · temporary files outside · deliverable well
named · script with README · nothing deleted · README updated.
```

## Company root only - outbound email block

Put it **first** in `<company>/.hermes.md` when the company sends mail
through an existing wrapper (found by discovery, hermes-security
`locked-send-pattern.md`; never written by the agent). Fill the wrapper's
real flags from its `--help`.

```markdown
# <company> - outbound email rules

Every outbound email (new message or reply) goes through <wrapper path>,
never the mail CLI's send command or a raw .eml.
- Pick the sending account with <account flag>; the wrapper adds that
  account's signature - never add one by hand.
- Body without signature from a file (<body flag>); a reply keeps
  In-Reply-To (<reply flag>); one <attachment flag> per attachment.
- <render flag> to check locally without sending, <draft flag> for a draft,
  <send flag> only when a real send was explicitly approved.
- Before every real send, check the render: signature once (text and HTML),
  body and attachments intact, In-Reply-To present for a reply.
- Applies to email only - never to kanban comments or chat messages.
```
