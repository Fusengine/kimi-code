---
description: Security audit business rules and compliance requirements
alwaysApply: true
---

# Security Rules

Single source for the severity scale, the noise policy and the report format of the security-expert agent and `/scan`.

## Standards (current editions)

Every full repository audit (not a partial `--deps-only` / `--headers` / `--auth` run) checks all ten OWASP Top 10:2025 categories (https://owasp.org/projects/top-ten — https://top10.owasp.org/2025):
- **A01** Broken Access Control (includes SSRF, CSRF)
- **A02** Security Misconfiguration
- **A03** Software Supply Chain Failures
- **A04** Cryptographic Failures
- **A05** Injection (SQLi, XSS, CMDi)
- **A06** Insecure Design
- **A07** Authentication Failures
- **A08** Software or Data Integrity Failures
- **A09** Security Logging and Alerting Failures
- **A10** Mishandling of Exceptional Conditions

Other references, cited when applicable: OWASP ASVS 5.0.0, OWASP API Security Top 10 2023, OWASP MASVS 2.1.0, CWE Top 25 2025, OWASP Top 10 for LLM Applications (2025 and 2026 editions, cited with the edition, e.g. `LLM01:2026`), OWASP Top 10 for Agentic Applications for 2026 (https://genai.owasp.org/initiatives/agentic-security-initiative/).

Each finding cites a CWE id plus the applicable standard entry; a CVE id only for a known vulnerability in a dependency.

## Severity (single definition)

| Severity | Definition | Examples |
|----------|------------|----------|
| **CRITICAL** | Directly exploitable, no or low privilege, leads to remote code execution, full data compromise or credential exposure | Hardcoded live secret, SQL/command injection, `eval`/`exec` on user input |
| **HIGH** | Exploitable with a realistic precondition; leads to account takeover, unauthorized data access or privilege escalation | Broken access control on an object, stored XSS, unvalidated redirect used in an auth flow |
| **MEDIUM** | Exploitable only under specific, concrete conditions, or limited impact | Reflected XSS behind an unusual precondition, weak crypto protecting non-critical data |
| **LOW** | Real weakness with a shown attack path but minor impact | Information disclosure of non-sensitive internals |

This scale is the only one for reported findings. A CVSS score or a skill's baseline (e.g. a header's default level) is an input to this scale, never a substitute: the final severity is set by the definitions above.

CRITICAL and HIGH findings are flagged in the handoff as blocking for the caller; remediation is the caller's decision and dispatch.

## Verification and Confidence

- Every candidate goes through a second, read-only pass that tries to refute it: data flow traced to the sink, framework protections checked, reachability checked.
- Confidence 1-10. **≥ 8 → reported finding**; < 8 → "Needs manual review" list with the reason.
- Every reported finding has a concrete exploit scenario.
- Basis: Anthropic's security-review command (https://raw.githubusercontent.com/anthropics/claude-code-security-review/main/.claude/commands/security-review.md) — one finding pass, one false-positive filter per finding, findings under confidence 8 dropped — and Claude Code Security, where "Claude re-examines each result, attempting to prove or disprove its own findings" (https://www.anthropic.com/news/claude-code-security).

## Not Reported (noise policy)

This plugin's own policy, inspired by the exclusion list of the security-review command above. The following are NOT reported as vulnerabilities unless a concrete attack path is shown:
- Missing hardening alone (no exploitable consequence) — e.g. an absent security header; listed under "Hardening notes" (no severity), not as a finding
- Theoretical race conditions or timing attacks
- Denial of service and resource exhaustion without a shown attack path. Exceptions that ARE findings (the reachable endpoint is the attack path; severity by the single scale above): a missing rate limit on an authentication, password-reset, OTP or other abuse-prone endpoint, and a GraphQL endpoint without depth/cost limits that is reachable without authentication. The same gaps without a shown path are never silently dropped: they go to "Hardening notes"
- Code only in test files or only used to run tests
- Documentation files (Markdown) — EXCEPT agent-configuration files (`CLAUDE.md`, `AGENTS.md`, rule, memory, skill, agent and command files), which skill `agentic-security` audits as executable instructions
- Outdated libraries — handled by skill `dependency-audit`, not as code findings

## Secrets

- Detection patterns: single source `skills/security-scan/references/secrets-patterns.md` (not repeated here).
- A secret value is NEVER printed in a report, log or message: file:line and secret type only.

## Dependencies

- Procedure and optional tools: skill `dependency-audit`. Audit CLIs are optional, checked with `command -v`, never installed; a missing tool is reported "not run".

## Report

Written to `docs/security/YYYY-MM-DD-<scope>.md` inside the audited repository (never a temp or hidden directory); its path is returned to the caller.

Contents:
1. Scope (repository or diff vs merge base) and date
2. Executive summary: findings count by severity
3. Findings, each with: id, title, severity, confidence (1-10), CWE, standard reference, location (file:line, package@version or URL), evidence, exploit scenario, recommendation
4. Needs manual review (confidence < 8, with reason)
5. Hardening notes (missing hardening without a shown attack path; no severity)
6. Dependency audit results
7. Tools run / not run, and categories not covered (partial runs)
