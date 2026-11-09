# Brief Template

## Why

A brief summarised from memory drifts from the owner's request: parts get dropped, negative constraints vanish, paths get invented. Kimi sub-agents see only the prompt they are given, so fixed headers force the owner's exact words, the files the task owns, the proof and the team into every mandate, letting the agent be judged on disk instead of on its own summary. The header names are fixed (same order, same spelling) so a hook can check that a brief is complete.

## Template

```markdown
## OWNER RULES (verbatim)
> "<exact owner sentence(s), copied, not paraphrased>"
- Owner's verb: "<audit / fix / ...>", quoted -- a read-only verb (audit, analyse, explain, check) means WRITE: none.
- Standing decisions (from docs/decisions.md): <dated lines that apply> -- execute them, do not re-debate.
- Protected target (only if the owner named it): <path> -- owner's words: "<quote>"

## WRITE
- Exclusive files: <absolute paths this task owns -- no other agent touches them>
- Read only: <paths you may read>
- Re-read each file on disk right before editing; start from the on-disk state, preserve others' work.

## OUTPUT
Context: <what exists, why this mandate, what was already tried and failed>
1. <part 1 -- the deliverable, as an acceptance criterion>
2. <part 2>
N. Negative: <"do not touch X">
- "Everywhere" request: one line per place (component / route path) -- one test and one real capture each.

## TOOLS
- Skills to load before editing: <SOLID skill from solid-detection>, <domain skills>, verification
- Capture tool (visual task): <fuse-browser browser_screenshot / simulator screenshot / frame extraction>
- Hook block -> do exactly what it says; read the gate source before calling it a bug.

## PROOF
1. <part 1> -- <command + expected exit code | artifact path (capture, test log, diff hunk)>
2. <part 2> -- <...>
N. Negative -- `git diff --stat` shows no change under X

## NON-GOALS
- <what this task must not do, files it must not touch>
- No commit, push, tag or publish yourself: the lead has the commit agent make a WIP commit once your task is verified.
- No deletion outside your files; a needed deletion is reported to the lead, never executed.
- No cap, timeout or limit not stated here or by the hook (FUSE_SOLID_MAX_LINES).

## TEAM
- Lead: the main session (it reads your final message)
- Peers: <task name -- owned files -- task>, ...
- Peers never talk to each other. A contract or interface change, a file a peer owns (never edit it), a result you wait for -> put the request in your final report; the lead relays it by resuming the owner agent.
- Shared resource owner (build, simulator, server): <task name>

## LANGUAGE
Code comments, docs, commit messages: English. Replies to the user: the user's language.

## REPORT (your final message is the entire handoff, short)
- Block: stop early and return it in your final message, with the routes already tried (Exit: Retry / Rollback / Ask / Escalate); the lead answers by resuming you.
- Final: done | not done -- proof per part -- not verified -- files touched (path:line) -- skills consulted.
- Open points: decide them yourself from the measurement and the mandate's goal, and report the decision. Return ONE binary question for the lead (never the owner, never an option menu) only for the part where incoming information contradicts OWNER RULES; finish the rest first. Irreversible git (push to a protected branch, force-push, reset) stays gated by template HARD STOP 1, not by a question.
- Re-dispatch of an already-delivered mandate -> verify the disk and refuse to re-execute.
```

## Filling rules

| Header | Rule |
|--------|------|
| OWNER RULES | Copy the sentence. A mockup/capture the owner sent is given by path: it is the source of truth, not a hint. Protected target only when the owner named it in this session; otherwise omit the line. |
| WRITE | Absolute paths; the same file never appears in two concurrent briefs. |
| OUTPUT | One line per checklist part from step 1; context stays in two or three lines. |
| PROOF | One proof per OUTPUT line, something the lead can open or re-run. |
| TOOLS | Visual task -> name the capture tool; without it, the part cannot be proven. |
| NON-GOALS | External executor: add "write code only -- release goes through the commit agent". |
| TEAM | Every task in the ownership table of step 5, even for a single agent (then Peers: none). |
| REPORT | Short; the owner-facing reply is the lead's job. |
