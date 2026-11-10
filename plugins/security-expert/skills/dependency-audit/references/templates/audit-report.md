---
name: audit-report
description: Report template for a dependency and supply-chain audit, following the shared finding contract (confidence, CWE, standard reference, refutation pass)
keywords: report, dependency, vulnerability, advisory, supply-chain, template
---

# Dependency Audit Report Template

Write to `docs/security/YYYY-MM-DD-<scope>.md` inside the audited repository
(`<scope>` e.g. `dependencies`). The audit never applies fixes: remediation commands appear
only under "Fix options".

```markdown
# Dependency Audit — {project_name}

**Date**: {YYYY-MM-DD}  **Scope**: {lockfiles and workflow files audited}
**Commit**: {git rev-parse --short HEAD}

## Tools

| Tool | Version | Status |
|------|---------|--------|
| bun audit | {bun --version} | run |
| govulncheck | — | not run: govulncheck absent |

## Summary

| Severity | Findings | Needs manual review |
|----------|----------|---------------------|
| CRITICAL | {n} | {n} |
| HIGH | {n} | {n} |
| MEDIUM | {n} | {n} |
| LOW | {n} | {n} |

## Findings (confidence ≥ 8, survived the refutation pass)

### {id} — {title}
- **Severity**: {CRITICAL|HIGH|MEDIUM|LOW} — CVSS {version} {score} `{vector}` (source: {GitHub|NVD|CNA})
- **Confidence**: {8-10}/10
- **CWE**: {CWE-xxx}
- **Standard**: OWASP Top 10:2025 A03 Software Supply Chain Failures
- **Location**: {package}@{installed_version} via {lockfile} (or {file}:{line} for CI/supply-chain checks)
- **Evidence**: {advisory id + affected range; resolved version from lockfile; reachability evidence}
- **Exploit scenario**: {how an attacker reaches the vulnerable code in this project}
- **Recommendation**: {fixed version or alternative}
- **Refutation pass**: {what was checked to try to disprove it, and why it holds}

## Needs manual review (confidence < 8)

| Package / file | Advisory or check | Why not confirmed |
|----------------|-------------------|-------------------|

## Fix options (for the owner — not run by the audit)

| Command | Changes |
|---------|---------|
| `bun audit fix --dry-run` then `bun audit fix` | bun.lock, node_modules, exact pins in package.json |
```

## Field rules

- `id`: stable within the report (`DEP-001`, `SC-001`, `CI-001`) plus the advisory id
  (GHSA / CVE / RUSTSEC / GO-…) when one exists.
- Severity from the advisory's CVSS when present; state the CVSS version and who scored it.
- A dev-only dependency that never ships, or a vulnerable function never called, lowers
  confidence: report it under manual review unless exploitation in the build path is shown.
