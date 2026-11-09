# Profiles and the multiplexed gateway

## What a profile is

A profile is a separate Hermes home: its own `config.yaml`, `.env`, `SOUL.md`,
memories, sessions, skills, cron jobs and `state.db`. The default profile is
`~/.hermes/`; named profiles live in `~/.hermes/profiles/<name>/`. A directory
there counts as a profile only if it holds one of `config.yaml`, `.env`,
`SOUL.md`, `profile.yaml`, `auth.json`, `state.db`.

Use one profile per agent identity (assistant, coder, researcher...). Two agent
processes must never share one home.

## Commands

Deployed profiles are **distributions** (a dir with `distribution.yaml`),
installed and re-installed from a source-of-truth tree - hermes-deploy
`references/company-tree.md`. `profile create` is for ad-hoc local profiles.

```bash
hermes profile install <dir|git-url> --name <name> --yes --force  # install / re-install; config.yaml from the dist, user data kept
hermes profile update <name> [--force-config] [-y]   # re-pull from the RECORDED source; config.yaml kept unless --force-config
hermes profile describe <name> --text "..."          # description used by Kanban routing
hermes profile info <name>                           # installed manifest (version, source)
hermes profile create <name>                         # blank profile + <name> command alias
hermes profile create <name> --description "..."     # description used by Kanban routing
hermes profile create <name> --clone                 # copy config, .env, SOUL.md, skills, MEMORY.md/USER.md, plugins
hermes profile create <name> --clone-all             # full copy except history (sessions, state.db) and cron
hermes profile create <name> --clone-from <src>      # clone from a specific profile
hermes profile create <name> --clone --clone-channels  # also keep messaging bot credentials (refused if they would clash)
hermes profile use <name>                            # sticky default for later commands
hermes profile                                       # current profile, path, model, gateway status
hermes -p <name> <subcommand>                        # one-off run under a profile
<name> <subcommand>                                  # same, via the alias in ~/.local/bin/<name>
```

Facts that change a design:

- **Cron jobs are never cloned** (a clone would fire every job twice).
- **Messaging channels are never cloned** unless `--clone-channels`.
- OAuth logins with single-use refresh tokens (Anthropic, OpenAI Codex, xAI)
  stay in the root `~/.hermes/auth.json`; give a profile its own login with
  `hermes -p <name> auth add <provider>`.
- Edits to `SOUL.md` reach new sessions; for running sessions use
  `hermes sessions refresh-prompts` (see sessions-and-context.md).

## Profiles are not sandboxes

On the `local` terminal backend the agent has your user's filesystem access
whatever the profile. For a predictable working directory set an absolute
path per profile:

```yaml
terminal:
  backend: local
  cwd: /absolute/path/to/workspace   # "." means "where Hermes was launched", not the profile dir
```

Real isolation (containers, write-safe root, approvals) belongs to hermes-security.

## One gateway for all profiles (default since v0.22.0)

Hermes runs **one messaging gateway per machine** that serves every profile.
Each turn resolves the routed profile's config, skills, memory, SOUL and
provider keys; credentials are never shared across profiles. `hermes update`
folds old per-profile gateways into the multiplexed default when nothing
conflicts. Since v0.23.0 that gateway also owns every local session (CLI, TUI,
Desktop, ACP editors, bots, cron).

| Key | Value |
|-----|-------|
| `gateway.multiplex_profiles` | only valid value is `true`; unset resolves on after a safety preflight; `false` is retired and rewritten to `true` |
| `gateway.standalone: true` | temporary per-profile opt-out, documented as a shim to be removed |

Preflight blockers (gateway then serves the default profile only and prints a
boxed warning): a secondary profile still running its own gateway, a
duplicate bot credential, a port-binding platform without `/p/<profile>/` ingress.

```bash
hermes gateway status                  # served profiles, blockers
hermes gateway migrate --multiplex     # fold per-profile gateways by hand
hermes -p <name> gateway stop          # park one profile, others keep running
hermes -p <name> gateway start         # unpark
hermes -p <name> gateway restart       # reconnect that profile only
hermes gateway restart                 # restart the host multiplexer
```

Under a multiplexed gateway, `${VAR}` references in a profile's `config.yaml`
resolve against **that profile's** `.env`, including for its cron jobs.

Messaging adapters, voice and per-channel overrides: see hermes-gateways.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
- `hermes profile install|update|describe --help` and `hermes_cli/profile_distribution.py` on 0.23.0
- https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Environment Variable Substitution)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.22.0 (one gateway per machine)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (gateway owns every session)
