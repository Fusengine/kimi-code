---
name: agentic-security
description: "Use when auditing the security of an AI-coding-agent setup in a repository: Claude Code project settings and hooks, plugin manifests and hooks.json, .mcp.json and MCP servers, skills, agents and rule files, permission rules, secrets in agent configuration, and CI workflows that run an AI agent on pull requests. Do NOT use for application code vulnerabilities (use security-scan), dependency CVEs (use dependency-audit or cve-research), auth flows (use auth-audit) or HTTP headers (use security-headers)."
---


<objective>
This skill audits the attack surface that an AI coding agent adds to a repository: files that
run code before or around the workspace trust dialog, hooks shipped by plugins, MCP servers
and their credentials, prompt-injection paths into the agent's context, permission rules and
bypass modes, secrets stored in agent configuration and memory, and CI jobs that run an agent
on untrusted input.

It reports; it never fixes the audited project and never changes the user's settings. Every
finding carries its evidence (file:line), passes a read-only refutation pass, and cites the
standard entry it maps to, as read on the source named in the references.
</objective>

# Agentic Security Skill

## Overview

Project configuration for an agent is executable: a `.claude/settings.json` hook, an `.mcp.json`
server command or an `env` override runs on the developer's machine. Check Point Research
showed this end to end (CVE-2025-59536, CVE-2026-21852). This skill turns the vendor
documentation into checklists an auditor can run read-only.

## Audit Areas

| Area | What is checked | Reference |
|------|-----------------|-----------|
| Trust boundary | Hooks, `env`, helpers, MCP auto-approval and base-URL overrides that act before trust | [trust-boundary.md](references/trust-boundary.md) |
| Hook supply chain | Plugin `hooks.json`, `plugin.json` `hooks` / `mcpServers` / `userConfig` | [hooks-plugins.md](references/hooks-plugins.md) |
| MCP trust | Every server source, publisher, pinning, env and tokens, tool descriptions | [mcp-trust.md](references/mcp-trust.md) |
| Prompt injection | Untrusted content reaching the agent, instruction files that obey observed content | [prompt-injection.md](references/prompt-injection.md) |
| Permissions | Broad allow rules, deny-rule limits, bypass and auto modes, saved approvals | [permissions.md](references/permissions.md) |
| Secrets | Keys and tokens in settings, `.mcp.json`, hooks, memory and lesson files, `.env` | [secrets.md](references/secrets.md) |
| CI agents | AI review or agent actions running on untrusted pull requests | [ci-agents.md](references/ci-agents.md) |

## Workflow

1. **Inventory** the agent surface of the target path: `.claude/`, `.mcp.json`, `.claude-plugin/`,
   `hooks/`, `skills/`, `agents/`, `CLAUDE.md`, rule and memory files, `.github/workflows/`, and the
   equivalent folders of other agent tools present in the repository.
2. **Run** the checklist of each area in scope ([audit-checklist.md](references/templates/audit-checklist.md)).
3. **Score** each candidate: severity, confidence 1-10, CWE and standard entry from
   [standards-map.md](references/standards-map.md).
4. **Verify**: run the refutation pass in [verification.md](references/verification.md) on every
   candidate. Confidence 8 or more becomes a finding; lower goes to "needs manual review".
5. **Report** with [audit-report.md](references/templates/audit-report.md) to
   `docs/security/YYYY-MM-DD-<scope>.md` inside the audited repository.

## Critical Rules

| Rule | Why |
|------|-----|
| Report only, never fix or change settings | The audit must not alter the trust state it measures |
| Never print a secret value | Report file:line and the secret type only |
| Read `~/.claude`, `~/.codex` and similar only when the owner asks, and read-only | User-level config is outside the audited repository |
| Cite every fact from the reference files | Vendor behavior changes by version; no claim from memory |
| A static read never proves exploitability | See [verification.md](references/verification.md) |

## References

- [Trust boundary](references/trust-boundary.md) — what a repository can run before trust, the two CVEs
- [Hooks and plugins](references/hooks-plugins.md) — plugin hook supply chain
- [MCP trust](references/mcp-trust.md) — server inventory and trust checks
- [Prompt injection](references/prompt-injection.md) — injection paths into the agent
- [Permissions](references/permissions.md) — rules, modes and their documented limits
- [Secrets](references/secrets.md) — secrets in agent configuration and memory
- [CI agents](references/ci-agents.md) — agents in GitHub Actions
- [Standards map](references/standards-map.md) — OWASP LLM / Agentic entries and CWE, as read
- [Verification and limits](references/verification.md) — refutation pass, what the skill does not prove
- [Audit checklist](references/templates/audit-checklist.md) · [Audit report](references/templates/audit-report.md)
