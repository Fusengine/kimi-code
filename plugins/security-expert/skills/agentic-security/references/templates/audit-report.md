---
name: audit-report
description: Complete report template for an agentic security audit, with the shared finding fields
keywords: report, template, findings, severity, confidence, cwe, owasp, agentic
---

# Agentic Security Audit Report Template

Write to `docs/security/YYYY-MM-DD-<scope>.md` inside the audited repository. Never include a
secret value anywhere in the report; use `[REDACTED]` in evidence lines.

```
# Agentic Security Audit — {scope}

**Repository**: {repo}   **Commit**: {sha}   **Date**: {YYYY-MM-DD}
**Areas covered**: {trust | hooks | mcp | injection | permissions | secrets | ci}
**Areas not covered**: {list + reason}
**User-level config read**: {no | yes, on owner request: paths}
**Mode**: read-only report; no file of the audited project and no setting was changed.

## Summary

| Severity | Findings |
|----------|----------|
| CRITICAL | {n} |
| HIGH     | {n} |
| MEDIUM   | {n} |
| LOW      | {n} |
| Needs manual review | {n} |

## Findings (confidence 8 or more, each survived the refutation pass)

### {id} — [{SEVERITY}] {title}
- **Confidence**: {8-10}/10
- **CWE**: {CWE-id: title | none}
- **Standard reference**: {LLM01:2026 Prompt Injection | ASI04 Agentic Supply Chain Vulnerabilities | ...}
- **Location**: `{file}:{line}`
- **Evidence**: `{exact line, secrets replaced by [REDACTED]}`
- **Exploit scenario**: {who controls the input, what runs or leaks, on which session type}
- **Recommendation**: {change for the owner to make; this audit does not apply it}
- **Verification**: reachability {ok}; value {ok | n/a}; current-doc line {quote + URL};
  mitigations {none | list}; trust state {never-trusted | -p | after trust}

## Needs manual review (confidence below 8)

| id | Check | Location | Why unconfirmed | What would confirm it |
|----|-------|----------|-----------------|-----------------------|
| {id} | {check id} | `{file}:{line}` | {reason} | {action} |

## Hardening notes (no severity, no shown attack path)

- {check id} `{file}:{line}` — {missing hardening and the suggested change}

## Inventory

| Surface | Items found |
|---------|-------------|
| Hooks | {event → command, per source file} |
| MCP servers | {name, source, transport, pinned yes/no} |
| Agent / skill files with tools | {file → tools} |
| CI steps running an agent | {workflow → job → step} |

## Limits

A static read does not prove that an injection succeeds or that a hook is malicious in intent.
See the "What this skill does not prove" section of the agentic-security skill.
```

Finding id format: `AGT-{area}-{nn}` with area one of `TRUST`, `HOOK`, `MCP`, `PI`, `PERM`,
`SEC`, `CI` (for example `AGT-MCP-02`).
