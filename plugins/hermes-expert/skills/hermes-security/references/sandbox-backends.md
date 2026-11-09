# Sandbox and terminal backends

## Backends (`terminal.backend`, per profile)

| Backend | Isolation | Dangerous-command check | Use |
|---------|-----------|------------------------|-----|
| `local` (default) | none, runs as the Hermes OS user | yes | development, trusted single user |
| `ssh` | remote machine | yes | agent work on a separate server |
| `docker` | container (`--cap-drop ALL`, `no-new-privileges`, pids limit, size-limited tmpfs) | **skipped** - the container is the boundary | production gateway |
| `modal`, `daytona`, `vercel_sandbox` | cloud sandbox / microVM | skipped | cloud isolation |
| plugin backends (`singularity`, `sprites`, bubblewrap sandbox plugin) | container / microVM / Linux namespaces | skipped for container plugins | HPC, stateful cloud, light Linux sandbox |

Because approvals are skipped inside containers, a container backend moves
the safety question to **what the container can reach**: its mounts,
forwarded env and network. `approvals.deny` still applies on every backend.

Docker keys: `terminal.docker_image`, `terminal.docker_forward_env` (explicit
allowlist; empty keeps secrets out - anything listed can be read and
exfiltrated by code in the container), `terminal.docker_volumes`,
`terminal.container_cpu`, `container_memory`, `container_disk`,
`container_persistent` (bind-mounts `/workspace` and `/root` from
`~/.hermes/sandboxes/docker/<task_id>/`). Other common keys: `terminal.cwd`,
`terminal.timeout` (180), `terminal.home_mode`.

## File write safety (write_file / patch)

- Always blocked: OS credential stores (`~/.ssh/` keys, `~/.aws/`, `~/.kube/`,
  `/etc/sudoers`, `~/.netrc`), Hermes secret stores (`.env`, `auth/`,
  `vault/`, `mcp-tokens/`, `pairing/`, password-manager caches).
  Project `.env*` files are read-denied but writable.
- `HERMES_WRITE_SAFE_ROOT=<dir>[:<dir>]` hard-limits write_file/patch to those
  prefixes (set to `/opt/data` in the official Docker image). Include the
  Hermes home if the agent must still manage its own state.
- **Defense in depth, not a boundary:** these guards cover write_file and
  patch only. The `terminal` tool runs as the same OS user and can still read
  or overwrite denied paths with shell commands. Real isolation = a separate
  OS user, file permissions, or a container backend.

## Environment seen by agent-run code

| Child | Default | Opening it |
|-------|---------|-----------|
| `execute_code` | strips names containing KEY, TOKEN, SECRET, PASSWORD, CREDENTIAL, PASSWD, AUTH | `terminal.env_passthrough`, skill `required_environment_variables` |
| `terminal` local | strips Hermes infrastructure vars (provider keys, gateway tokens, tool keys) | same |
| `terminal` docker / ssh / modal | no host env | passthrough + `docker_forward_env` / `SendEnv` |
| no-agent cron scripts | same sanitizer as terminal | same `terminal.env_passthrough` list |
| MCP stdio servers | safe baseline only | the server's own `env:` block |

`terminal.env_passthrough` feeds **both** the agent's terminal and cron
scripts: never declare a send credential there if the agent must not be able
to send (the server's existing send mechanism keeps its credentials outside
the agent profile; hermes-security `locked-send-pattern.md`). Provider keys and
gateway tokens cannot be declared at all.

Credential files for sandboxes: `terminal.credential_files` (paths relative to
`~/.hermes/`, mounted read-only into Docker).

## Supervision guards

The terminal tool refuses to stop or restart its own supervised gateway
(no `pkill python`, no `launchctl bootstrap` on macOS), whatever the approval.
Do lifecycle maintenance from a separate shell.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/security (Container Isolation, Terminal Backend Security Comparison, File Write Safety, Environment Variable Passthrough, Supervised-gateway restriction)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Terminal Backend Configuration)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (Giving a script a credential)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (bubblewrap sandbox plugin, Singularity moved to a plugin)
