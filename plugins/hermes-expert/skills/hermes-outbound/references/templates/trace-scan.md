# Trace scan - template script

A mechanical second pair of eyes for the chief's final control. It catches
the traces a re-read misses (a path in a footer, an agent name in metadata).
It does not replace the checklist: zero hits is necessary, not sufficient.

Save as `<scripts_root>/outbound-trace-scan/scan.py` with a one-line
`README.md` (hermes-workspace convention). Python 3 standard library only.
Attachments: extract their text first (e.g. `pdftotext file.pdf -` from
poppler) and pass the text file.

```python
#!/usr/bin/env python3
"""Scan outgoing text for internal traces. Exit 0 = clean, 1 = hits, 2 = usage error.

Usage: scan.py --terms terms.txt FILE [FILE ...]
terms.txt: one entry per line; lines starting with 're:' are regexes,
'#' starts a comment. Put agent names, profile names, board names and
internal phrases there (from profile.yaml) - never in this script.
"""
import argparse
import re
import sys
from pathlib import Path

BUILTIN = [
    r"(?i)\binternal (version|note|draft)\b",
    r"(?i)\bto be confirmed\b|\bTBC\b|\bTODO\b|\bFIXME\b",
    r"(?i)\breviewed by\b",
    r"(?i)\b(card|task|ticket)\s*#?\s*\d+\b",
    r"\bt_[0-9a-f]{6,}\b",
    r"(?:~|\.{1,2})?/(?:[\w.-]+/){2,}[\w.-]*",
    r"(?i)\b[A-Z]:\\(?:[\w .-]+\\)+",
    r"(?i)\bconfidence( level)?\s*[:=]?\s*\d{1,3}\s*%",
    r"(?i)\bas an ai\b|\blanguage model\b",
    r"(?i)\b(hermes|SOUL\.md|\.hermes\.md|kanban|delegate_task|subagent)\b",
]


def load_terms(path: Path) -> list[re.Pattern]:
    patterns = [re.compile(p) for p in BUILTIN]
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("re:"):
            patterns.append(re.compile(line[3:]))
        else:
            patterns.append(re.compile(r"(?i)\b" + re.escape(line) + r"\b"))
    return patterns


def scan(file: Path, patterns: list[re.Pattern]) -> list[str]:
    hits = []
    text = file.read_text(encoding="utf-8", errors="replace")
    for lineno, line in enumerate(text.splitlines(), start=1):
        for pat in patterns:
            for m in pat.finditer(line):
                hits.append(f"{file}:{lineno}: [{pat.pattern}] {m.group(0)!r}")
    return hits


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--terms", type=Path, required=True)
    parser.add_argument("files", type=Path, nargs="+")
    args = parser.parse_args()
    if not args.terms.is_file():
        print(f"terms file not found: {args.terms}", file=sys.stderr)
        return 2
    patterns = load_terms(args.terms)
    hits = [h for f in args.files for h in scan(f, patterns)]
    for h in hits:
        print(h)
    print(f"{len(hits)} hit(s)", file=sys.stderr)
    return 1 if hits else 0


if __name__ == "__main__":
    sys.exit(main())
```

## terms.txt example (placeholders)

```text
# agent and profile names from profile.yaml
<chief display name>
<manager display name>
# board / dossier markers
re:\b\d{4}-\d{2}_[a-z0-9-]+\b
# owner-specific internal phrases
<internal phrase>
```

## Notes

- The path regex flags any multi-segment path, including the path part of
  an `https://` URL. That is intended: an internal link looks the same as a
  public one. Confirm each recipient-facing URL in the preview note.
- Tested: clean text → exit 0; a draft with "reviewed by", a card number,
  an agent name, a server path and "to be confirmed" → exit 1, one hit each.
- The `hermes|kanban|...` line catches tool vocabulary; drop it only if the
  recipient is meant to read about the system itself.
- A legitimate hit (e.g. the owner's own product is called like an agent)
  goes into the preview note for the owner, never silently ignored.
