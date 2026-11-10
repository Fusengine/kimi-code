---
name: secrets
description: Secrets stored in agent configuration, hook commands, MCP config and agent memory files
when-to-use: Auditing a repository for API keys and tokens in .claude/, .mcp.json, plugin manifests, hooks, memory or lesson files and committed .env files
keywords: secrets, api key, token, .mcp.json, settings.json, env, memory, LESSON.md, userConfig sensitive, redaction
priority: critical
related: hooks-plugins.md, mcp-trust.md, templates/audit-report.md
---

# Secrets in Agent Configuration and Memory

## Scope statement

No vendor source read for this skill says to scan `~/.claude` or other user-level agent
directories. Scanning them is this project's own check, run read-only and only when the owner
asks. Inside the audited repository, every file below is in scope.

## Redaction rule (non-negotiable)

Never print, quote, hash or partially reveal a secret value. A finding records `file:line`, the
secret TYPE (for example "Anthropic API key", "GitHub token", "bearer token in header") and how
the type was recognised (variable name, header name, key prefix). Evidence lines are rewritten
with the value replaced by `[REDACTED]`. Why: the report itself is committed under
`docs/security/` and would leak the secret a second time.

## Documented facts

- Plugin `userConfig` options with `"sensitive": true` go to the platform's secure credential
  store; non-sensitive values are saved under `pluginConfigs` in the user's `settings.json`.
  Source: https://code.claude.com/docs/en/plugins-reference (section "User configuration")
- `.mcp.json` supports `${VAR}` expansion in `command`, `args`, `env`, `url`, `headers`, so a
  shared file can reference a secret instead of embedding it.
  Source: https://code.claude.com/docs/en/mcp (section "Environment variable expansion in `.mcp.json`")
- Claude Code stores its own API keys and tokens in the macOS Keychain when available, in a
  `0600` file on Linux.
  Source: https://code.claude.com/docs/en/security (section "Additional safeguards")
- A project `env` block in settings applies in `-p` and SDK runs without trust.
  Source: https://code.claude.com/docs/en/permissions (section "What runs before you trust a folder")

## Checklist

| # | Look for | Where | Why | Verify |
|---|----------|-------|-----|--------|
| S1 | Literal keys or tokens | `.claude/settings*.json` (`env`, `apiKeyHelper` command), `.mcp.json` (`env`, `headers`, `args`, `url`) | Committed config is shared with every clone (CWE-798) | Is the value a literal or a `${VAR}` reference? Only literals are findings |
| S2 | Credentials inside hook commands or hook scripts | `hooks/hooks.json`, scripts they call | Hooks run on every installer's machine | Literal token or `Authorization:` header in the script |
| S3 | Secret-like `userConfig` options without `sensitive: true` | `plugin.json` | Value lands in `settings.json` in clear | Option name or description mentions key / token / password / secret |
| S4 | Secrets in memory, lesson, notes or transcript files | `MEMORY/`, `*LESSON*.md`, agent memory dirs, `.claude/` notes | Re-read into every session and often committed | Grep key-like patterns (skill `security-scan` → `references/secrets-patterns.md`); record type and file:line only |
| S5 | Committed `.env` or `.env.*` with real values | repository root and subfolders | Classic leak, often loaded by MCP servers or hooks | `git ls-files \| grep -E '(^\|/)\.env'`; ignore `.env.example` with placeholders |
| S6 | Secrets written to logs by hooks | hook scripts writing log files | CWE-532 | Look for `env` dumps or token variables echoed to files |
| S7 | Credentials in a remote MCP `url` (userinfo `user:pass@`) | `.mcp.json` | Sent to the named server | Report host and type only |

Before marking S1-S7 confidence 8 or more, confirm the value is not a placeholder (`xxx`,
`<token>`, `changeme`, empty) and not a reference (`${VAR}`); see verification.md.
