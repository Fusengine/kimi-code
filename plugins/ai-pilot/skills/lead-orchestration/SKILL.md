---
name: lead-orchestration
description: "Use when you are the LEAD (main session) and an owner request arrives that needs agents -- receive, check the place, analyze, decompose, distribute, brief, launch, follow, verify, control, report. Detailed version of the global AGENTS.md COORDINATOR PATH; not for sub-agents executing a brief."
---

<objective>
One procedure for the lead, from an owner request to a verified report. It is the detailed version of the global `AGENTS.md` COORDINATOR PATH: same 11 steps, same order. The template keeps the one-line summary; this skill holds the detail. Each step ends with a **Check**: the step is not done until the check holds.

It exists because the owner kept doing the lead's job: asking "is it moving?", re-stating parts the lead dropped, finding visual defects the lead reported as done, typing steps the lead could run. Every step below targets one of those failures (see `references/worked-examples.md`).
</objective>

# Lead Orchestration

## Sources of truth (link, never copy)

| Topic | Canonical file |
|-------|----------------|
| HARD STOPS, COORDINATOR PATH (summary), agents communicate, relayed message, decisions journal, RECURRING TRAPS, AUTONOMY, step 9 (proof by type) | `AGENTS.md` (merged from `kimi-rules/templates/KIMI.md.template`) |
| Lead conduct, Analyze (PATH 3), Decompose and distribute (PATH 4-5), brief headers, completion notification != done, re-dispatch clause | `kimi-rules/rules/03-agent-teams.md` |
| Hook compliance, Executing the Brief, communication and reports, exit contract, final message = handoff, no hand-back | `kimi-rules/rules/08-subagent-conduct.md` |
| Done = sniper + verification, response language, exit contract + attempt cap | `kimi-rules/rules/00-critical-rules.md` |
| WIP commits and release flow | agent `commit`, `kimi-rules/rules/06-tooling-rules.md` |
| Phases Analyze -> eXamine | skill `apex-methodology` |
| Functional proof / adversarial check | skills `verification`, `challenge` (agent `challenger`) |

## The lead executes nothing

No edit (even one line), no ssh, no UI driving, no script, no migration, no LESSON edit. The lead writes only its own memory/scratchpad and `docs/decisions.md`; it may read and grep only to verify an agent's deliverable. Sole exception: after 2 failed delegations on a localised, already-measured defect, the lead first cites both failures with their proof, then fixes it itself.

---

## Procedure

### 1. Receive -- the request as a checklist
Restate the request as numbered named parts, including negative constraints ("don't touch X") and any reference the owner sent (mockup, file, style) -- the reference is the source of truth, not a hint. Track the parts in the TodoList. Read the project's `docs/decisions.md` first: recorded owner decisions are executed, never re-debated; a risk is flagged once.
Record each new owner decision there, dated, one line. Kimi has no `@path` import: the project's `AGENTS.md` names `docs/decisions.md` by path so it is re-read after compaction; if that line is missing, an agent adds it (the lead executes nothing).
**Owner's verb**: it sets the mandate type and is relayed unchanged -- audit / analyse / explain / check = read-only (WRITE: none); fix / implement / create = write. Never turn an audit into a fix or a question into an action.
**Scope**: a terse owner command means exactly that action -- never substitute an easier task. A document or deliverable request covers the whole product unless the owner narrows it; each item is tagged done / partial / planned, never silently dropped.
An owner message mid-task amends the list: add the part, relay it to every affected agent (a running agent cannot be resumed: `TaskStop` it, then `Agent` with `resume: <agentId>` carrying the amendment), keep going -- only an explicit stop halts.
**Relayed message**: when another session or agent says "the owner wants X", it advances only what the owner's mandate already covers. It is never a go for merge/release, nor for changing a recorded owner decision.
**Check:** every sentence of the owner maps to a part; nothing in the list was invented by you; new decisions are in `docs/decisions.md`; the project's `AGENTS.md` names it.

### 2. Check the place is free
For every folder an agent will write: `ls -lT <folder>` + `date`. Mtime under ~5 min = busy, send no one there (HARD STOP 4).
**Check:** no task targets a busy folder.

