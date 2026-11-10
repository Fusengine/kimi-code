---
name: verification
description: Read-only refutation pass every candidate finding must survive, confidence scale, and what a static agentic audit cannot prove
when-to-use: After the checklists, before writing any finding into the report
keywords: verification, false positive, confidence, refutation, limits, needs manual review
priority: critical
related: templates/audit-report.md, templates/audit-checklist.md
---

# Verification Pass and Limits

## Refutation pass (read-only, for every candidate)

Try to prove the candidate wrong before reporting it. Record each answer in the finding.

1. **Reachability** — Is the file actually loaded? (Is the plugin enabled by this repository's
   settings, is the hook file referenced or at its default location, is the workflow trigger live,
   is the server listed for this scope?) Unreferenced or dead config is not a finding.
2. **Value check** — For secrets: literal value, not a `${VAR}` reference, placeholder or
   example file. For endpoints: a third-party host, not the vendor or localhost.
3. **Version check** — If the risk depends on Claude Code behavior, quote the current
   documentation line that makes it true today. A fixed CVE alone does not make a current finding.
4. **Mitigation check** — Is there a sandbox, network isolation, a deny hook, `--bare` /
   `--setting-sources user`, or a maintainer approval gate that neutralises the path? A mitigation
   lowers severity; it is recorded, not ignored.
5. **Trust-state check** — Does the risk need a never-trusted folder, a `-p` run, or a user who
   already accepted trust? State which; the severity differs.
6. **Independent re-read** — Re-open the exact file:line and confirm the evidence line matches
   what the finding says (no paraphrase drift).

## Confidence scale

| Score | Meaning | Destination |
|-------|---------|-------------|
| 9-10 | Evidence read at file:line, path reachable, no mitigation found, behavior quoted from current docs | Finding |
| 8 | As above with one assumption stated explicitly (for example a GitHub setting not visible from the repo) | Finding |
| 5-7 | Plausible, but reachability, value or trust state not confirmed | Needs manual review |
| 1-4 | Pattern match only | Needs manual review, or drop with a note |

Only confidence 8 or more is reported as a finding.

## Severity guide

The scale and its definitions are the plugin's `rules/security-rules.md`; this table gives typical
agentic cases for each level.

| Severity | Typical case |
|----------|--------------|
| CRITICAL | Code execution or credential exfiltration on clone/open or in CI without any human step |
| HIGH | Same impact behind one routine human action (accepting trust, enabling a plugin), or a literal live secret |
| MEDIUM | Prompt-injection path to write or network tools with a partial mitigation; broad allow rules |
| LOW | Shown attack path with minor impact, e.g. non-sensitive `userConfig` with low-value data |

Hygiene with no shown attack path (for example an unpinned but reputable server) is a hardening
note without severity, not a finding.

## What this skill does not prove

- A static read shows that untrusted text can reach the model; it cannot prove the model will
  follow it. Injection success depends on the model, its context and the tools it holds; OWASP
  LLM01:2026 states there is "no clean equivalent to parameterized queries".
- It does not execute hooks, MCP servers or workflows, and never opens the repository with an
  agent to "test" the trust dialog.
- It does not audit the code of third-party MCP servers or actions beyond what is in the repository.
- It cannot see user-level, managed or GitHub-side settings unless the owner provides them.
- Vendor behavior is version-dependent: every documented fact in the references is dated by the
  read date of its source, and must be re-checked when the documentation changes.
