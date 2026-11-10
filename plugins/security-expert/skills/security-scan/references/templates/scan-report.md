---
name: scan-report
description: Template for security scan reports - shared finding fields, scanner coverage, needs manual review, re-test after fix
keywords: report, template, findings, severity, confidence, owasp, cwe, coverage, retest
---

# Security Scan Report Template

Write the report in the audited repository at `docs/security/YYYY-MM-DD-<scope>.md`
(`<scope>` = `full`, a path such as `api`, or `diff-<branch>`). Never print a secret value: secrets
are reported as `file:line` + type only ([secrets-patterns.md](../secrets-patterns.md)). The agent
reports; it does not fix.

## Header

```
# Security Scan Report
**Project**: {project_name}
**Date**: {YYYY-MM-DD}
**Scope**: full repository | {path} | diff vs {base} (merge base {sha}), {n} files changed
**Languages / frameworks detected**: {list, from project markers and file extensions}
**Commit**: {git rev-parse HEAD}
```

## Summary

```
| Severity | Findings (confidence ≥ 8) |
|----------|---------------------------|
| CRITICAL | {n} |
| HIGH     | {n} |
| MEDIUM   | {n} |
| LOW      | {n} |
Needs manual review: {n}   Dropped after refutation: {n}
```

## Scanner coverage

State what was actually scanned; never imply coverage that did not happen.

```
### Automated pass
- Harness scanner: ran | not available — command: `bun .../bin.mjs scan <dir>`
- Coverage printed by the scanner: {languages and file counts as printed} | "no coverage summary printed"
- Present in the repo but NOT reported as scanned: {languages / extensions} → covered manually with {reference files}

### Optional tools (presence-checked, never installed)
| Tool | Present | Ran | Note |
|------|---------|-----|------|
| semgrep / opengrep | yes/no | yes/no | rules used; git-tracked files only |
| codeql | yes/no | yes/no | licence condition checked |
| betterleaks / gitleaks / trufflehog | yes/no | yes/no | git history scanned: yes/no |

### Manual pass
- Pattern references applied: {files}
- Excluded paths: {node_modules, vendor, build output, ...}
```

## Findings

One block per finding, confidence ≥ 8 only, ordered by severity.

```
### {id} [{SEVERITY}] {title}
- **Confidence**: {8-10}/10
- **CWE**: CWE-{n}
- **Standard**: A{nn}:2025 {category} [+ API{n}:2023 for API code]
- **Location**: `{file}:{line}`
- **Evidence**: {source → sink trace in words; quote code only if it contains no secret}
- **Exploit scenario**: {concrete attacker steps and what they obtain}
- **Recommendation**: {smallest change that removes the vulnerability}
- **Re-test after fix**: {exact command or check, e.g. `rg -n '<regex>' {file}` returns nothing, plus the behaviour to verify}
```

`id` format: `SEC-001`, `SEC-002`, … stable within the report.

## Needs manual review

Candidates scored 5-7: what is plausible, and the one fact that would confirm or refute it.

```
| Candidate | Location | Confidence | What to check |
|-----------|----------|------------|---------------|
| {title} | `{file}:{line}` | {5-7} | {config value, caller, deployment detail} |
```

## Hardening notes

Missing hardening with no shown attack path (for example an absent security header): no
severity, not counted as a finding.

```
- {title} — `{file}:{line}` or {URL}: {suggested change}
```

## Re-test after fix

The checklist the caller runs once fixes are applied (one row per finding):

```
| ID | Check to re-run | Expected result |
|----|-----------------|-----------------|
| SEC-001 | `{command}` | {no match / request rejected / test passes} |
```

## Out of scope / delegated

```
- Dependencies and CVEs: dependency-audit / cve-research report {path or "not run"}
- Auth flows: auth-audit {path or "not run"}
- Security headers: security-headers {path or "not run"}
```
