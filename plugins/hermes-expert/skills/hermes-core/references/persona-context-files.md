# SOUL.md, .hermes.md, AGENTS.md - what goes where and how it is found

## Rule of thumb

- Follows the agent everywhere (identity, tone, style, standing behavior) -> `SOUL.md`.
- Belongs to a workspace/project (paths, conventions, procedures, rules for that
  tree) -> `.hermes.md` (Hermes-specific) or `AGENTS.md` (shared with other tools).

## SOUL.md

- Location: `HERMES_HOME/SOUL.md` only (`~/.hermes/SOUL.md`, or
  `~/.hermes/profiles/<name>/SOUL.md`). Never read from the working directory.
- Slot #1 of the system prompt; **replaces** the built-in identity.
- Seeded automatically if missing; an existing file is never overwritten.
- Empty or unreadable -> built-in default identity.
- Scanned for prompt-injection patterns; a hit in your own SOUL.md only logs a
  warning (`/context` flags it), it does not block the file. A SOUL.md shipped
  by `hermes profile install <git-url>` is blocked on a hit.
- **Excluded from subagent prompts.** Children of `delegate_task` never see it.
- Edits take effect on new sessions; running sessions need
  `hermes sessions refresh-prompts` (v0.23.0).

## Project context files - one type wins

Only **one** project context type is loaded per session, first match wins:

| Priority | File | Discovery |
|----------|------|-----------|
| 1 | `.hermes.md` / `HERMES.md` | walks from the working directory **up to the git root** |
| 2 | `AGENTS.override.md` | CWD at startup + subdirectories progressively |
| 3 | `AGENTS.md` | chain git root -> CWD, merged; subdirectories progressively |
| 4 | `CLAUDE.md` | CWD at startup + subdirectories progressively |
| 5 | `.cursorrules`, `.cursor/rules/*.mdc` | CWD only |

Consequences for a design:

- A `.hermes.md` hides every `AGENTS.md`/`CLAUDE.md` for that session. Put
  everything Hermes must obey in the one file that wins.
- `.hermes.md` lookup stops at the **git root**. If the workspace is not a git
  repository, place `.hermes.md` in the directory the agent starts in
  (`terminal.cwd`), or `git init` the workspace root so the walk reaches it.
  Verify with `/context` in a session started from a subdirectory.
- Outside a git repository, `AGENTS.md` parents are never consulted (protection
  against files planted in `/tmp` or `$HOME`).
- During a session, reading files in a subdirectory injects that directory's
  `AGENTS.md` / `CLAUDE.md` / `.cursorrules` (up to 5 parents, 32,000 chars each).

## Who sees the project file

| Run | Project context loaded? |
|-----|-------------------------|
| Interactive CLI/TUI/gateway session | yes, from the session's working directory |
| Subagent (`delegate_task`) | yes, when the parent has a resolved workspace dir (SOUL.md excluded) |
| Cron job without `--workdir` | **no** - runs detached from any repo |
| Cron job with `--workdir <abs dir>` | yes, same discovery as the CLI |

## Size and safety

- Cap per file: `context_file_max_chars` (unset = scales with the model context
  window, floor 20,000, ceiling 500,000). Over the cap -> 70% head / 20% tail
  kept with a marker. Keep files short: they are re-read every turn.
- `context_file_read_timeout` (default 5 s): slow network/cloud drives are
  skipped with a warning.
- Every project file is scanned; a hit replaces it with
  `[BLOCKED: <file> contained potential prompt injection ...]`. Avoid literal
  phrases like "ignore previous instructions", hidden HTML comments, zero-width
  characters, and `cat .env`-style commands in these files.

## Templates

- [templates/SOUL.md](templates/SOUL.md) - identity skeleton.
- [templates/hermes-project.md](templates/hermes-project.md) - `.hermes.md` skeleton.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files
- https://hermes-agent.nousresearch.com/docs/user-guide/features/personality
- https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation (How Subagent Context Works)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (Running a job inside a project directory)
