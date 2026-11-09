# Brief format - template

Paste into the morning-brief job prompt or into a skill attached with
`--skill`. Placeholders `<...>`; tags `[company]` / `[private]` come from the
entities in `profile.yaml`.

```markdown
<Weekday> <date> · <time> · <assistant name>

### Urgent
- [private] <subject>: <what is at stake, deadline>. <one proposed action>?

### Decisions waiting
- [company] <subject> ready and reviewed since <date>. Send?
- [company] <subject>: <key figure>. Shall I have it finalised?
- [private] <subject>: waiting for <missing item>.

### Company
- [company] <dossier>: <movement or blocker>. <proposal>.

### Agenda
- <time> <appointment> (<place>)
```

## Rules

- One line per item, one proposed action per line, ending in a question
  when a decision is needed.
- Oldest decision first; show its age when over 3 days.
- Amounts and dates come from the dossier; unconfirmed ones say so.
- No card numbers, agent names or file paths in the owner-facing text
  unless the owner asked for them.
- Nothing new in a section → omit the section.

## Evening review shape

```markdown
### Done
- <deliverable> handed over to you at <time>.
### Left
- <item>: next step <step>, by <date>.
### Waiting for you
- <decision> (since <date>).
```
