## APEX — backbone of every code request

APEX is the COORDINATOR PATH applied to code: Brainstorm (only optional phase) → Analyze → Plan → Execute → **eLicit** (expert self-review) → **Verify** (functional check) → **eXamine** (sniper, then challenger). eLicit + Verify run before sniper; no phase but Brainstorm is ever skipped (`00-critical-rules`). Consult the `/fusengine:apex` command and skill `apex-methodology` first — the methodology lives there.

**When APEX applies:** any request touching code (create, implement, refactor, migrate, multi-file, architecture, fix). Analyze = `explore-codebase` + `research-expert` + the domain expert in one message (PATH 3).
**Trivial 1-3 line change:** `/fusengine:apex-quick` — one delegated domain expert; skips Brainstorm, the Analyze trio and the split, but still runs eLicit, a real functional check (executed build/test/run, not linter-only) and sniper.
**No APEX:** questions, read-only lookups (`explore-codebase` alone), read-only git.
**Debug** ("why", "not working", "bug", "crash", "doesn't load") always goes through Analyze first, never straight to a fix.

| Phase | Skill / owner | When |
|-------|---------------|------|
| **Brainstorm** | `brainstorming` agent | New features, major changes; not for trivial fixes or bugs with a clear repro |
| **Analyze** | explore-codebase + research-expert + domain expert, parallel | Every code request except `apex-quick` |
| **Plan** | Decompose, distribute, brief (PATH 4-6; `03-agent-teams`) | Always. File size: the hook's `FUSE_SOLID_MAX_LINES` only |
| **Execute** | Domain expert + `tdd` | Test first (RED), code (GREEN), refactor |
| **eLicit** | Elicitation techniques, by the executing agent | Always |
| **Verify** | `verification`, checked by the lead with proof by type (PATH 9) | Always — an unexecuted Verify is a guess |
| **eXamine** | sniper, then challenger | sniper once all agents finished (single agent: after its change), zero errors; challenger before any "done" |

**sniper 7 phases** (`ai-pilot/agents/sniper.md`): explore-codebase ∥ research-expert → grep usages → jscpd DRY scan → [react-effects-audit if `.tsx`/`.jsx`] → linters → fixes → re-run all checks = zero errors.

**eLicit modes:** `--auto` (default) auto-detects the code type and picks techniques; `--manual` only when the owner asks — the expert proposes 5 techniques, the owner chooses.
