# PRD workflow for the Kimi lead (harness >= 0.1.121)

Source of truth: `@fusengine/harness` `docs/prd.md`. This page is the lead's
Kimi-specific procedure; it changes nothing when PRD is off.

## On / off

- On = `FUSE_PRD=1` in `~/.kimi-code/.env` (or the project `.env`) **and** a
  router `<project>/.kimi-code/apex/prd.json`. Either missing = inert: zero
  reads, zero writes, hook output byte-identical. The lead never creates the
  `.env` flag itself; it is the owner's switch.
- `prd init` refuses without the flag (`requires FUSE_PRD=1`): treat that as
  "PRD off", skip every PRD step, run the mandate as before.
- Scope: only a **write** mandate with 2+ agents. A read-only mandate (audit,
  question, explain, explore) runs no PRD step and creates no PRD file, even
  with 2+ agents and the flag on.

## Harness

Always the harness the Kimi hooks run, never a global `harness`:

```bash
H="${KIMI_CODE_HOME:-$HOME/.kimi-code}/harness-current/dist/cli/bin.mjs"
[ -f "$H" ] || H="${KIMI_CODE_HOME:-$HOME/.kimi-code}/node_modules/@fusengine/harness/dist/cli/bin.mjs"
bun "$H" --version   # >= 0.1.121 for prd init
```

`--id kimi` selects `.kimi-code/apex/`. Measured on 0.1.121: `--id kimi-code`
is not a harness id and falls back to `.claude/apex/` — never use it.

## Steps

| Step | Who | Command / file |
|------|-----|----------------|
| 5. Bootstrap (write mandate, 2+ agents) | one agent (Bash) | `bun "$H" prd init --task <task> --id kimi --root <project>` — creates the router, never clobbers an existing one |
| 5. Task PRD | lead (Write) | `.kimi-code/apex/prd/<task>-prd.json` |
| 6. Brief | lead | each brief carries its slot: name, files, sub-task, report path |
| Agent end | each agent (Write) | its own report at the absolute path `<project>/.kimi-code/apex/prd/agents/<slot>-prd.json` (the brief gives it absolute; harness >= 0.1.122 refuses a `*-prd.json` under `<project>/prd/agents` or `<cwd>/prd/agents`) |
| 8. Resume | lead (Bash, read-only) | `bun "$H" prd status --json --id kimi --root <project>` |
| 9. Validate | lead (Bash) | `bun "$H" prd validate <task> --id kimi --root <project>` → exit 0, silent |
| 9. Compact | lead (Bash) | `bun "$H" prd compact <task> --id kimi --root <project>` |

`<task>` matches `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$` (the mandate slug).

## File shapes

Task PRD (one slot per agent; slot name = the agent's task name):

```json
{
  "api-auth":  { "files": ["src/auth/login.ts"], "sub-tasks": { "login": { "status": "assigned" } } },
  "api-store": { "files": ["src/store.ts"],      "sub-tasks": { "store": { "status": "assigned" } } }
}
```

Agent report (written by that agent only, when its work is done):

```json
{ "<task>": { "login": { "status": "done", "modified": ["src/auth/login.ts"], "unchanged": [] } } }
```

`validate` exit 1 prints one `<task>/<agent>/<sub>: <reason>` line per
missing or mismatched report → resume that agent to write it. The lead never
writes an agent report.

## Resume

New session or lost agents and the router exists → `prd status` first;
relaunch only slots without a `done` report, with the same slot name; never
redo a slot already reported done.

## Kimi limits (measured in harness docs/prd.md)

- File ownership is **consultative** on Kimi: the harness cannot bind a Kimi
  sub-agent's identity, so a wrong report write is never blocked — only
  `validate` catches it. The brief is what keeps each agent on its slot.
- The `SubagentStart` PRD slice is **delivered but ignored** by Kimi
  (observation-only hook): agents never see it, so the slot goes in the brief.
- The lead `Stop` block-once never runs on Kimi (the Stop hook exits on
  `--sound stop` first): `validate` before "done" is the lead's own gate.