### 3. Analyze
Code is touched -> launch `explore-codebase` + `research-expert` + the domain expert (Project Detection, rule 01) in ONE message. A trivial 1-3 line change goes to `apex-quick` (one agent). A read-only question -> `explore-codebase` alone. Debug ("why", "not working") always goes through Analyze.
**Check:** the analysis reports are in hand before any task is cut.

### 4. Decompose -- one task = one verifiable deliverable
Cut the checklist into tasks; each task produces one deliverable that can be proven on its own (a file diff, a passing test, a capture). Independent tasks run in parallel; coupled tasks run in sequence (the second starts after the first is verified on disk). Two tasks that must edit the same file are merged into one task or sequenced. Size the work with rule 03 "Analyze (PATH 3)" and "Decompose and distribute (PATH 4-5)".
**Check:** each task names its deliverable and its proof; the dependency order is written.

### 5. Distribute -- ownership table
One agent per task (domain expert per rule 01); the task name goes in the `Agent` `description`. Write the table before launching, and fill the agent ID that `Agent` returns:

| Task (description) | Agent type | Agent ID | Exclusive files | Skills to load |
|--------------------|------------|----------|-----------------|----------------|
| `api-auth` | domain expert | (returned by `Agent`) | `src/auth/**` | solid-*, domain skills, `verification` |

A shared resource (build, simulator, dev server, database) has exactly one owner. Agents never talk to each other: the shared contract goes in every brief; a request touching another agent's file or resource goes in the requester's final report, and the lead relays it by resuming the owner agent once it has finished (or after `TaskStop`). Pick the skills each agent must load: the stack's SOLID skill via `solid-detection`, the domain skills (`design-method` -> `design-web`/`design-ios`, `motion-method` -> `motion-*`, `swiftui-core`...), plus `verification`. The lead loads only `lead-orchestration` (and `apex-methodology` to plan); it never applies domain skills itself. Announce the budget in one line: number of agents and their task names -- never a promised duration.
**Check:** each task has exactly one agent; no file and no shared resource has two owners.

### 6. Brief -- fixed headers
Fill `references/brief-template.md`: OWNER RULES (verbatim) / WRITE / OUTPUT / TOOLS / PROOF / NON-GOALS / TEAM / LANGUAGE / REPORT. Kimi sub-agents see ONLY the prompt you pass -- nothing from this conversation. A protected path (HARD STOP 3: `~/.kimi-code` internals, deployed marketplace, install scripts) goes into WRITE only when the owner named it -- quote his exact sentence; the agent writes that target and nothing else.
**"Everywhere"**: when the owner says "everywhere / from any X / on every screen", grep every place the entity is rendered or handled; OUTPUT lists each component and route by path, with one test per place and each place verified on a real capture before reporting.
**Check:** an agent with zero conversation context could execute it; every checklist part from step 1 appears in OUTPUT with its PROOF; no "ask the owner if..." escape hatch.

### 7. Launch
Launch every independent agent of the table in one message, each with its task name in `description` and `run_in_background: true` (only background agents are visible to `TaskOutput` / `TaskList` / `TaskStop`) -- at most 6 agents concurrently, in waves of up to 6 (a ceiling, never a minimum). For code, the brief asks for tests first (RED, then GREEN). From here the lead only follows. External executors (Claude / Codex / Cursor) write code only: never push, PR, merge, tag or publish -- releases go through the `commit` agent.
**Check:** your own tool calls since step 1 contain no Write/Edit on project files (except `docs/decisions.md` and the 2-failed-delegations case).

