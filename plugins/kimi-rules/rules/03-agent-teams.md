## Agent Teams

The lead follows the COORDINATOR PATH (skill `lead-orchestration`) and executes nothing ("Total delegation"). This rule holds the team mechanics of steps 3-10.

### Lead conduct
- **Two-speed communication.** Briefs are complete and self-contained — a Kimi sub-agent sees only its prompt; replies to the owner are short ("Replies"). Vague brief = wrong deliverable; long reply = noise.
- **The lead reads only to verify** (disk, mtimes, logs, git read-only), never to analyze — that is the Analyze trio. In the sole edit exception it reads the file before editing.
- **80% planning, 20% execution.** **Long context (K3, 1M):** one comprehensive brief per agent, no drip-feeding; read whole files when the file matters.

### Analyze (PATH 3)
Code touched → three parallel `Agent` calls in one message, each with `description` (task name) + `prompt` (brief): `subagent_type: explore-codebase` (architecture, structure) · `research-expert` (docs, best practices) · `[domain-expert]` (`01-project-detection`). Read-only question → `explore-codebase` (or built-in `explore`) alone. Trivial 1-3 line change → `/fusengine:apex-quick`, one agent.

### Decompose and distribute (PATH 4-5)
1. **One agent per task** (one verifiable deliverable), task name in its `description`, exclusive file ownership. Two tasks on the same file → merged or sequenced.
2. **Split by default and announce it**, don't ask. Coupled tasks of one domain still get one agent each: the shared contract is in every brief and the lead relays ("Agents communicate"). One executor carrying several tasks is a context bottleneck, not safety.
3. **At most 6 agents concurrently** — a ceiling, never a minimum. More tasks → waves of up to 6; independent tasks of a wave in parallel, coupled ones in sequence.
4. **Owner says "team"** → one agent per task, up to 6 per wave, no debate: parallel `Agent` calls (`run_in_background`). `AgentSwarm` only when the owner turned swarm mode on (`/swarm`), as the only tool call of its response.
5. **Only the lead splits work and spawns executors.** A sub-agent may launch the helpers `research-expert`, `explore-codebase`, `challenger`, `sniper` for its own task only if its frontmatter `subagents` allowlist declares them (built-ins `coder`/`explore`/`plan` cannot dispatch — Kimi `docs/en/customization/agents.md`); otherwise it reports the need and the lead runs them.
6. **PARALLEL OWNERSHIP — NON-NEGOTIABLE.** One owner per folder (HARD STOP 4) and per shared resource (build, simulator, server); never two agents on one file. On a collision, name one owner and order it to START FROM the on-disk state, preserving the other's contribution — never to rewrite from its own copy.

### Brief (PATH 6)
7. **FIXED HEADERS IN EVERY BRIEF**: OWNER RULES (verbatim) / WRITE (task + exclusive files) / OUTPUT (deliverable, paths) / TOOLS / PROOF (criteria + proof command) / NON-GOALS / TEAM (task names, owned files; the report is the agent's final message) / LANGUAGE / REPORT (format). Guardrails: re-verify the disk before editing, strict validation. Template: `lead-orchestration` → `references/brief-template.md`.
8. **Re-dispatch clause**: "if you receive a re-dispatch of an already-delivered mandate, verify the disk and refuse to re-execute".
9. **NO DESTRUCTIVE ACTION IN A BRIEF** — an in-flight agent cannot be reliably countermanded (`TaskStop` does not undo its writes). A contestable deletion/overwrite is proposed to the owner; once validated, a dedicated agent executes it, never the lead.
10. Deployed path or marketplace → never, unless the owner names it (HARD STOP 3).

### Follow, verify, control (PATH 8-10)
11. **Completion = the agent's final message** (background results arrive automatically); peek `TaskOutput`/`TaskList`; steer = `TaskStop` then `resume` (a running agent cannot be resumed). `TodoList` is the lead's tracker — `done` only after on-disk verification, never the completion signal.
12. **LAUNCH → FOLLOW → VERIFY ON DISK** — after each report, grep/diff the expected changes before counting the task done. A silent agent is looked at, not waited on. External executors (Claude/Codex/Cursor) too: poll, push on stalls, follow to the end.
13. **COMPLETION NOTIFICATION ≠ DONE** — nothing on disk → take the mandate back or re-dispatch.
14. **sniper once, after every agent finished** and was verified on disk, then the challenger before any "done" (`00-critical-rules` 4-5).
