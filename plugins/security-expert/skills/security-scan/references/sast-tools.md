---
name: sast-tools
description: Optional SAST engines (Semgrep CE, Opengrep, CodeQL) - presence check, licence notes, commands as read on official docs
when-to-use: When deterministic data-flow analysis would complement the pattern scanner and the manual patterns, and an engine is already installed
keywords: sast, semgrep, opengrep, codeql, licence, static analysis, sarif
priority: medium
related: triage.md, secrets-patterns.md, scan-patterns.md
---

# Optional SAST Engines

Optional: the skill works without them. The agent never installs a tool; it only uses what is
already on the machine and records what ran and what was absent in the report's scanner coverage
section.

```bash
command -v semgrep opengrep codeql
```

Why combine: a deterministic engine reproduces its findings run after run, while LLM review of
unverified findings is unstable across identical runs (see [triage.md](triage.md)). Engine output
is still a lead: every result goes through the refutation pass before it is reported.

## Semgrep Community Edition

- Licence (https://docs.semgrep.dev/licensing, read 2026-11-10): the Semgrep CE engine is LGPL-2.1.
  Registry rules in the `semgrep-rules` repository are under the Semgrep Rules License v1.0: internal
  business use only; vendors cannot use them in competing products or SaaS offerings. Third-party
  registry rules keep their own licence (shown in the rule).
- Command (https://semgrep.dev/docs/getting-started/quickstart-ce, read 2026-11-10):
  `semgrep scan --config "<ruleset>" <path>`; without `--config`, `semgrep scan` pulls community
  rules from the registry (network access).
- `semgrep scan` exits 0 when the scan completes, findings or not, unless `--error` is passed
  (https://semgrep.dev/docs/getting-started/cli). Read the findings, not the exit code.
- The scan status reports files "tracked by git": untracked files are not scanned. Say so in the
  coverage section.
- Do not use `semgrep ci` or `semgrep login`: they tie the scan to a Semgrep account.

## Opengrep

- Licence (https://github.com/opengrep/opengrep, read 2026-11-10): LGPL-2.1 fork of Semgrep; states
  compatibility with Semgrep rules. Rule licences are separate from the engine licence: the Semgrep
  licensing page above sets the terms of Semgrep-maintained rules; this skill's reading is that
  those terms still apply when the rules are run by Opengrep (the Opengrep page does not address it).
- Commands (same page): `opengrep scan -f <rules-dir> <path>`; SARIF:
  `opengrep scan --sarif-output=<file.json> -f <rules-dir> <path>`.
- The example output reads "Scanning 1 file (only git-tracked)": untracked files are skipped.
- Opengrep needs a rule source (`-f`); without a rules directory there is nothing to run.

## CodeQL

- Licence (https://raw.githubusercontent.com/github/codeql-cli-binaries/main/README.md, read
  2026-11-10): usable only on codebases released under an OSI-approved open source licence, or for
  academic research; it cannot be used to generate databases for or during automated analysis,
  continuous integration or continuous delivery without a commercial agreement.
- Consequence: an agent-driven scan can itself be automated analysis. Run CodeQL only when the
  audited repository is released under an OSI-approved licence (check its `LICENSE`) or the owner
  confirms a commercial agreement covering this use. Otherwise record "CodeQL present, not run:
  licence".
- Commands: not written here (CLI usage not verified today); follow
  https://codeql.github.com/docs/codeql-cli/ if it is run.

## Secret scanners

Betterleaks, Gitleaks and TruffleHog: see [secrets-patterns.md](secrets-patterns.md#optional-git-history-and-broader-secret-scanners).
