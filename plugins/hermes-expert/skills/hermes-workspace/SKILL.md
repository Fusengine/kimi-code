---
name: hermes-workspace
description: Use when laying out or cleaning the file workspace shared by a Hermes Agent chief and its managers - inbox, dated dossiers (README / received pieces / internal work / deliverables), clients, admin areas, knowledge, automation, archives and a to-delete area awaiting approval, a mirrored private space, scripts kept apart from documents, scratch outside the workspace, file naming, the end-of-task checklist and a weekly cleanup job that only asks before deleting. Not for context-file resolution rules (hermes-core) or sandboxing (hermes-security).
---


<objective>
One filing logic for the chief and every agent, written once in the shared
`.hermes.md`: where each kind of document goes, how files are named, where
scripts and temporary files live (never among documents), what every agent
ticks before closing a task, and a weekly cleanup that tidies what is safe
and asks before deleting anything.
</objective>

# Hermes Workspace

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## Hermes facts this skill relies on

| Fact | Consequence | Owner skill |
|------|-------------|-------------|
| `.hermes.md` is found by walking from the working directory up to the git root | Put the filing rules in `.hermes.md` at each workspace root; make that root the git root (or the cwd) of every agent | hermes-core |
| Cron jobs load project context only with `--workdir` | Every workspace job (cleanup, rituals) passes `--workdir <root>` | hermes-cron |
| `terminal.cwd` per profile | Set each profile's cwd inside its own root | hermes-core |
| Kanban `scratch` workspaces are deleted on task completion; `dir:<abs path>` is preserved | Use `dir:` for dossier work, keep temporary files in scratch | hermes-delegation |
| No native "write only here" policy | Containers / `HERMES_WRITE_SAFE_ROOT` + checklist | hermes-security |

## Decision map

| Question | Load |
|----------|------|
| Which folder for what, synced chief root, nested `.hermes.md`, company vs private, transition symlinks | [layout.md](references/layout.md) |
| Knowledge base (`SCHEMA.md`, `index.md`, `log.md`) | [templates/knowledge-schema.md](references/templates/knowledge-schema.md) |
| File names, scripts, temporary files | [naming-scripts-scratch.md](references/naming-scripts-scratch.md) |
| End-of-task checklist, weekly cleanup, who keeps order | [checklists.md](references/checklists.md) |
| Filing block for `.hermes.md` (+ company outbound email block) | [templates/hermes-md-filing.md](references/templates/hermes-md-filing.md) |
| Dossier README | [templates/dossier-readme.md](references/templates/dossier-readme.md) |
| Weekly cleanup cron job | [templates/cleanup-job.md](references/templates/cleanup-job.md) |

## Critical rules

1. **Documents and scripts never mix.** The workspace holds documents; each
   script has its own folder with a README, outside the document roots.
2. **Scratch lives outside the workspace** and is disposable.
3. **Received pieces are never modified**; work happens in `travail/`
   (internal notes) and `livrables/` (deliverables).
4. **Nothing is deleted by an agent.** Candidates go to the to-delete area;
   the owner approves deletion.
5. **Doubt about private vs company → ask the chief**, never create a new
   top-level folder.
6. **Same rules for every agent**: full reference in the chief root's
   `.hermes.md`, the applicable part repeated in each root's `.hermes.md`.
7. **A synced workspace is the owner's view**: no secrets, no scratch, one
   final version per deliverable.
8. **Old paths stay as transition symlinks**; nothing new is created under
   them.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (`--workdir`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban (workspace kinds)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (`terminal.cwd`)
- https://hermes-agent.nousresearch.com/docs/user-guide/security (file write safety)
