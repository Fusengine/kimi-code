# Roles and topology

Three roles, one level of delegation below the managers. The value of the
shape is accountability: each layer checks the one below before handing up,
so the owner only ever sees finished, verified work.

## The three roles

| Role | Sees | Does | Never |
|------|------|------|-------|
| **Chief of staff** | Everything: all dossiers, deadlines, open commitments, decisions waiting | Answers, routes, verifies, prepares decisions, runs the rhythm | Talks to employees; sends or pays without the owner's go |
| **Manager** (one per domain) | Its domain only (e.g. sales, finance, legal, research, mail) | Owns a card end to end, may spawn employees, verifies and assembles | Crosses into the other partition (private vs company) |
| **Temporary employee** | Only the goal + context of its task | Long or repetitive sub-work: collecting, extracting, drafting, testing | Delegates, sends, pays, deletes, writes outside the card's folder |

A manager keeps the judgement parts (synthesis, final message, legal
conclusion, architecture) and gives employees the volume parts (source
collection, first drafts, variants, test runs). Short tasks gain nothing from
employees; keep those managers without them.

## Mapping roles to Hermes primitives

| Role | Primitive | Why |
|------|-----------|-----|
| Chief | Its own profile (own SOUL.md, memory, gateway identity) | Persistent identity and memory; the owner's single contact |
| Manager | **Default**: its own profile, receives work as a Kanban card (`kanban_create(assignee=<profile>)`, `hermes kanban ...`) | Named, persistent, resumable, human-visible; card survives restarts |
| Employee | `delegate_task` child of the manager, on a cheaper model (`delegation.model/provider/reasoning_effort` in the manager's config) | Fresh context, cheap model, leaf at `max_spawn_depth: 1` |
| Manager (alternative) | Option B: subagent run under another profile via the `advanced-delegation` plugin's `profile_routes` backend (v0.23.0) | Synchronous, no card trail; use only when a manager must answer inside the chief's turn |

The default is what runs in production (chief + a dozen managers): the chief
hands off **only** by Kanban card, never `delegate_task` - drop `delegation`
from the chief's `platform_toolsets` so it cannot spawn anonymous children.
Every profile (chief, managers, workers) sets `toolsets: [hermes-cli,
kanban]`: `tools/kanban_tools.py` reads that root key to expose `kanban_*`
outside a worker run (e.g. a manager answering on its channel). Managers in an A2A setup can also
consult each other directly (hermes-gateways, `a2a`).

Kanban vs `delegate_task` (official docs): `delegate_task` is a function call
(fork → join, anonymous child, no resumability); Kanban is a durable work
queue (named profile, block/unblock, comments, audit trail). Work that must
survive a restart, needs the owner's input, or must stay discoverable belongs
on the board.

**Depth caveat (inference from the delegation docs, not an official
statement):** by default each manager keeps `delegation.max_spawn_depth:
1` - its employees are leaves. With Option B, chief → manager is already one
`delegate_task` hop, so manager → employee is depth 2 and the chief's profile
needs `max_spawn_depth: 2`. Exact keys and defaults: hermes-delegation.

## Employee settings (per manager profile)

Set these explicitly in each manager's `config.yaml` (keys and caveats in
hermes-delegation):

- `delegation.model` / `delegation.provider` - the cheaper employee model.
  Check the exact model id on the server with `hermes model`; never copy one
  from a design document.
- `delegation.max_concurrent_children` - optional; left unset in production
  (code default 10).
- `delegation.reasoning_effort` - present in code
  (`tools/delegate_tool_config.py`), undocumented; verify with
  `hermes config get` after setting.
- `delegation.subagent_auto_approve: false` - employees cannot approve
  dangerous commands.

## "Employees act on nothing outside"

Held by SOUL rules + `delegation.max_spawn_depth: 1` + per-profile
`platform_toolsets` / `command_allowlist` + approvals (chief `approve`,
profiles default `deny`), with the card's `--workspace dir:<absolute path>`
and the end-of-task checklist (hermes-workspace).

## Rollout order

Start with two or three managers whose work has obvious volume (research,
development, legal lookup). Add employees to the next managers only once the
pilot holds (deliverables verified, cost acceptable). Managers whose tasks
are short or sensitive (final review, finance, private) stay without
employees and on the stronger model.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban (Kanban vs `delegate_task`, `--workspace dir:`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation (depth, cost warning, backends)
- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
- https://github.com/NousResearch/hermes-agent/blob/main/tools/delegate_tool_config.py
- `tools/kanban_tools.py` `_profile_has_kanban_toolset()` v0.23.0 (root `toolsets` opt-in)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
