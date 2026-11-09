# Topologies and cost

## Recommended: one level (manager -> temporary workers)

```
manager (main session, frontier model, SOUL.md + .hermes.md)
 ├── worker 1  (leaf, delegation.model, fresh context, dies when done)
 ├── worker 2
 └── worker N  (N <= max_concurrent_children)
```

- `max_spawn_depth: 1` (default): workers are leaves and cannot delegate.
- Workers exist only for the task: no memory writes, no user interaction
  (`clarify` blocked), no messages out (`send_message` blocked).
- The manager decomposes, writes complete briefs, and synthesizes results.
- Workers inherit the workspace `.hermes.md`; they do **not** see SOUL.md, so
  rules that must bind workers belong in `.hermes.md` or in the brief.

How the manager spawns workers: it calls `delegate_task` with one `goal` +
`context`, or `tasks=[...]` for a parallel batch (optional `output_schema`
for structured results). Top-level calls run in background by default and the
result is posted back as a new message; messaging chats follow
`delegation.gateway_mode`.

## Two levels (only when needed)

```
chief -> manager (role="orchestrator") -> workers (leaves)
```

Requires `max_spawn_depth: 2` on the chief's profile and the chief must pass
`role="orchestrator"`; at depth 1 that role silently degrades to leaf.
`orchestrator_enabled: false` disables it globally.

Alternatives that keep every profile at depth 1:

| Need | Mechanism |
|------|-----------|
| Manager acts with its own keys/SOUL | `profile_routes` backend: the chief's child **is** the manager profile; that child is depth 1. If it must spawn workers itself, the chief still needs depth 2 (inference from the depth rule, not stated in docs - test with `/agents`). |
| Long-lived managers with their own channels | separate profiles on the multiplexed gateway, coordinated by Kanban (`hermes kanban`) or Bot Mode rooms - not `delegate_task` |
| Durable tasks with per-task model | Kanban board |

## Cost model

- Children carry most tokens: "a parallel batch of subagents typically burns
  the large majority of a run's total tokens". Cut spend with
  `delegation.model` (cheap) while the parent stays frontier.
- Worst case concurrent leaves = `max_concurrent_children ^ max_spawn_depth`
  (docs example: depth 3 x 3 children = 27).
- The example config warns: values above 10 children multiply API cost linearly.
- Each child has up to `max_iterations` (250) turns; lower it for fleets of
  simple tasks.
- `delegation.reasoning_effort: low|minimal` (code-only key) trims worker
  thinking; `model_map` options can set `reasoning_effort` per route.
- Subagent prompt cache TTL is clamped to 5 minutes; `prefix_stagger_seconds`
  helps batch siblings reuse the cache.
- Unattended (cron) delegation: consider `child_timeout_seconds` as an
  inactivity cap.

## Sizing checklist

1. Depth: 1 unless a reviewed design needs 2.
2. Width: set `max_concurrent_children` explicitly (docs disagree: 10 vs 3).
3. Worker model: cheapest model that passes the task's acceptance check.
4. Iterations: lower `max_iterations` for short tasks.
5. Observe one real run in `/agents` (per-branch cost and tokens) before scaling.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation (Depth Limit, Cost strategy, Key Properties)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Width and depth)
- https://raw.githubusercontent.com/NousResearch/hermes-agent/main/cli-config.yaml.example (cost warning)
- https://github.com/NousResearch/hermes-agent/blob/main/tools/delegate_tool_config.py
