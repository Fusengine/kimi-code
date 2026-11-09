# config.yaml - layout, precedence, core keys

## Files in a Hermes home

```text
~/.hermes/            (or $HERMES_HOME, or ~/.hermes/profiles/<name>/)
├── config.yaml       non-secret settings
├── .env              API keys, tokens, passwords
├── auth.json         OAuth credentials
├── SOUL.md           agent identity (system prompt slot #1)
├── memories/         MEMORY.md, USER.md
├── skills/           agent-created skills
├── cron/             jobs.json, output/
├── sessions/         gateway sessions
└── logs/             agent.log, errors.log, gateway.log, update.log ...
```

## Precedence (highest first)

1. CLI arguments (`hermes chat --model ...`)
2. `config.yaml`
3. `.env` (required for secrets)
4. built-in defaults

An administrator can pin values a user cannot override (managed scope).
`config.yaml` supports `${VAR}` and `${env:VAR}`; an unset variable stays
verbatim with a warning; bare `$VAR` is not expanded.

## Managing config

```bash
hermes config               # view
hermes config edit          # open in $EDITOR
hermes config get KEY       # resolved value (+ notice if Hermes may not read the key)
hermes config set KEY VAL   # dotted keys -> config.yaml, UPPER_SNAKE -> .env
hermes config unset KEY
hermes config check         # missing options, stale selections
hermes config migrate       # add missing options interactively
```

`_config_version` is managed by Hermes: never copy it between files.

## Core keys (verified, v0.23.0 docs/example)

| Key | Default | Notes |
|-----|---------|-------|
| `model.default` | silent default GLM-5.3 when never chosen (v0.23.0) | `model.model` also accepted; set with `hermes model` |
| `model.provider` | `auto` | `auto`, `openrouter`, `nous`, `anthropic`, `custom`, ... (list in models-providers.md) |
| `model.base_url` | - | for `custom` / OpenAI-compatible endpoints |
| `fallback_providers` | unset | top-level primary fallback chain (legacy `fallback_model`) |
| `agent.reasoning_effort` | `""` = medium | `none, minimal, low, medium, high, xhigh, max, ultra` |
| `agent.max_turns` | `500` | tool-calling iterations per conversation |
| `timezone` | `""` = server local | IANA zone; `HERMES_TIMEZONE` env overrides; drives cron schedules |
| `terminal.backend` | `local` | `local, docker, ssh, modal, daytona, vercel_sandbox`, plugin backends |
| `terminal.cwd` | `.` | set an absolute path per profile |
| `terminal.timeout` | `180` | seconds per command |
| `context_file_max_chars` | `null` (dynamic, floor 20,000, ceiling 500,000) | cap per project context file |
| `memory.memory_enabled` / `memory.user_profile_enabled` | `true` / `true` | |
| `memory.memory_char_limit` / `memory.user_char_limit` | `2200` / `1375` | |
| `security.redact_secrets` | `true` | redact key patterns in tool output and logs |
| `sessions.auto_prune` | see sessions-and-context.md | **docs disagree, set explicitly** |
| `gateway.multiplex_profiles` | `true` | see profiles-gateway.md |
| `updates.check` | `true` | see install-update.md |
| `cron.*` | - | see hermes-cron |
| `delegation.*` | - | see hermes-delegation |
| `approvals.*` | - | see hermes-security |
| `mcp_servers.*`, `skills.*`, `plugins.*` | - | see hermes-extend |
| `tts.*`, `stt.*`, platform blocks | - | see hermes-gateways |

Secrets (examples of env names): `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`,
`NOUS_API_KEY` - always in `.env`, set via `hermes config set NAME value`.

## Verification after any edit

```bash
hermes config check
hermes config get <each key you changed>
hermes doctor          # exit 0 = no unresolved problem
```

`hermes doctor` also flags list settings stored as one quoted string
(e.g. `plugins.enabled: '["a","b"]'`): readers ignore them. Store real lists.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/configuration
- https://raw.githubusercontent.com/NousResearch/hermes-agent/main/cli-config.yaml.example
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes config`, `hermes doctor`)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (GLM-5.3 silent default)
