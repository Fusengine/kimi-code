---
name: hermes-core
description: Use when installing, updating, or configuring Nous Research Hermes Agent itself - install.sh, update channels, profiles and the multiplexed gateway, config.yaml keys, models/providers, SOUL.md / .hermes.md / AGENTS.md resolution, sessions and context resets, logs and health checks, release watching. Not for subagent settings (hermes-delegation), scheduled jobs (hermes-cron), messaging adapters (hermes-gateways) or approvals/sandbox (hermes-security).
---


<objective>
Install, update and configure Nous Research Hermes Agent (open source, MIT,
github.com/NousResearch/hermes-agent) at version 0.23.0 "The Hearth Release":
the install script and update channels, profiles and the single multiplexed
gateway, the real `config.yaml` keys with their defaults, model/provider
selection, the identity and project-context files (SOUL.md, .hermes.md,
AGENTS.md) and how they are resolved, session continuity after the retirement
of idle/daily resets, logs and health checks, and how to detect a newer
release. Every key written here was read in the official docs or source.
</objective>

# Hermes Core

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## Decision map

| Question | Load |
|----------|------|
| Install, first setup, update, channels, rollback | [install-update.md](references/install-update.md) |
| Several agents on one machine, gateway processes | [profiles-gateway.md](references/profiles-gateway.md) |
| Which `config.yaml` key, default, precedence, `hermes config` | [config-schema.md](references/config-schema.md) |
| Choosing a model / provider / fallback / reasoning effort | [models-providers.md](references/models-providers.md) |
| SOUL.md vs .hermes.md vs AGENTS.md, lookup order | [persona-context-files.md](references/persona-context-files.md) |
| Fresh context, `/new`, session pruning, prompt refresh | [sessions-and-context.md](references/sessions-and-context.md) |
| Something is broken: logs, doctor, status | [logs-health.md](references/logs-health.md) |
| Is there a newer Hermes? What changed? | [release-watch.md](references/release-watch.md) |
| Ready-to-fill files | [templates/](references/templates/) |

## Critical rules

1. **Never invent a key.** Write only keys found in
   `cli-config.yaml.example`, `user-guide/configuration.md` or the source.
   After `hermes config set`, run `hermes config get <key>`: it prints a
   stderr notice when Hermes may not read the key.
2. **Secrets go in `.env`, never in `config.yaml`.** `hermes config set`
   routes every `UPPER_SNAKE` name to `.env` automatically.
3. **One profile = one Hermes home.** Two agent processes must not share one
   home; one profile per agent, deployed as a distribution
   (`hermes profile install <dir> --name <name> --yes --force`, hermes-deploy).
4. **Profiles are not sandboxes.** Set an absolute `terminal.cwd` per profile
   for a predictable workspace; isolation belongs to hermes-security.
5. **Fresh context is not automatic.** Idle/daily `session_reset` is ignored by
   core since v0.22.0; use `/new` or the catalog plugin
   `hermes-session-reset-policy`.
6. **SOUL.md lives only in `HERMES_HOME`**; project rules live in
   `.hermes.md` (walks up to the git root). Cron jobs load project rules only
   with `--workdir` (see hermes-cron).
7. **Docs disagree with code on some defaults** (e.g. delegation limits,
   `sessions.auto_prune`). When two official sources disagree, set the value
   explicitly instead of relying on the default.

## Minimal setup sequence

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash   # Linux/macOS/WSL2
source ~/.bashrc            # or ~/.zshrc
hermes setup                # full wizard (or: hermes model, hermes tools, hermes gateway setup)
hermes doctor               # exit 1 while a problem remains
hermes --version
```

Then edit config from [templates/config-core.yaml](references/templates/config-core.yaml)
with `hermes config edit`, and validate with `hermes config check` + `hermes doctor`.

## Sources

- https://github.com/NousResearch/hermes-agent
- https://hermes-agent.nousresearch.com/docs/getting-started/installation
- https://hermes-agent.nousresearch.com/docs/getting-started/updating
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration
- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
- https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ (Session continuity)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
