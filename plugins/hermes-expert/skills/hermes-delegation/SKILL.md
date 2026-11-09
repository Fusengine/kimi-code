---
name: hermes-delegation
description: Use when configuring how a Hermes Agent spawns subagents - delegation.* keys (model, provider, max_spawn_depth, max_concurrent_children, reasoning_effort, timeouts), delegation.backend with the advanced-delegation plugin (model_map, profile_routes), manager/worker topologies and their cost. Not for scheduled jobs (hermes-cron), separate long-lived agents on their own channels (hermes-core profiles, hermes-gateways), or approval policy (hermes-security).
---


<objective>
Configure Hermes Agent 0.23.0 subagent delegation (`delegate_task`): which
model and provider children run on, how deep and how wide the tree may grow,
how a manager spawns temporary workers, the v0.23.0 pluggable backends
(`delegation.backend`, official `advanced-delegation` plugin with `model_map`
and `profile_routes`), and what each choice costs. Flags every place where the
docs and the source disagree so the reader sets the value explicitly.
</objective>

# Hermes Delegation

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
| Which `delegation.*` key, default, conflict | [delegation-keys.md](references/delegation-keys.md) |
| Per-task model choice or "subagent as another profile" | [backends-advanced-delegation.md](references/backends-advanced-delegation.md) |
| Manager -> workers design, depth, spend | [topology-cost.md](references/topology-cost.md) |
| Copy-paste config | [templates/](references/templates/) |

## Critical rules

1. **Subagents know nothing.** Each child starts a fresh conversation with only
   the `goal` and `context` the parent writes, plus the workspace project
   context file (`.hermes.md` > AGENTS.md > ...). **SOUL.md is excluded.**
2. **Default is flat.** `delegation.max_spawn_depth` defaults to `1`: children
   are leaves and cannot delegate. One level (manager -> temporary workers) is
   the recommended pattern.
3. **Set limits explicitly.** `max_concurrent_children` is 10 in code and in
   `features/delegation.md`, but 3 in `configuration.md`; `max_spawn_depth` has
   no ceiling in code but "1-3, clamped" in `configuration.md` and the example
   file. Write the values you want.
4. **`delegation.reasoning_effort` is code-only** (present in
   `tools/delegate_tool_config.py`, undocumented). Use it, but say so, and
   verify with `hermes config get delegation.reasoning_effort`.
5. **Backends fail closed.** A `delegation.backend` whose plugin is missing
   returns a tool error; no child starts on another route.
6. **`profile_routes` lends credentials.** A listed profile's keys, SOUL.md and
   terminal policy are used by this profile's children. List only profiles you
   accept to share.
7. **Leaves cannot** call `delegate_task`, `clarify`, `memory`,
   `send_message`, `cronjob`. Both roles keep `execute_code`.

## Quick start

```bash
hermes config set delegation.model "<WORKER_MODEL_ID>"
hermes config set delegation.provider "<PROVIDER>"
hermes config set delegation.max_spawn_depth 1
hermes config set delegation.max_concurrent_children 10
hermes config get delegation.max_concurrent_children
```

Watch running children with `/agents` or Ctrl+T (classic CLI also F6), and
their transcripts under `~/.hermes/cache/delegation/live/` (kept 7 days).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Delegation)
- https://raw.githubusercontent.com/NousResearch/hermes-agent/main/cli-config.yaml.example (`delegation:`)
- https://github.com/NousResearch/hermes-agent/blob/main/tools/delegate_tool_config.py
- https://hermes-agent.nousresearch.com/docs/developer-guide/delegation-provider-plugin
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (pluggable delegation)
