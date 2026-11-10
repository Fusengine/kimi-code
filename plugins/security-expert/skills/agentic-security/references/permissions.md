---
name: permissions
description: Permission rules, modes and saved approvals of an agent setup, and the documented limits of each
when-to-use: Auditing permissions blocks, defaultMode, sandbox settings and settings.local.json approvals in a repository
keywords: permissions, allow, deny, ask, bypassPermissions, auto mode, dontAsk, sandbox, settings.local.json
priority: high
related: trust-boundary.md, prompt-injection.md, templates/audit-checklist.md
---

# Permissions and Bypass

## Documented facts

Source for this section: https://code.claude.com/docs/en/permissions

- Rules are evaluated deny, then ask, then allow; "An allow rule can't carve an exception out of a
  deny rule." Deny from any scope beats allow from any other scope.
- A Bash rule "matches the command text Claude writes"; a deny or ask rule "isn't a security
  boundary around the program". The documented example: `Bash(curl *)` does not stop
  `/usr/bin/curl …` or `sh -c 'curl …'`. For enforcement that doesn't depend on command text,
  use sandboxing (filesystem and network isolation).
- Environment runners (`direnv exec`, `devbox run`, `mise exec`, `npx`, `docker exec`) are not
  stripped wrappers: `Bash(devbox run *)` matches "whatever comes after `run`".
- Modes: `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`. In
  `bypassPermissions` Claude Code skips prompts "including for writes to protected paths such as
  `.git` and `.claude`"; "Only use this mode in isolated environments like containers or VMs".
- `permissions.disableBypassPermissionsMode` / `permissions.disableAutoMode` set to `"disable"`
  prevent those modes; most useful in managed settings.
- Auto mode: a background classifier checks actions instead of a prompt.
- "Yes, and don't ask again" for Bash or WebFetch saves the rule to `.claude/settings.local.json`
  at the git repository root; it applies to future sessions anywhere in that repository.
- Project `permissions.allow` and `additionalDirectories` apply only after the trust dialog;
  `deny` and `ask` rules are not gated because they only restrict.
- `permissions.blockWritesOutsideWorkingDirectories` "doesn't limit shell commands, MCP tools, or
  the programs hooks run".
- With sandboxing on and `autoAllowBashIfSandboxed` at its default `true`, sandboxed Bash runs
  without prompting even under a bare `Bash` ask rule.

Source: https://code.claude.com/docs/en/security
- A deny rule matches the command "as written"; for network enforcement independent of command
  text, see sandbox network isolation. Auto mode is the built-in starting mode for interactive
  terminal and VS Code sessions.

## Checklist

| # | Look for | Where | Why | Verify |
|---|----------|-------|-----|--------|
| R1 | Broad allow rules: bare `Bash`, `Bash(*)`, `Bash(npx *)`, `Bash(docker exec *)`, `WebFetch`, `mcp__<server>__*` | `.claude/settings.json`, tracked `settings.local.json` | Grants any command or fetch without a prompt; runner rules match any inner command | Quote the rule and the documented matching behavior |
| R2 | Deny rules relied on as the only network or delete control | same | Deny matches command text only | Is sandbox network isolation configured? If not, flag the gap |
| R3 | `defaultMode: "bypassPermissions"` or `"auto"` committed to a repository | project settings | Removes or delegates every prompt for every contributor | Report the file:line; note whether the repo targets containers/VMs |
| R4 | Absence of `disableBypassPermissionsMode` where the owner wants it enforced | managed or user settings (owner request only) | The doc calls these keys "most useful in managed settings where they can't be overridden" | Report as observation, not a finding, unless the owner set the policy |
| R5 | Accumulated "don't ask again" rules | `.claude/settings.local.json` | Silent, persistent approvals per repository | List rules; flag network, push, delete, package-run commands |
| R6 | `settings.local.json` committed to git | `git ls-files` | Turns personal approvals into repository-supplied rules | See trust-boundary.md T5 |
| R7 | `additionalDirectories` pointing outside the repository | project settings | Extends file access | Flag home, `~/.ssh`, `~/.claude`, cloud credential dirs |
| R8 | Skill `allowed-tools` in a repository skill | `.claude/skills/*/SKILL.md` | "Workspace trust never gates a skill's `allowed-tools` in any session" (permissions doc) | List tools pre-approved per skill |
| R9 | Sandbox settings and `autoAllowBashIfSandboxed` | settings | Sandbox is the text-independent control | Record whether filesystem and network isolation are on |
