# MCP servers

Hermes reads MCP servers from `mcp_servers.<name>` in the profile's
`config.yaml`, discovers their tools and registers them beside the built-ins.

## Adding a server

```bash
hermes mcp                     # interactive picker over the Nous-reviewed catalog
hermes mcp catalog             # scriptable list
hermes mcp install <name>      # catalog entry (read its manifest first)
hermes mcp add <name> --preset <preset>
hermes mcp login <name>        # OAuth (device code when the server supports it)
hermes mcp configure <name>    # re-pick exposed tools
hermes mcp test <name>
```

Catalog manifests live at `optional-mcps/<name>/manifest.yaml`; installing runs
its `git clone`, `install.bootstrap` commands and the server itself. MCPs are
never auto-updated.

## Keys (common)

| Key | Meaning |
|-----|---------|
| `command`, `args`, `env`, `cwd` | stdio server |
| `url`, `headers` | HTTP server (`client_cert` / `client_key` for mTLS) |
| `enabled: false` | skip the server entirely |
| `tools.include` / `tools.exclude` | whitelist / blacklist tool names (globs allowed) |
| `timeout`, `connect_timeout` | call / connect timeouts |
| `lazy`, `idle_timeout_seconds`, `max_lifetime_seconds` | start on demand, recycle heavy stdio servers |
| `trust` | `full` (default) or `untrusted` |
| `tool_costs`, `spend_limit`, `cost_unit` | per-tool price and per-chat budget (v0.23.0) |
| `supports_parallel_tool_calls` | allow concurrent calls |

## Safety model

- **Env isolation:** a stdio server gets only `PATH, HOME, USER, LANG, LC_ALL,
  TERM, SHELL, TMPDIR`, `XDG_*` and its own `env:` block - never your shell
  secrets. `terminal.env_passthrough` does not apply to MCP.
- **`trust: untrusted`:** every write-capable call (any tool without
  `readOnlyHint: true`) asks through the normal approval surface: Allow Once,
  Session, or Always (Always is written to `command_allowlist` as
  `mcp:<server>/<tool>`). YOLO and `approvals.mode: off` skip this prompt.
  Unrecognized trust values are treated as untrusted (fail-closed).
- **`spend_limit`:** a costed call that would pass the per-chat budget asks
  first even on `trust: full` and in YOLO; it is refused where nobody can
  answer (cron, `hermes chat -q`).
- **Exposure:** prefer a short `tools.include` list over exposing everything;
  `exclude` destructive tools you never want the model to see.
- **Per profile:** each profile connects its own servers with its own
  credentials; two profiles share a connection only when the entry and
  credentials are identical. `auth: oauth` servers are never shared.
- Changes: `/reload-mcp` (asks first, `approvals.mcp_reload_confirm`); a
  running gateway also notices removed entries within about a minute.

## Example

```yaml
mcp_servers:
  issues:
    command: "npx"
    args: ["-y", "<mcp-server-package>"]
    env:
      SERVICE_TOKEN: "${SERVICE_TOKEN}"
    trust: untrusted
    tools:
      include: [list_issues, create_issue]
```

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
- https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference (`trust`, `tool_costs`, `spend_limit`)
- https://hermes-agent.nousresearch.com/docs/user-guide/security (MCP Credential Handling, YOLO exceptions)
- https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways (per-profile MCP connections)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
