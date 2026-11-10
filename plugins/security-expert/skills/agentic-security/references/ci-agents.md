---
name: ci-agents
description: GitHub Actions workflows that run an AI agent or AI review on pull requests, issues or comments
when-to-use: Auditing .github/workflows/ for steps that call an AI agent, an AI review action or `claude -p`
keywords: github actions, pull_request, untrusted PR, AI review, claude-code-security-review, claude -p, secrets
priority: high
related: prompt-injection.md, trust-boundary.md, secrets.md
---

# AI Agents in CI

## Why it matters

A workflow that feeds a pull request, an issue or a comment to an agent hands attacker-written
text to a model that holds the workflow's tokens and tools. In a non-interactive run there is no
trust dialog and no MCP approval prompt.

## Documented facts

- Anthropic's security-review action README, section "Security Considerations": "This action is
  not hardened against prompt injection attacks and should only be used to review trusted PRs."
  It recommends the repository setting "Require approval for all external contributors" so
  workflows only run after a maintainer has reviewed the PR. Its Quick Start grants
  `pull-requests: write` and `contents: read` and passes `claude-api-key` from secrets.
  Source: https://raw.githubusercontent.com/anthropics/claude-code-security-review/main/README.md
- `claude -p` or the SDK in a never-trusted folder uses the repository's hooks, `env` block and
  helper commands, and connects `.mcp.json` servers without asking.
  Source: https://code.claude.com/docs/en/permissions (section "What runs before you trust a folder")
- Hardening for `-p` in a repository you didn't write: `--setting-sources user`, `--bare`,
  `--settings '{"disableAllHooks": true}'`, `disabledMcpjsonServers`. Same source.
- GitHub: expressions inside `${{ }}` in a `run:` step are substituted before the shell script
  runs, "which can make it vulnerable to shell command injection"; contexts ending in `body`,
  `head_ref`, `title`, `message` and similar are potentially untrusted input.
  Source: https://docs.github.com/en/actions/concepts/security/script-injections
- OWASP LLM01:2026 names "a community pull request" as a low-privilege channel used to reach a
  developer's agent. Source: PDF linked from https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/

## Checklist

| # | Look for | Where | Why | Verify |
|---|----------|-------|-----|--------|
| C1 | Steps running an AI agent or AI review action (`claude -p`, `anthropics/*` actions, other agent CLIs) | `.github/workflows/*.yml` | Inventory of agent execution in CI | List workflow, job, step, action ref |
| C2 | Triggers reachable by outsiders: `pull_request` from forks, `issues`, `issue_comment` | `on:` block | Attacker-written text reaches the agent | Is a maintainer approval gate documented for the repository? Mark "not verifiable from the repo" if it is a GitHub setting |
| C3 | PR title, body, branch name, comment or diff interpolated into the agent prompt | `run:` / `with:` inputs | Direct injection into the prompt; `${{ }}` in `run:` is also shell injection (CWE-78) | Trace each `${{ github.event.* }}` into the prompt or command |
| C4 | Agent job permissions and secrets | `permissions:`, `secrets.*` | Tokens the injected agent can use (Excessive Agency) | Write scopes, API keys, cloud credentials available to the step |
| C5 | Agent run on the PR's checked-out head with project config | checkout `ref`, then `claude -p` | The PR's own `.claude/settings.json`, hooks and `.mcp.json` apply in `-p` | Is `--setting-sources user` or `--bare` used? |
| C6 | Action pinned by tag or branch (`@main`) instead of commit SHA | `uses:` | Upstream change runs with the job's secrets | Record the ref; flag branch refs |
| C7 | Agent output posted back or committed automatically | comment / push steps | Injected output reaches the repository or reviewers | Is there a human gate before merge or publish? |
