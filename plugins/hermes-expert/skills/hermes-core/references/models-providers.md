# Models and providers

## Two commands

| Command | Where | Does |
|---------|-------|------|
| `hermes model` | terminal, outside a session | full wizard: add providers, OAuth, API keys, endpoints |
| `/model` | inside a chat | quick switch among already-configured providers/models |

`/model <name> --global` writes the choice to `config.yaml`; `/model <name> --once`
applies to one turn; `/model reset` returns to the configured default and keeps
the conversation. A gateway-chat `/model` switch survives gateway restarts.

## `model:` block

```yaml
model:
  default: "<provider/model-id>"   # "model" is accepted as an alias of "default"
  provider: "auto"                 # auto-detect from credentials
  # base_url: "<https://endpoint/v1>"   # only for custom / OpenAI-compatible endpoints
```

Provider values documented in `cli-config.yaml.example` (non-exhaustive):
`auto`, `openrouter`, `nous` (OAuth via `hermes auth add nous`), `nous-api`,
`anthropic`, `openai-codex`, `gemini`, `zai`, `kimi-coding`, `minimax`,
`minimax-cn`, `huggingface`, `nvidia`, `xiaomi`, `arcee`, `ollama-cloud`,
`deepinfra`, `kilocode`, `ai-gateway`, `azure-foundry`, `lmstudio`, `custom`
(aliases `ollama`, `vllm`, `llamacpp` map to `custom`). GitHub Copilot moved to
the `github-copilot` labs plugin in v0.23.0.

`"main"` is **not** a valid `model.provider` value; it only exists inside
`auxiliary:`, `compression:` and fallback entries.

Model IDs are provider-specific. Never copy a model id from a document or a
release note into config without confirming it in `hermes model` on the
target machine. If no model was ever chosen, v0.23.0 uses GLM-5.3 silently.

## Credentials

- API keys in `.env` (`hermes config set OPENROUTER_API_KEY ...`).
- OAuth logins in `auth.json` via `hermes auth add <provider>`
  (`hermes login` / `hermes logout` are retired; use `hermes auth`).
- Nous Portal: `hermes setup --portal` is the lowest-friction option for
  unattended runs because OAuth refresh is automatic.

## Fallback chain

```yaml
fallback_providers:
  - provider: openrouter
    model: "<model-id>"
  - provider: anthropic
    model: "<model-id>"
```

Tried in order when the primary fails (rate limit, server error, auth);
activation is one-shot per session. Legacy single `fallback_model:` still works.
Subagents have their own `delegation.fallback_providers` (hermes-delegation).
There is **no documented fallback chain for TTS voices** - only for LLMs.

## Reasoning effort

```yaml
agent:
  reasoning_effort: ""   # empty = medium; none, minimal, low, medium, high, xhigh, max, ultra
```

`ultra` is a Hermes-internal step clamped to the strongest level a route
accepts. Per-job override: `hermes cron create ... --reasoning-effort <level>`.
Subagents: see hermes-delegation (`delegation.reasoning_effort`, code-only).

## Cost pattern

Keep the main session on a frontier model and pin cheaper models where volume
is: `delegation.model` for subagents, `cron.model` for scheduled jobs. Details
in hermes-delegation and hermes-cron.

## Sources

- https://hermes-agent.nousresearch.com/docs/integrations/providers
- https://raw.githubusercontent.com/NousResearch/hermes-agent/main/cli-config.yaml.example (`model:` block)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Reasoning Effort, Auxiliary Models)
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ (`/model` in gateway chats)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (`/model reset`, Copilot plugin, GLM-5.3)
