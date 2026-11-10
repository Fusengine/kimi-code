---
name: triage
description: Verification of candidate findings - refutation pass, confidence 1-10, threshold 8, severity by impact and exploitability, classes not reported without an attack path
when-to-use: After the scanner and manual patterns produced candidates, before anything is written in the report
keywords: triage, false positive, refutation, confidence, severity, exploit scenario, verification
priority: high
related: scan-patterns.md, secrets-patterns.md, sast-tools.md, templates/scan-report.md
---

# Triage: from match to finding

A scanner hit, a grep match or an engine result is a **candidate**. It becomes a **finding** only
after this pass. The agent reports findings; it does not fix them.

## Why a separate verification pass

- Anthropic's public security-review command
  (https://raw.githubusercontent.com/anthropics/claude-code-security-review/main/.claude/commands/security-review.md,
  read 2026-11-10) splits the work in two: one pass identifies candidates, then each candidate is
  re-examined in its own sub-task against false-positive rules, and anything scored below 8 out of
  10 is dropped. It asks for a concrete exploit scenario per finding and favours missing a
  theoretical issue over flooding the report. This skill follows the same structure, in its own
  words and with its own exclusion list below.
- Snyk VulnBench JS 1.0 (https://snyk.io/blog/snyk-vulnbench-js-1-0-llm-security-review-repeatability/,
  2026-06-29; a vendor study by a SAST vendor, measured against its own tool's reference set) ran
  repeated identical LLM reviews: findings that matched the reference set were mostly stable, while
  model-only extra findings were not (80 of 161 unique unmatched findings appeared in only one of
  five identical runs). Its conclusion is to combine deterministic analysis with model review.
  Hence: deterministic tools where available ([sast-tools.md](sast-tools.md)) plus this
  read-only refutation pass on every candidate.

## Refutation pass (read-only, per candidate)

Try to prove the candidate wrong. Record each answer; one decisive "no" ends it.

1. **Source**: where does the value come from? Trace it backwards to an HTTP request, CLI input
   from an untrusted user, file upload, message queue, third-party API or database field written
   by users. Environment variables and deployment config are trusted.
2. **Sink**: does the traced value reach the dangerous call unchanged, or through code that
   validates, encodes, parameterizes or allowlists it?
3. **Framework protection**: auto-escaping templates (JSX, Blade `{{ }}`, Jinja autoescape, Razor),
   parameterized tagged templates and ORMs, built-in CSRF middleware, server-only modules. A
   framework protection that is bypassed explicitly (raw HTML, raw SQL, disabled middleware) does
   not count.
4. **Reachability**: is the code reachable in production (route registered, export used, feature
   flag on)? Who can reach it (anonymous, any user, admin only)?
5. **File nature**: test, fixture, example, documentation, generated or vendored code? Then the
   candidate is not reported, unless it ships in the production artifact.
6. **Exploit scenario**: write the concrete steps an attacker takes and what they obtain. No
   scenario, no finding.

## Confidence (1-10)

| Score | Meaning | Destination |
|-------|---------|-------------|
| 9-10 | source, sink and reachability confirmed in the code; scenario concrete | Findings |
| 8 | clear vulnerable pattern with a known exploitation method; one minor assumption | Findings |
| 5-7 | plausible, depends on something the code does not show (config, caller, deployment) | Needs manual review (state what to check) |
| 1-4 | refuted or speculative | dropped; count only, in the coverage section |

Threshold: **only confidence ≥ 8 is reported as a finding.**

## Severity (impact × exploitability)

Same scale as the single definition in the plugin's `rules/security-rules.md`; the rows below
restate it with triage examples.

| Severity | Definition |
|----------|------------|
| CRITICAL | exploitable by an unauthenticated or any low-privilege user, leading to code execution, authentication bypass, bulk data access/modification, or a live production credential |
| HIGH | exploitable with realistic preconditions, leading to another user's data or account, stored XSS, SSRF into internal services, privilege escalation |
| MEDIUM | needs specific conditions (user interaction, non-default config, insider position) or has limited impact |
| LOW | real weakness with a shown attack path but minor impact; a defense-in-depth gap with no attack path is a hardening note (no severity), not a finding |

The severity verified here overrides the raw label printed by the automated scanner and the "max
severity" column of the pattern references. Example: a `child_process` import or a `mysql_query(`
call may be labelled CRITICAL or HIGH by a tool; its verified severity depends on whether user input
reaches it and who can reach the code.

## Classes not reported without a concrete attack path

These are reported only when the refutation pass yields a specific, reachable exploit; otherwise
they go to "needs manual review" or are dropped:

- denial of service, resource exhaustion, regex DoS. Exceptions that ARE findings (the reachable
  endpoint is the attack path; severity by the scale above): a missing rate limit on an
  authentication, password-reset, OTP or other abuse-prone endpoint, and a GraphQL endpoint
  without depth/cost limits that is reachable without authentication (see
  [graphql-security.md](graphql-security.md)). The same gaps without a shown path go to
  "Hardening notes", never silently dropped;
- missing hardening that is not itself a vulnerability (absent header, absent audit log);
- theoretical race conditions and timing attacks;
- open redirect, prototype pollution, tabnabbing, XS-Leaks;
- SSRF where the user controls only the path or a query value, not the host or protocol;
- missing checks in client-side code (the server is the trust boundary);
- XSS in React/Vue/Svelte/Astro components that do not use a raw-HTML API;
- logging of non-sensitive data (secrets, passwords and personal data in logs are reportable);
- command injection in shell scripts or CI workflows that no untrusted input reaches;
- outdated dependencies (handled by [dependency-audit](../../dependency-audit/SKILL.md));
- anything in tests, fixtures, examples or documentation files.

## Second read-only pass

Before writing the report, re-read every finding at its `file:line` with fresh context (a separate
sub-task when available) and re-score it. A finding whose score drops below 8 moves to "needs manual
review". Neither pass edits files.
