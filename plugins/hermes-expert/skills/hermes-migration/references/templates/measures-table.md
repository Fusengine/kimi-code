# Before / after table - template

Fill with raw numbers from the same commands (measures.md). Keep the raw
command outputs next to this file.

```markdown
# Before / after - <install label>

Window before: <YYYY-MM-DD → YYYY-MM-DD> · Window after: <YYYY-MM-DD → YYYY-MM-DD>
Model(s) compared: <same | different - say which>

| Point | Before | After | Source |
|-------|--------|-------|--------|
| Role | <e.g. dispatches cards> | <e.g. pilots with the owner> | SOUL.md |
| Instruction size (system prompt total) | <bytes> | <bytes> | hermes prompt-size |
| SOUL.md + workflow files | <KB> | <KB> | wc -c |
| Tokens per call (avg) / main session messages | <n> / <n> | <n> / <n> | hermes insights, sessions list |
| Failures in window (by kind) | <voice n, delivery n, tool n> | <...> | hermes logs, cron doctor |
| Broken promises (open past due) | <n> | <n> | registry |
| Cards per corrected request | <n> | <n> | kanban list |
| Rituals on time / week | <n/n> | <n/n> | cron list |
| Notifications in owner conversation / day | <n> | <n> | channel history |
| Voice | <state> | <state + backup tested> | test day |
```

Rule: a cell without a source is left empty, never estimated.
