# Sessions and context

## No automatic reset since v0.22.0

Gateway conversations **do not reset** after inactivity or at a daily
boundary. Core ignores `session_reset` settings, reset-policy overrides and
reset-timer environment variables. A config that still sets
`session_reset.mode: idle | daily | both` makes gateway startup and
`hermes doctor` warn.

Ways to get a fresh context:

| Need | How |
|------|-----|
| Fresh conversation now | `/new` or `/reset` in the chat |
| Time-based resets (old behavior) | `hermes plugins install hermes-session-reset-policy` - catalog plugin that reads the same `session_reset` block unchanged |
| Pick up an edited SOUL.md / skills / context files without losing history | `hermes sessions refresh-prompts` (v0.23.0; one prompt-cache miss per session) |
| One session only | `hermes sessions refresh-prompts --session <id>`; other profile: `-p <name>` |

A cron-triggered `/new` is not documented; do not promise it.

Context compression stays automatic (`compression.*`, opt-in
`compression.prepare_ahead` in v0.23.0).

## Session storage and pruning

Sessions live in the profile's SQLite `state.db`.

**`sessions.auto_prune` default - set it explicitly.** v0.22.0 turned it on
by default (ended sessions inactive 90 days deleted at startup); the v0.23.0
release notes say "Auto-prune is opt-in again, and Hermes asks once when the
disk runs low", and the current `cli-config.yaml.example` matches v0.23.0
(off; `/autoprune on|off|later` answers the prompt). Do not rely on either.

```yaml
sessions:
  auto_prune: false          # true = delete ended sessions older than retention_days
  retention_days: 90
  vacuum_after_prune: true
  min_vacuum_interval_days: 30
  min_interval_hours: 24
```

Open, pinned and in-progress sessions are never deleted.

## Session commands

```bash
hermes sessions list
hermes sessions browse                 # interactive picker, resume
hermes sessions stats
hermes sessions prune --older-than 90d --dry-run   # then without --dry-run (or --yes)
hermes sessions archive --older-than 30d          # soft-hide, no deletion
hermes sessions export <file.jsonl> [--session-id ID]
hermes sessions optimize               # FTS merge + VACUUM, non-destructive
hermes sessions refresh-prompts
```

Repair commands (`repair`, `repair-routing`, `repair-prompts`,
`repair-profiles`, `recover`) exist for damaged stores; read
`hermes sessions --help` and the docs before `--apply`, and stop the gateway
first where the docs say so.

## Memory is not session context

`memories/MEMORY.md` and `USER.md` persist across `/new`. Limits:
`memory.memory_char_limit` (2200), `memory.user_char_limit` (1375). Shared
memory across profiles needs an external memory provider plugin
(see hermes-extend).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ (Session continuity)
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes sessions`)
- https://raw.githubusercontent.com/NousResearch/hermes-agent/main/cli-config.yaml.example (Session Storage Retention)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.22.0 (reset timers retired, auto_prune on)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (auto_prune opt-in again, refresh-prompts)
