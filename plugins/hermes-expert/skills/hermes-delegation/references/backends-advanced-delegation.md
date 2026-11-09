# delegation.backend and the advanced-delegation plugin (v0.23.0)

## What changed in v0.23.0

Delegation became pluggable: `delegation.backend` chooses how each
`delegate_task` task becomes a child run. `default` (now itself a bundled
plugin) is the classic behavior. The official **`advanced-delegation`** plugin
adds two backends and the `/delegation` slash command plus
`hermes delegation config` (create/edit/delete model routes, pick profiles).

| Backend | Per-task choice by the model | Use when |
|---------|------------------------------|----------|
| `default` | none - every child on `delegation.model` | one cheap worker model is enough |
| `model_map` | a named option (`fast`, `deep`, ...) | tasks differ in difficulty |
| `profile_routes` | a Hermes profile | a child must act with another profile's keys, skills, SOUL.md and terminal policy (native "manager profile") |

While `model_map` or `profile_routes` is active, `delegation.model` and
`delegation.provider` are ignored.

## Getting the plugin

The docs call it "the official `advanced-delegation` plugin" without stating
whether it is a catalog install or a bundled plugin to enable. Check on the
machine:

```bash
hermes plugins list                         # installed? disabled?
hermes plugins search advanced-delegation   # catalog entry?
hermes plugins install advanced-delegation  # if it is a catalog entry
hermes plugins enable advanced-delegation   # if it is installed but disabled
```

## Configuration shape

```yaml
delegation:
  backend: model_map            # or profile_routes
  backends:
    model_map:
      options:
        - name: fast
          description: "Cheap and quick; lookups, summaries, simple edits."
          provider: "<PROVIDER>"
          model: "<CHEAP_MODEL_ID>"
        - name: deep
          description: "Slow and careful; hard analysis and design work."
          provider: "<PROVIDER>"
          model: "<STRONG_MODEL_ID>"
          reasoning_effort: high
          # service_tier: fast       # refused at spawn if the route has no such tier
          # fallback_providers: []   # absent = delegation.fallback_providers, [] = none
      default: fast                  # option used when a task names none
    profile_routes:
      profiles:
        - name: "<PROFILE_NAME>"
          description: "<What this profile is for, written for the model>"
```

The model only sees option/profile **names and descriptions**, never
providers, models or keys: write descriptions as routing instructions.

## Switching

| Action | Effect |
|--------|--------|
| `/delegation <backend>` | saves `delegation.backend`; applies from the next session (`/new`) |
| `/delegation <backend> --now` | also rebuilds the current chat's tools next turn (one prompt-cache miss) |
| `/delegation default` | back to default |
| `hermes config set delegation.backend default` | same without the plugin (recovery) |
| hand edit of `delegation.backend` | applies to new sessions only |

## Failure behavior (fail closed)

- Missing/disabled backend -> `delegate_task` returns a tool error naming the
  backend and the fix; **no child starts**.
- Within a batch, an unroutable task (unknown option, unknown profile, missing
  credentials, unknown `reasoning_effort`, unavailable `service_tier`) is
  refused alone: `status: "error"`, `route.refused: true`; other tasks run.
- Each routed result carries `route` (backend, option/profile, provider,
  model, effort, speed tier; `fallback_activated: true` if a fallback took over).
- A profile route uses that profile's own fallback chain.

## Security note for profile_routes

Listing a profile lets **this** profile's subagents use that profile's
credentials, credential pool, SOUL.md and terminal policy. List only profiles
whose keys and terminal access you accept to lend. Approval settings for
children: `delegation.subagent_auto_approve` (hermes-security).

## Writing your own backend

See the Delegation Provider Plugins developer guide (backend registration,
`set_global_backend`, testing with `plugins.enabled` + `delegation.backend`).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation (Delegation strategies)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Delegation strategy)
- https://hermes-agent.nousresearch.com/docs/developer-guide/delegation-provider-plugin
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes plugins`)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (Pluggable delegation backends)
