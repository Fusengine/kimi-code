# The company tree - source of truth on the server

What the dry run generates is not a pile of files pushed one by one: it is one
versionable tree that lives **under the Hermes home** and is re-applied by one
idempotent script. Every profile is a Hermes **distribution** installed with
`hermes profile install`, never hand-built with `profile create`. Measured on a
production install (Hermes 0.23.0, 13 profiles) that runs this way.

## Where it lives

`<hermes home>/company/` (e.g. `~/.hermes/company/`) - beside the profiles,
**never inside a workspace root**: the workspace holds work (documents,
knowledge, dossiers), the company tree holds agent definitions.

```
<hermes home>/company/
├── README.md               shared contract: org chart, models, mechanics, profile layout
├── deploy.sh               idempotent installer (below); never touches .env / auth.json
├── scripts/                config merge helper (YAML-aware deep merge, skips placeholders)
├── company/<COMPANY>.md    verified company facts, read by every profile
├── brand/                  charter, signatures, document templates skill
├── <platform>/routes.yaml  channel -> profile routes, merged into gateway.profile_routes
├── <sync-client>/          exclude list for the synced workspace (if any)
├── shared-skills/<skill>/  skills copied into every profile (allow-list for sealed ones)
└── profiles/<name>/
    ├── distribution.yaml   manifest (templates/distribution.yaml)
    ├── SOUL.md             identity only, short, no domain knowledge
    ├── config.yaml         full profile config (or config.snippet.yaml for default)
    ├── MEMORY.seed.md      first MEMORY.md, injected once (templates/MEMORY.seed.md)
    ├── A-COMPLETER.md      values only the owner knows (templates/A-COMPLETER.md)
    ├── skills/<name>-workflow/SKILL.md   the profile's own operating procedure
    ├── skills/<skill>/     domain skills
    └── cron/README.md      exact `hermes -p <name> cron create ...` commands
```

`A-COMPLETER.md` keeps its name on purpose ("to complete"): the owner reads it
in his language; rename it to the owner's language if he prefers, but keep ONE
name across profiles so `deploy.sh` can collect them.

## Install flow (flags verified with `--help` on 0.23.0)

```bash
# per business profile, from a staging copy (profile dir + shared skills + brand)
hermes profile install <staging>/<name> --name <name> --yes --force
hermes profile describe <name> --text "<description from distribution.yaml>"
```

| Flag / command | Meaning |
|----------------|---------|
| `install <dir or git URL>` | `<dir>` must hold `distribution.yaml` at its root |
| `--name` | override the manifest name |
| `-y, --yes` | skip the manifest preview confirmation |
| `--force` | overwrite an existing profile of that name; memories, sessions, `.env`, `auth.json` preserved |
| `profile update <name> [--force-config] [-y]` | re-pulls from the **recorded** source; `config.yaml` kept unless `--force-config` |
| `profile describe <name> --text "..."` | description read by the Kanban orchestrator |
| `profile info <name>` | installed manifest (version, source) |

`--force-config` belongs to `update`, not `install`. Installing from a
temporary staging dir and later running `update` fails (the recorded source no
longer exists) - so a deploy script re-runs `install --force` every time and
never calls `update`.

## What `deploy.sh` does (order)

1. Create the workspace tree only where missing (hermes-workspace `layout.md`).
2. Per business profile: stage profile + shared skills (sealed profiles get an
   allow-list, never the org directory), `install --force`, `describe`.
3. Copy each skill's `scripts/` into `<profile home>/scripts/` (cron scripts
   must resolve there), `chmod +x`.
4. Seed `memories/MEMORY.md` from `MEMORY.seed.md` **only if absent or empty** -
   never overwrite lived memory.
5. Builtin skills a profile needs: `install` of a new profile did not copy the
   builtin catalogue (observed) - copy the named ones explicitly.
6. Default profile (the chief) is **not installable**: copy `SOUL.md` and its
   skills into the home, merge `config.snippet.yaml` and `routes.yaml` into the
   live `config.yaml` (merge, never replace; lists replace, dicts merge).
7. Verify: `hermes profile list`, `hermes doctor`, `hermes config get
   platform_toolsets --json`.
8. Print every `A-COMPLETER.md` - values still owed by the owner.

Cron jobs stay **out** of `deploy.sh`: each profile's `cron/README.md` holds the
exact commands, created paused after the go (apply-verify-rollback.md).

## Why

- One tree = one diff for the owner, one rollback point, one re-runnable
  script; the dry run's staging dir maps onto it 1:1.
- Distributions keep user data across re-installs; `profile create` + copied
  files drift and lose the manifest.

## Sources

- `hermes profile install --help`, `hermes profile update --help`, `hermes profile describe --help` on 0.23.0
- `hermes_cli/profile_distribution.py` (`DistributionManifest`, `EnvRequirement`) v0.23.0
- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (scripts under `$HERMES_HOME/scripts/`)
