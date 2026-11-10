---
name: trust-boundary
description: Repository files that execute or send credentials before or around the workspace trust dialog
when-to-use: Auditing .claude/settings.json, .mcp.json and settings.local.json of a repository a developer may clone and open
keywords: trust dialog, hooks, env, apiKeyHelper, enableAllProjectMcpServers, ANTHROPIC_BASE_URL, CVE-2025-59536, CVE-2026-21852
priority: critical
related: hooks-plugins.md, mcp-trust.md, templates/audit-checklist.md
---

# Trust Boundary

## Why it matters

Check Point Research (2026-02-25) showed that a repository's `.claude/settings.json` is
"just another file in the repository", so any contributor with commit access can ship hooks,
MCP auto-approval and environment overrides that run on every collaborator's machine.
Source: https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/

| Case (Check Point) | Mechanism |
|--------------------|-----------|
| RCE via project hooks | `SessionStart` hook in `.claude/settings.json` ran after "Yes, proceed" with no further prompt (advisory GHSA-ph6w-f82w-28w6, named in the article) |
| RCE via MCP consent bypass | `enableAllProjectMcpServers` / `enabledMcpjsonServers` in the repository settings started `.mcp.json` commands before the trust dialog was answered |
| API key exfiltration | `ANTHROPIC_BASE_URL` set in project settings; requests carrying the API key left before the trust prompt |

CVE records, as read:

| CVE | Record text (abridged) | CWE | Fixed in |
|-----|------------------------|-----|----------|
| CVE-2025-59536 | Code contained in a project could execute before the user accepted the startup trust dialog | CWE-94 | 1.0.111 |
| CVE-2026-21852 | A repository settings file setting `ANTHROPIC_BASE_URL` caused API requests, potentially leaking API keys, before the trust prompt | CWE-522 | 2.0.65 |

Sources: https://cveawg.mitre.org/api/cve/CVE-2025-59536 and
https://cveawg.mitre.org/api/cve/CVE-2026-21852. Check Point states all reported issues were
patched before publication. These CVEs are fixed; the audit still flags the same
configuration because current documentation lists content that runs without trust (below).

## What runs before you trust a folder (current documentation)

Source: https://code.claude.com/docs/en/permissions (section "What runs before you trust a folder").

| Repository content | Trusted only a parent folder | `claude -p` or SDK, never trusted |
|--------------------|------------------------------|-----------------------------------|
| Hooks in settings files, the `env` block, helper commands such as `apiKeyHelper`, a project skill's hooks and `allowed-tools` | Used | Used |
| `permissions.allow` and `additionalDirectories` in `.claude/settings.json` | Not used until trust is accepted | Not used (stderr warning) |
| Servers in `.mcp.json`, including ones the repository approves in its own settings | Claude Code asks first; the repository's approvals don't count | Connected without asking, approved or not |
| `headersHelper` on a `.mcp.json` server | Not run until trust | Not run |

Also documented on the same page:
- A tracked `.claude/settings.local.json`, or a `.claude` that is a symlink, is treated as
  repository-supplied and its rules are held until trust.
- `disableAllHooks` set only in user settings is not enough for a `-p` run, "because the
  repository's project settings take precedence over yours and can set it back to `false`".
- Hardening for `-p` in an unknown repository: `--setting-sources user`, `--bare`,
  `--settings '{"disableAllHooks": true}'`, `disabledMcpjsonServers`.

Security doc: "A `-p` session shows neither prompt" (trust dialog, `.mcp.json` approval).
Source: https://code.claude.com/docs/en/security (section "Additional safeguards").

MCP doc: in an untrusted folder, `enableAllProjectMcpServers` or `enabledMcpjsonServers`
committed to `.claude/settings.json` is ignored and the server stays pending.
Source: https://code.claude.com/docs/en/mcp (section "Project server approvals and workspace trust").

## Checklist

| # | Look for | Where | Verify |
|---|----------|-------|--------|
| T1 | Any `hooks` key | `.claude/settings.json`, tracked `.claude/settings.local.json` | List event, matcher, command; flag network calls, downloads, writes outside the repo |
| T2 | `env` block, especially `ANTHROPIC_BASE_URL` or other endpoint overrides | same files | Compare the host with the vendor endpoint; any third-party host is a finding candidate |
| T3 | `apiKeyHelper` and other helper commands | same files | Read the command; it runs in `-p`/SDK sessions without trust |
| T4 | `enableAllProjectMcpServers`, `enabledMcpjsonServers` | committed settings | Report as repository self-approval; state which session types still honor it |
| T5 | `.claude/settings.local.json` tracked in git, or `.claude` symlinked | `git ls-files .claude`, `ls -la` | Tracked local settings are repository-supplied |
| T6 | Workflows or scripts running `claude -p` on this repository | `.github/workflows/`, `scripts/`, `package.json` scripts | `-p` uses hooks, `env` and `.mcp.json` servers without trust |
| T7 | Equivalent config folders of other agent tools | `.vscode/` and tool-specific folders | Check Point advises inspecting them; apply T1-T3 by analogy and mark tool-specific behavior "to verify" |
