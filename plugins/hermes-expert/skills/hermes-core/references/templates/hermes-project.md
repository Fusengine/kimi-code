<!--
.hermes.md template - Hermes Agent 0.23.0.
Place at the workspace root (= terminal.cwd of the profile, or the git root above it).
Highest-priority project context: when it exists, AGENTS.md / CLAUDE.md are NOT loaded.
Loaded by interactive sessions, by subagents (parent workspace), and by cron jobs ONLY with --workdir.
Stay under context_file_max_chars (default floor 20,000 chars). Delete this comment block before use.
-->

# Workspace rules

## Layout

- `<DIR_1>/` - <purpose>
- `<DIR_2>/` - <purpose>
- Scratch files: `<SCRATCH_PATH>` (outside the workspace).

## Procedures

### <PROCEDURE_NAME>
1. <step>
2. <step>
3. Done when: <observable result>.

## Delegation

- Delegate only well-specified tasks: goal, all needed context, expected output.
- Subagents do not see SOUL.md or this conversation; put everything in the task.

## Output and delivery

- Reports go to `<OUTPUT_DIR>/` named `<YYYY-MM-DD>-<topic>.md`.
- Nothing is sent externally without an explicit go (enforced by hermes-security tooling, not by this file alone).

## Never

- <FORBIDDEN_ACTION_1>
- <FORBIDDEN_ACTION_2>
