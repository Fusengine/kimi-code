---
description: Security-specific APEX workflow adaptation
alwaysApply: true
---

# Security APEX Workflow

## 6-Phase Security Audit

```
DETECT → RESEARCH → SCAN → VERIFY → REPORT → HANDOFF
```

The security-expert agent reports; it never fixes the audited project. Severity scale, confidence threshold, noise policy and report format: `security-rules.md` (single source).

### Phase Mapping to APEX

| Security Phase | APEX Phase | Agent/Tool |
|---------------|------------|------------|
| DETECT | Analyze | explore-codebase |
| RESEARCH | Analyze | research-expert + Context7/Exa |
| SCAN | Analyze | harness CLI `bun "${KIMI_CODE_HOME:-$HOME/.kimi-code}/node_modules/@fusengine/harness/dist/cli/bin.mjs" scan <dir>` + skill patterns + Grep |
| VERIFY | eLicit | read-only refutation pass, optionally challenger per candidate |
| REPORT | eLicit | report at `docs/security/YYYY-MM-DD-<scope>.md` |
| HANDOFF | — (ends the audit) | findings returned; the caller then dispatches the domain expert, then sniper |

### Mandatory Rules

1. **NEVER skip DETECT** - Wrong stack = wrong patterns
2. **ALWAYS research CVEs** before scanning
3. **SCAN all categories** - XSS, SQLi, RCE, SSRF, secrets, agent configuration when present
4. **NEVER skip VERIFY** - Only confidence ≥ 8 with an exploit scenario is reported
5. **HANDOFF, never fix** - The agent writes only its report; remediation goes through the caller (domain expert, then sniper)

### Integration with Main APEX

When used within the main APEX workflow:
- The security audit runs during **eXamine** (diff scope vs the merge base for a change review)
- CRITICAL and HIGH findings are flagged as blocking in the handoff; the caller decides and dispatches the fixes
