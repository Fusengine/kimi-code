# Approval model: what Hermes asks a human for, natively

## What requires human approval (0.23.0)

| Action | Native gate | Notes |
|--------|-------------|-------|
| Terminal command matching a dangerous pattern (`rm -r`, `chmod 777`, `sh -c`, `curl ... \| sh`, `systemctl stop`, SQL `DROP`, `docker stop`, writes to `/etc` / `~/.ssh` / `~/.hermes/.env`, ...) | `approvals.mode` | list in `tools/approval.py`; skipped on container backends |
| `execute_code` script in a gateway/API session | whole-script approval | local interactive sessions approve only its `terminal()` calls |
| Write-capable tool on an MCP server marked `trust: untrusted` | per-call prompt | Once / Session / Always |
| Paid MCP call that would exceed `spend_limit` | always asks | even in YOLO; refused in cron / `chat -q` |
| Agent memory writes | opt-in `memory.write_approval: true` | staged, `/memory pending|approve` |
| Agent skill writes | opt-in `skills.write_approval: true` | staged, `/skills pending|approve` |
| Editing `~/.ssh/config` with write_file/patch | approval-gated | keys and `authorized_keys` hard-blocked |
| `/clear`, `/new`, `/reset`, `/undo` | `approvals.destructive_slash_confirm` | |
| `/reload-mcp` | `approvals.mcp_reload_confirm` | |
| Payment-card fill from the credential vault | always asks | even in YOLO |

**Not natively gated:** sending an email, posting a message (`hermes send`
run from the terminal, cron delivery, the Email adapter's automatic replies),
moving or deleting mail through a skill's CLI, paying through an API.
"Nothing leaves without the owner's go" must be built from native config plus
the server's existing send mechanism - see
[locked-send-pattern.md](locked-send-pattern.md).

`send_message` is not an agent-callable tool at v0.23.0: the source states it
is "intentionally NOT registered as an agent-callable model tool" (cron
delivery, `hermes send`, the Kanban notifier and an opt-in MCP server use its
helpers) and no `hermes-*` toolset lists it. The docs still name it (Slack
page, delegation blocked-tool lists). Check `hermes tools list` on the
installed version; the agent-reachable send paths are `hermes send` and
sending CLIs through the terminal. Sources: tools/send_message_tool.py L28-30
and toolsets.py L186-187 at
https://github.com/NousResearch/hermes-agent/tree/v0.23.0.

## Modes

```yaml
approvals:
  mode: smart            # smart (default) | manual | off
  timeout: 300           # unanswered = denied (fail-closed)
  cron_mode: deny        # deny (code default) | approve - cron jobs have nobody to ask
  single_query_mode: deny  # `chat -q` runs, i.e. every Kanban worker
  unattended_mode: deny  # webhook / msgraph_webhook / api_server sessions
  denial_breaker_threshold: 3
  destructive_slash_confirm: true
  mcp_reload_confirm: true
```

**The chief (root profile) runs `cron_mode: approve` and `single_query_mode:
approve`** (production value, with `timeout: 900` for the owner's chat
approvals): with `deny`, a flagged command in the chief's own crons is refused
with nobody to ask. The guard then rests on `approvals.deny` globs (checked
first), the decision-channel go for destructive work, no send credential and a
reviewed `command_allowlist`. **Manager and worker profiles keep the default
`deny`**: a profile config is merged with the code defaults only, never with
the root config (`hermes_cli/config.py` `_load_config_impl`), and Kanban
workers run `hermes -p <profile> chat -q` under their own profile.

- `smart`: an auxiliary LLM auto-approves low-risk flagged commands, denies
  risky ones, escalates uncertain ones. `approvals.smart_policy` appends your own
  rules to that reviewer (it only judges commands already flagged).
- `manual`: every flagged command asks.
- `off` = YOLO for the whole profile (also `--yolo`, `/yolo` per chat,
  `HERMES_YOLO_MODE=1` per process). YOLO also skips `trust: untrusted` MCP
  prompts. It does **not** skip: the hardline blocklist, `approvals.deny`,
  `spend_limit`, MCP elicitation, card fills.
- In chat, answer with yes/y/approve/ok/go or no/n/deny/cancel; `/approve` and
  `/deny` work too. An expired prompt cannot be reopened - ask again.

## Floors that nothing overrides

1. **Hardline blocklist** (code-shipped): `rm -rf /`, fork bombs, `mkfs` on the
   root device, `dd` to a disk, piping untrusted URLs to a root shell, and
   unparseable quoting (`malformed executable payload`).
2. **`approvals.deny`** (yours): fnmatch globs, case-insensitive, matched
   against normalized command variants and executable candidates (`sudo`,
   `env`, `sh -c` payloads unwrapped), checked **before** YOLO and `mode: off`,
   on every backend including containers. Always quote patterns in YAML.

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
    - "<sending-cli> *"          # e.g. a mail or chat CLI you never want called directly
```

Threat model from the docs: deny rules are a shell-command policy, not a
sandbox - variables, aliases, renamed binaries and interpreter programs can
reach the same capability. Use them as a stop signal; enforce with OS
permissions and isolated backends.

## Allowlists that silently widen access

`command_allowlist` (written by every "Always" answer, including
`mcp:<server>/<tool>` entries) is honoured on every surface, even under
`cron_mode: deny`. Review it after each setup session:
`hermes config get command_allowlist`. `hermes approvals suggest` mines your
approval history for candidates - read before accepting.

## Subagents

`delegation.subagent_auto_approve: false` (default) auto-denies dangerous
commands in children instead of asking. Keep it false.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/security (Approval Modes, YOLO, Hardline Blocklist, User-Defined Deny Rules, What Triggers Approval, execute_code, Permanent Allowlist, File Write Safety)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Smart Approvals, denial breaker, smart_policy)
- https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference (`trust`, `spend_limit`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills (`skills.write_approval`)
- https://raw.githubusercontent.com/NousResearch/hermes-agent/main/cli-config.yaml.example (`delegation.subagent_auto_approve`)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 ("Approval gate catches more")
- `hermes_cli/config_defaults.py` v0.23.0 (`approvals.cron_mode|single_query_mode|unattended_mode` default `deny`)
