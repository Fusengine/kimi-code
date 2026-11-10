---
name: standards-map
description: OWASP LLM Top 10 (2025 and 2026), OWASP Top 10 for Agentic Applications 2026 and CWE entries, as read on their sources, mapped to the audit areas
when-to-use: Filling the "standard reference" and "CWE" fields of a finding
keywords: OWASP, LLM01, LLM03, LLM06, ASI01, ASI02, ASI03, ASI04, ASI05, ASI06, CWE
priority: high
related: prompt-injection.md, templates/audit-report.md
---

# Standards Map

Cite an entry with its edition (`LLM01:2025`, `LLM01:2026`, `ASI01`). Numbering changed between
LLM editions: Excessive Agency is LLM06 in 2025 and LLM03 in 2026; Supply Chain is LLM03 in 2025
and LLM04 in 2026.

## Sources (read 2026-11-10)

| Standard | Source |
|----------|--------|
| OWASP Top 10 for LLM Applications 2025 | https://genai.owasp.org/llm-top-10/ |
| OWASP Top 10 for LLM Applications 2026 | PDF linked from https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ |
| OWASP Top 10 for Agentic Applications 2026 | PDF linked from https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/ |
| CWE | https://cwe.mitre.org/data/definitions/<id>.html |

## OWASP entries used by this skill

| Entry | Title (as read) | Used for |
|-------|-----------------|----------|
| LLM01:2025 / LLM01:2026 | Prompt Injection | prompt-injection.md, ci-agents.md |
| LLM02:2025 / LLM02:2026 | Sensitive Information Disclosure | secrets.md |
| LLM03:2025 / LLM04:2026 | Supply Chain | hooks-plugins.md, mcp-trust.md |
| LLM06:2025 / LLM03:2026 | Excessive Agency | permissions.md, prompt-injection.md P6, ci-agents.md C4 |
| ASI01 | Agent Goal Hijack | prompt-injection.md P1-P3 |
| ASI02 | Tool Misuse and Exploitation | permissions.md, mcp-trust.md M9 |
| ASI03 | Identity and Privilege Abuse | secrets.md, ci-agents.md C4 (API keys, OAuth tokens, delegated sessions) |
| ASI04 | Agentic Supply Chain Vulnerabilities | hooks-plugins.md, mcp-trust.md (the entry names MCP and plug-ins) |
| ASI05 | Unexpected Code Execution (RCE) | trust-boundary.md, hooks-plugins.md |
| ASI06 | Memory & Context Poisoning | prompt-injection.md P4-P5 |

Agentic entries not used by default (cite only if the finding fits the text): ASI07 Insecure
Inter-Agent Communication, ASI08 Cascading Failures, ASI09 Human-Agent Trust Exploitation,
ASI10 Rogue Agents.

## CWE entries used by this skill

| CWE | Title (as read on cwe.mitre.org) | Typical finding |
|-----|----------------------------------|-----------------|
| CWE-94 | Improper Control of Generation of Code ('Code Injection') | Repository config that runs code pre-trust (also the CWE of CVE-2025-59536) |
| CWE-522 | Insufficiently Protected Credentials | Endpoint override that sends credentials (CWE of CVE-2026-21852) |
| CWE-78 | Improper Neutralization of Special Elements used in an OS Command | Hook or workflow interpolating untrusted text into a shell command |
| CWE-77 | Improper Neutralization of Special Elements used in a Command | Same, non-OS command interpreters |
| CWE-798 | Use of Hard-coded Credentials | Literal secrets in settings, `.mcp.json`, hooks |
| CWE-532 | Insertion of Sensitive Information into Log File | Hooks logging tokens |
| CWE-200 | Exposure of Sensitive Information to an Unauthorized Actor | Secrets in memory files, data sent to third-party MCP hosts |
| CWE-829 | Inclusion of Functionality from Untrusted Control Sphere | Unpinned MCP packages, URL bundles, third-party hooks |
| CWE-1104 | Use of Unmaintained Third Party Components | Abandoned MCP server or action |
| CWE-1427 | Improper Neutralization of Input Used for LLM Prompting | Untrusted content placed in an agent prompt |

When no CWE fits, leave the field empty rather than stretching one.
