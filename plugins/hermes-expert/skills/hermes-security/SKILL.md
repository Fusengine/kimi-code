---
name: hermes-security
description: Use when securing a Hermes Agent setup - what Hermes asks a human to approve natively (approvals.mode, dangerous commands, untrusted MCP calls, spend limits, write approvals), approvals.deny and the hardline blocklist, YOLO, terminal backends and sandboxes, file write safety, secrets in .env and secret managers, the go gate so nothing leaves without the owner's go (native config + exact preview + audit of the server's existing send mechanism), or sealing private and company profiles from each other. Not for messaging adapter setup (hermes-gateways), plugin/MCP installation (hermes-extend) or outbound wording rules (hermes-outbound).
---


<objective>
Make a Hermes Agent profile safe to let act for an owner: know exactly which
actions Hermes 0.23.0 gates with a human approval and which it does not, block
what must never run, choose a sandbox that matches the risk, keep credentials
out of reach of the model, enforce "nothing is sent without the owner's go"
with the go gate (not a native feature; the plugin ships no send script), and keep private and company
profiles sealed. Native behaviour is cited from the official docs; patterns are
labelled **Pattern**.
</objective>

# Hermes Security

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## Native vs pattern

| Need | Status in 0.23.0 | Where |
|------|------------------|-------|
| Human approval of dangerous terminal commands | Native (`approvals.mode`) | [approval-model.md](references/approval-model.md) |
| Never-run list that survives YOLO | Native (`approvals.deny` + hardline blocklist) | [approval-model.md](references/approval-model.md#floors-that-nothing-overrides) |
| Per-call approval of an MCP tool | Native (`trust: untrusted`, `spend_limit`) | [approval-model.md](references/approval-model.md) |
| Staged memory / skill writes | Native, opt-in (`*.write_approval`) | [approval-model.md](references/approval-model.md) |
| Isolation of agent commands | Native backends (`terminal.backend`) | [sandbox-backends.md](references/sandbox-backends.md) |
| Secrets out of the model's reach | Native (`.env`, secret sources, redaction, env sanitizing) | [secrets.md](references/secrets.md) |
| No email/message leaves without the owner's go | **Pattern** - not a Hermes setting | [locked-send-pattern.md](references/locked-send-pattern.md) |
| Private vs company sealing | Partly native (profiles) + **Pattern** (filesystem, credentials) | [privacy-partition.md](references/privacy-partition.md) |

## Critical rules

1. **Never tell an owner "Hermes will ask before sending".** Sending
   (`hermes send` from the terminal, cron delivery, the Email adapter's
   replies) is not an approval-gated action. Enforce it with the go gate
   ([locked-send-pattern.md](references/locked-send-pattern.md)). (`send_message` is not registered as a model tool at v0.23.0:
   tools/send_message_tool.py L28-30, toolsets.py L186-187.)
2. **A rule the model can break is a wish.** Enforcement lives in OS
   permissions, missing credentials, `approvals.deny` and sandbox mounts -
   SOUL.md rules only explain the intent.
3. **Never `approvals.mode: off` / YOLO** on a profile that acts for an owner.
   `cron_mode` / `single_query_mode: approve` is set on the chief (root
   profile) only; manager and worker profiles keep the default `deny` - there
   is no inheritance from the root config
   ([approval-model.md](references/approval-model.md)).
4. **Container backends skip dangerous-command approval** - the container is the
   boundary, so audit its mounts, `docker_forward_env` and network.
5. **Write guards are not a sandbox**: write_file/patch are guarded, the
   terminal is not. The agent's OS user must not be able to read any send
   credential.
6. **`terminal.env_passthrough` reaches both the terminal and Hermes cron
   scripts** - a send credential never goes there.
7. **Review `command_allowlist` after every setup session**; each "Always"
   widens access on every surface, cron included.
8. **Never ship or install a send script.** After the go, the send runs
   through the mechanism already on the owner's server; audit it (sends only
   after an explicit go? from which account?) and report. No mechanism → an
   owner decision in the checklist, never an invented one.

## Workflow

1. Freshness check; `hermes security audit`; `hermes doctor`.
2. Merge [security-config.yaml](references/templates/security-config.yaml)
   into each agent profile; adjust `approvals.deny` to the CLIs installed.
3. Pick the backend per profile ([sandbox-backends.md](references/sandbox-backends.md)).
4. Move secrets per [secrets.md](references/secrets.md); `chmod 600` each `.env`.
5. Apply the go gate and audit the existing send mechanism
   ([locked-send-pattern.md](references/locked-send-pattern.md)); run its
   verification steps.
6. Seal profiles ([privacy-partition.md](references/privacy-partition.md)) and
   run its cross-read test.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/security
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Smart Approvals, Security, Terminal Backend Configuration)
- https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference
- https://hermes-agent.nousresearch.com/docs/user-guide/secrets/
- https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways (per-profile isolation)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (script credentials)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