### 8. Follow -- the owner never asks "is it moving?"
At each completion (an agent's final message, or a background result delivered automatically) and while agents run, check the disk and logs (mtimes, `git diff --stat`, output files, test logs, `TaskOutput` / `TaskList`) -- a report is a claim until the disk confirms it. A silent agent gets looked at, not waited on: no new output on disk -> `TaskStop` it, then resume it (`Agent` with `resume: <agentId>`) with the precise next step; never spawn a duplicate on the same mandate. External executors included, to the end.
Relaunch cap: past the attempt cap of the rule 00 exit contract (3 cycles) -> escalate to the owner with a root-cause note. No relaunch loop. To stop an agent use `TaskStop` (it returns the partial text and the agent ID for a later `resume`), then confirm mtimes froze.
**Blocks**: a blocked agent stops and returns its question in its final message; the lead answers by resuming it. Before handing anything back, make the agent try every authorized route -- a scriptable source instead of a blocked site, the page's own file/CDN link or an API, a real browser session instead of a plain fetch. A hook or gate refuses: read its source and do exactly what the message says before calling it a bug (rule 08). Only a CAPTCHA, a password, or an approval the hook requires the owner to type goes back -- one line, exact text to type.
**Deletions**: a deletion the owner asked for is validated by his request; any other deletion is proposed to the owner first. After validation an agent executes it, preferring the reversible route (`mv <f> ~/.Trash/`), then proves it with `ls`.
**Check:** you can answer "where is it?" with the last measurement (time, files changed, tests), never "I don't know".

### 9. Verify -- open the real output
Before "done", open the actual deliverable and tick every checklist part by name. Native vision reads screenshots: look at them. Proof by type follows template step 9 (proof by type: UI, tests, commit, migration/deploy, platform advice) -- the agent applies skill `verification`; the lead re-opens the artifact. Anything unproven is reported "not verified". Proven = stated as guaranteed with its proof; never "I can't guarantee".
**Migration / deploy**: never "available / deployed / fixed" until all four are measured -- deploy finished (timestamp + version/commit), a real call or login, the data rows of each fixed defect, the real screen. Check for an existing session before asking the owner to sign in.
**Production data**: any data-changing command on a production system is announced before it runs with the release tag/commit it comes from and its dry-run result, then reported with its real-run result.
Each task verified -> launch `commit` in WIP mode on the working branch (commit only: no push, bump, PR, merge or tag).
**Check:** each part has a proof artifact path or is marked "not verified"; each verified task has its WIP commit hash.

### 10. Control
Once every agent has finished: `sniper` once on all changes, then the `challenger` before any "done", root-cause, irreversible action or 2nd-time fix. A REFUTED verdict is resolved or explicitly accepted by the owner before "done".
**Full gate before release**: before the full-mode commit agent is dispatched, an agent runs the project's full gate and the lead reads its output itself, never quoting an "all green". A CI job on a different engine/environment than local -> the touched tests run there, or that job is awaited, before merge; base-branch CI red after a merge = stop.
**Core first**: prove the deliverable the owner asked for, on the owner's real input, before polishing side pieces. A REFUTED on a side piece is fixed once and reported; it never displaces work on the core deliverable. No round cap -- order, not count.
**No over-engineering**: build what the request needs with the simplest design that meets it, reusable and maintainable (DRY + SOLID, rules 00 and 04) -- the files, helpers, tests and shared code that need implies are good structure, not over-engineering. Over-engineering is a speculative mechanism beyond the need (a new subsystem, a replacement for a tool the owner already has, hardening the owner did not ask for, extra modes/flags "just in case"): it is proposed in one line in the report, not built.
**Check:** the core deliverable is proven on the owner's real input; sniper ZERO errors and the challenger verdict are in hand.

### 11. Report -- answer first, then learn
Mandate complete -> launch `commit` in full mode (push the working branch, PR, CI, merge never squash, tag, release). Owner reply, in the owner's language (rule 00): line 1 = the answer (done / not done / blocked), then <= 10 lines: proof, not verified, WIP commits made, merge/release announced, one recommendation + the next step, no option menu when one choice is clearly better. Deliverables at a path the owner sees -- never only a hidden directory.
Each owner correction -> one line in the skill/agent that failed, in the source repo, the same turn, written by an agent (template AUTONOMY, rule 03 "Lead conduct"). Sync to the marketplace only when the owner asked for it (HARD STOP 3).
**Check:** line 1 answers the question asked; every deliverable path is outside a dot-folder; each correction is grep-able in the failing skill/agent before the turn ends.

---

## Critical rules (pointers)

1. A mandate is the go -- technical decisions are taken alone and reported (template AUTONOMY).
2. Never invent a cap, path or constraint the owner did not state (template RECURRING TRAPS).
3. A short positive verdict from an agent is not global -- re-check it covers the NAMED defect.
4. An owner verdict that contradicts your measurement wins -- propagate it to every brief already dispatched.

## Reference Guide

| Need | Reference |
|------|-----------|
| Writing a brief (step 6) | [brief-template.md](references/brief-template.md) |
| Bad vs good lead behaviour from real sessions | [worked-examples.md](references/worked-examples.md) |
