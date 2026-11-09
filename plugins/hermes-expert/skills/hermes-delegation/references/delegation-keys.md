# delegation.* keys (Hermes 0.23.0)

## How a child is resolved

1. `delegation.backend` other than `default` -> the backend's route decides
   model/provider/effort; `delegation.model` / `delegation.provider` are inactive.
2. Default backend: `delegation.base_url` (+ `api_key`) wins, else
   `delegation.provider`, else the parent's provider and credentials.
   `delegation.model` applies in every case; empty = parent's model.
3. Reasoning: task route effort > `delegation.reasoning_effort` > parent's level.

With the default backend the pin is **global**: every child of every batch
runs on `delegation.model`. Per-task model choice needs `model_map` (see
backends-advanced-delegation.md) or the Kanban board.

## Keys

| Key | Default | Notes / conflicts | Source |
|-----|---------|-------------------|--------|
| `model` | empty = inherit | worker model id | delegation.md, configuration.md |
| `provider` | empty = inherit | full credential bundle via runtime provider system | same |
| `base_url`, `api_key` | unset | direct OpenAI-compatible endpoint; `api_key` falls back to `OPENAI_API_KEY` | configuration.md |
| `api_mode` | auto-detect | `chat_completions`, `codex_responses`, `anthropic_messages` | same |
| `request_overrides` | unset | dict of API kwargs + `extra_body`, honored on all branches | same |
| `fallback_providers` | unset = inherit for unpinned children | `[]` disables child fallback | same |
| `reasoning_effort` | unset = inherit parent | **code-only, undocumented**; `none, minimal, low, medium, high, xhigh, max, ultra`; YAML `false` disables thinking; unknown value logs a warning and inherits | tools/delegate_tool_config.py (`_child_reasoning`) |
| `max_spawn_depth` | `1` (flat) | floor 1. **Code: no ceiling** (`_get_max_spawn_depth`), delegation.md agrees; configuration.md and cli-config.yaml.example say "1-3, clamped" -> stay at 1 or 2 | delegate_tool_config.py, delegation.md |
| `orchestrator_enabled` | `true` | `false` forces every child to leaf | delegation.md |
| `max_concurrent_children` | **10** (code `_DEFAULT_MAX_CONCURRENT_CHILDREN`, delegation.md, example file) vs **3** (configuration.md) | floor 1, no ceiling; env `DELEGATION_MAX_CONCURRENT_CHILDREN`; over-limit batch = tool error, not truncation -> **set explicitly** | delegate_tool_config.py:19 |
| `max_iterations` | `250` | tool turns per child; exhausted -> `exit_reason: max_iterations`, `truncated: true` | delegation.md |
| `child_timeout_seconds` | `0` (no cap) | positive = inactivity cap, floor 30 s; stale-heartbeat monitor always on (450 s idle, 1200 s in a tool) | delegation.md |
| `subagent_auto_approve` | `false` | dangerous command in a child: `false` auto-denies, `true` approves once | cli-config.yaml.example |
| `inherit_mcp_toolsets` | `true` | keep parent's MCP toolsets when child toolsets are narrowed | cli-config.yaml.example |
| `worktree_isolation` | `false` | each child gets its own git worktree (local backend + git only) | configuration.md |
| `independent_completions` | `false` | each task returns as it finishes | delegation.md |
| `gateway_mode` | `auto` | `auto`, `inline`, `background` for messaging chats | configuration.md |
| `oneshot_max_children` | `2` | cap for `hermes chat -q` one-shot runs; `0` = unlimited | configuration.md |
| `prefix_stagger_seconds` | `0` | prompt-cache warm-up for batches, max 60 (v0.23.0) | configuration.md |
| `compression_threshold_tokens` | `0` | absolute compaction trigger cap for children, >= 16000 | delegation.md |
| `backend` | `default` | `default`, or a plugin backend (`model_map`, `profile_routes`) | delegation.md |
| `backends.<name>` | - | per-backend settings | delegation.md |

## Verify what Hermes reads

```bash
hermes config get delegation.max_concurrent_children
hermes config get delegation.max_spawn_depth
hermes config get delegation.reasoning_effort   # stderr notice = this build may not read it
```

## What children inherit

- Project context file of the parent's resolved workspace (same priority and
  caps as the main agent). **Not** SOUL.md, not the parent's conversation.
- Tools of the parent minus blocked ones: leaves cannot call `delegate_task`,
  `clarify`, `memory`, `send_message`, `cronjob`; orchestrators keep
  `delegate_task` only.
- Prompt-cache TTL for subagents is always clamped to 5 minutes.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Delegation, Prompt caching)
- https://raw.githubusercontent.com/NousResearch/hermes-agent/main/cli-config.yaml.example
- https://github.com/NousResearch/hermes-agent/blob/main/tools/delegate_tool_config.py
