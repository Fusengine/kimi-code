# Decisions

Owner decisions, dated. Agents execute these; they are not re-debated.

## 2026-11-16 — Per-project roadmap + project skill, and the PRD lead workflow, ported to Kimi

Owner (relayed by the launching lead): « le lead sait qu'il doit faire un init ?? » then « pareille pour codex cursor kimi? ». Port of claude-plugins v1.40.5 + the PRD lead workflow: `docs/roadmap.md` and ONE project skill at Kimi's own project skill root `.kimi-code/skills/project-<name>/` (measured in Kimi 2.6.1 source: project roots `.kimi-code/skills`, `.agents/skills`), bootstrapped by `skill-creator` from the explore report and updated once per mandate at the commit cycle; created only by a mandate that writes files and reaches the commit cycle, never by a read-only mandate. PRD (2+ agents, `FUSE_PRD=1`): an agent runs `prd init --id kimi` (`--id kimi-code` is not a harness id and falls back to `.claude/`), the lead writes the task PRD, `prd status` on resume, `prd validate` exit 0 before done; PRD off = no change. Harness floor 0.1.121 (first with `prd init`).
Amendment 2026-11-16 (lead, from the Claude challenger round 2): PRD steps apply only to WRITE mandates with 2+ agents; a multi-agent read-only audit runs no `prd init` and creates no PRD file. An agent runs `init`; the lead runs `status` / `validate` / `compact`.

## 2026-11-15 — Port the claude-plugins v1.40.1 / v1.40.2 rules to Kimi

Owner: « le agent.md de codex et kimi avec leur rules son a jours? » (relayed by the launching lead; measured: 0 hits for commit cycle, Suggestion, product lens). Ported where Kimi supports it natively: commit cycle in any language = full release with no further owner step, plus the commit agent's real-run proof gate (docs-only branches exempt); grounded `Suggestion: <idea> → gain: <benefit>` owned by rule 08; template AUTONOMY keeps "Replies", "Report outcomes only" and "Bring ideas" as separate lines; brainstorming ideas mode (helpers via the `subagents` allowlist, questions returned to the lead in the final message, no SendMessage in Kimi); challenger product lens on feature changes, skipped on fixes; lead-orchestration step 4 maps the full chain and launches every unblocked step in parallel. Not ported: the Claude Code core-guards `Agent|Task|SendMessage` matcher and the harness 0.1.120 pin (Claude-side hook wiring, separate decision).

## 2026-11-15 — A go relayed by the launching lead counts as the owner's go

Owner, in the lead session, to « Ton go donné au lead compte-t-il pour les sessions qu'il a lancées ? »: « oui »; confirmed in this session: « Oui, je confirme ». From now on, a go relayed by the lead session that launched this session counts as the owner's go for a release, a real-conditions test or an install, provided the message quotes the owner's exact words. This replaces the rule that only a go typed in this session's own window counts. A relayed message that quotes no owner words, or comes from any other session, is still not a go.

## 2026-11-13 — Port the Swift additions of the coreyfloyd/agents fork

Owner: « Oui, porte le Swift » / « tu le porte sur les autre aussi ». Ported to solid-swift: `references/state-machines.md` (`LoadState`, `LoadFailure`, transition functions), the `viewmodel.md` / `view.md` templates, and the matching edits in `concurrency-patterns.md`, `dependency-inversion.md`, `single-responsibility.md`, `SKILL.md`; credit to coreyfloyd in the CHANGELOG. Not ported: the fork's "de-fuse" commit and its Python additions.

## 2026-11-11 — License: MIT (Copyright (c) 2026 Fusengine Sàrl), identical to the harness

Owner: « met les licences sous harnes kimi codex claude cursor ». The lead chose MIT, identical to the harness, so that anyone copying must keep the copyright notice.

## 2026-11-11 — Copyright holder: Fusengine Sàrl

Owner: « Fusengine Sàrl ». The LICENSE copyright line reads `Copyright (c) 2026 Fusengine Sàrl` (UTF-8), so LICENSE differs from the harness copy by that one line.
