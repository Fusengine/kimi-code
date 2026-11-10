---
name: audit-checklist
description: Copy-ready checklist covering the seven agentic audit areas, one line per check id
keywords: checklist, agentic, hooks, mcp, permissions, secrets, ci, prompt injection
---

# Agentic Security Audit Checklist

Copy into the working notes of the audit. Status: `pass`, `candidate` (goes to the refutation
pass), `n/a` (surface absent), `not checked` (state why). Check ids match the reference files.

```
## Scope
Repository: {repo}            Commit: {sha}            Date: {YYYY-MM-DD}
Agent surfaces found: [ ] .claude/  [ ] .mcp.json  [ ] .claude-plugin/  [ ] hooks/
                      [ ] skills/   [ ] agents/    [ ] CLAUDE.md / rules / memory
                      [ ] .github/workflows with agents  [ ] other agent tool folders: {list}
User-level config read: [ ] no  [ ] yes, on owner request: {paths}

## Trust boundary (trust-boundary.md)
[ ] T1 hooks in project settings          [ ] T2 env / ANTHROPIC_BASE_URL override
[ ] T3 apiKeyHelper and helper commands   [ ] T4 repository MCP self-approval keys
[ ] T5 tracked settings.local.json / symlinked .claude
[ ] T6 claude -p runs on this repository  [ ] T7 other agent tool folders

## Hook supply chain (hooks-plugins.md)
[ ] H1 hook inventory  [ ] H2 network calls  [ ] H3 writes outside project
[ ] H4 hardcoded paths [ ] H5 shell interpolation  [ ] H6 MCP from URL / unpinned
[ ] H7 non-sensitive secret userConfig  [ ] H8 broad allow hooks  [ ] H9 repo session hooks

## MCP trust (mcp-trust.md)
[ ] M1 inventory  [ ] M2 publisher  [ ] M3 pinning  [ ] M4 env and tokens
[ ] M5 remote hosts  [ ] M6 headersHelper  [ ] M7 tool descriptions
[ ] M8 content-fetching servers  [ ] M9 broad MCP allow rules

## Prompt injection (prompt-injection.md)
[ ] P1 unattended content sources  [ ] P2 obey-observed-content instructions
[ ] P3 untrusted text in prompts   [ ] P4 persistent memory  [ ] P5 hook context output
[ ] P6 untrusted input + high-impact tools  [ ] P7 hidden text  [ ] P8 mitigations present

## Permissions (permissions.md)
[ ] R1 broad allow  [ ] R2 deny-only controls  [ ] R3 bypass / auto default mode
[ ] R4 disable keys (observation)  [ ] R5 saved approvals  [ ] R6 committed local settings
[ ] R7 additionalDirectories  [ ] R8 skill allowed-tools  [ ] R9 sandbox

## Secrets (secrets.md) — never write a value, type + file:line only
[ ] S1 settings / .mcp.json literals  [ ] S2 hook credentials  [ ] S3 userConfig sensitive
[ ] S4 memory / lesson files  [ ] S5 committed .env  [ ] S6 logged secrets  [ ] S7 URL userinfo

## CI agents (ci-agents.md)
[ ] C1 inventory  [ ] C2 outsider triggers  [ ] C3 interpolated event text
[ ] C4 permissions and secrets  [ ] C5 -p on PR head config  [ ] C6 action pinning
[ ] C7 auto-posted output

## Candidates → refutation pass (verification.md)
| Check id | file:line | One-line candidate | Confidence before | after | Destination |
|----------|-----------|--------------------|-------------------|-------|-------------|
```
