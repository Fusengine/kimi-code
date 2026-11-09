# Knowledge base - `SCHEMA.md`, `index.md`, `log.md` templates

`<company>/knowledge/` is the reusable memory the research manager writes and
every manager reads before producing. Three files keep it trustworthy: the
schema (rules), the index (what exists), the log (what changed, from which
card). A note that is not in the index does not exist for the other agents.

```
knowledge/
├── SCHEMA.md     conventions (below)
├── index.md      one line per note, grouped by sector
├── log.md        dated journal of every create/update
├── <sector>/     one folder per sector listed in SCHEMA.md
├── raw/          sources as fetched, not yet curated
├── resolved/     resolved cases (one per closed card worth keeping)
└── drafts/       notes not yet verified
```

## `SCHEMA.md`

```markdown
# Knowledge base schema - <company>

## Domain
Facts useful to <company>: <sectors in one line>.

## Conventions
- Lowercase file names with hyphens, one subject per note.
- YAML frontmatter mandatory; dates in <date format, e.g. dd.mm.yyyy>.
- Every figure or legal fact carries a URL and a consultation date; otherwise "to verify".
- Every note is indexed in index.md and traced in log.md.

## Tags
- meta: to-verify

## Sectors
<sector-a> · <sector-b> · <sector-c> · raw.
```

## `index.md`

```markdown
# Knowledge base index - <company>

Last update: <date>

## <sector-a>
- [[<sector-a>/<note-name>]] - <what it answers> (updated <date>, confidence <low|medium|high>: <why>).
```

## `log.md` (newest first)

```markdown
# Knowledge base log - <company>

## [<date>] create|update | <subject>
- Card <card-id>; note <sector>/<note-name>.md.
- What changed, sources actually read, limits, confidence.
```

## Note frontmatter

```yaml
---
title: <subject>
created: <date>
updated: <date>
type: <research | procedure | resolved-case | ...>
sector: <sector>
tags: [<tag>]
sources:
  - <https://...>          # consultation date in the body next to each fact
confidence: <low|medium|high>
contested: false
---
```
