---
name: hermes-chief-of-staff
description: Use when designing or reviewing a Hermes Agent "chief of staff" setup - one chief agent that pilots an owner's company and private life, managers per domain, temporary employees one level down, the three request paths (answer now / delegate / prepare a decision), the eight operating rules, the private vs company partition, or the profile.yaml schema the agent derives from the owner's document (hermes-deploy). Not for raw delegation keys (hermes-delegation), cron syntax (hermes-cron) or approval settings (hermes-security).
---


<objective>
Turn an owner's wish for "an assistant that pilots with me" into a Hermes Agent
operating model: who exists (chief, managers, temporary employees), how every
owner request is routed (three paths, no fourth), which eight rules replace long
procedures, and how the private space stays sealed from the company space. The
owner's specifics live in a `profile.yaml` (template in this skill); the
Hermes mechanics are delegated to the knowledge skills.
</objective>

# Hermes Chief of Staff

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## What is native and what is a pattern

| Piece | Status in Hermes 0.23.0 | Built with |
|-------|------------------------|------------|
| Chief and managers as separate agents | Native: one profile per agent | `hermes profile install` of a distribution (hermes-deploy `company-tree.md`) |
| Durable work items ("cards") between agents | Native: Kanban board | `hermes kanban` (hermes-delegation) |
| Temporary employees | Native: `delegate_task` children, leaves at depth 1 | `delegation.*` (hermes-delegation) |
| Three paths, eight rules | **Pattern, not built-in** | SOUL.md / `.hermes.md` text ([soul-rules.md](references/templates/soul-rules.md)) |
| "Nothing irreversible without go" | **Pattern, not built-in** | hermes-outbound + hermes-security (`approvals.deny`, exact preview, owner's existing send mechanism after the go) |
| Commitments registry, briefs | **Pattern, not built-in** | hermes-rhythm (cron jobs) |
| Private vs company sealing | Partly native (separate profiles, `.env`, boards) | [partition.md](references/partition.md) |

## Decision map

| Question | Load |
|----------|------|
| Who is chief, manager, employee; which Hermes primitive for each | [roles-topology.md](references/roles-topology.md) |
| How a request is answered, delegated, or turned into a decision | [three-paths.md](references/three-paths.md) |
| The eight rules and why each exists | [eight-rules.md](references/eight-rules.md) |
| Keeping private and company apart | [partition.md](references/partition.md) |
| Schema of the owner's specifics (derived by the agent from his document, hermes-deploy) | [templates/profile.yaml](references/templates/profile.yaml) |
| Rule block to paste into SOUL.md / `.hermes.md` | [templates/soul-rules.md](references/templates/soul-rules.md) |
| A complete filled example (one real owner design, the only owner-specific file) | [examples/](references/examples/) |

## Critical rules

1. **One level of employees.** Chief → managers → temporary employees; an
   employee never delegates. Every extra level multiplies cost
   (children^depth, per the delegation docs).
2. **The chief never talks to employees.** It sees only the manager's checked
   deliverable; the manager answers for its employees' output.
3. **Three paths, no other.** Answer now, delegate with a card, or prepare a
   decision. Anything else (silent waiting, half-done hand-backs) is a defect.
4. **The owner is never the quality control.** Deliverables are verified by
   the manager, then by the chief, before the owner sees them.
5. **Rules over procedures.** Keep SOUL.md to the eight rules plus the
   owner's voice; long procedures belong in skills loaded on demand.
   Measure prompt size with `hermes prompt-size` before and after.
6. **Owner data lives in `profile.yaml` and the generated files only** -
   never in this skill.

## Workflow

1. Fill [profile.yaml](references/templates/profile.yaml) with the owner
   (one targeted question per missing required field, never a guess).
2. Choose the topology per manager ([roles-topology.md](references/roles-topology.md)):
   default: profile + Kanban card; `profile_routes` (advanced-delegation) as
   the alternative.
3. Generate SOUL.md for the chief from [soul-rules.md](references/templates/soul-rules.md),
   one SOUL.md per manager profile, one shared `.hermes.md` per workspace root
   (hermes-workspace).
4. Wire the rhythm (hermes-rhythm), outbound control (hermes-outbound), mail
   triage (hermes-mail-triage).
5. Existing install → follow hermes-migration (backup first, test day last).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
- https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation
- https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
- https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes prompt-size`)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
