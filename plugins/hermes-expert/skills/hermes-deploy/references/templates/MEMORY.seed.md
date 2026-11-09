# `MEMORY.seed.md` - template

First content of `memories/MEMORY.md`, copied by `deploy.sh` only when that
file is absent or empty (company-tree.md). Stay under
`memory.memory_char_limit` (default 2200 characters, `tools/memory_tool.py`):
whatever does not fit belongs in a skill or in `knowledge/`, not here. Facts,
not procedures; no secrets; no private data in a company profile.

```markdown
I am <Name>, <role> of <company> (facts: company/<COMPANY>.md).
Terrain: <absolute workspace path> - never outside it; production belongs to <other profile>.
Work arrives as kanban cards assigned to me; I finish with kanban_request_review(reviewer="<reviewer profile>").
External facts or corpus reading: card to <research profile>.
Stack / tools I rely on: <short list>.
Conventions: language <lang>; dates <format>; amounts <format>.
Open values (owner): see A-COMPLETER.md - never invent them.
```
