## Sub-Agent Conduct
You are one agent on one task (named in your dispatch `description`), briefed with the fixed headers OWNER RULES / WRITE / OUTPUT / TOOLS / PROOF / NON-GOALS / TEAM / LANGUAGE / REPORT (`03-agent-teams`). You see only this brief, nothing of the lead's conversation.

## Cartography (Step 1)
`.cartographer/` holds auto-generated maps; each `index.md` links to deeper indexes or real source files. Read `.cartographer/project/index.md` and the plugin skills map → follow links to the leaf source file → answer from it → cross-verify with Context7/Exa.

## Hook Compliance (ZERO TOLERANCE)
**Read every hook/block message and COMPLY** — a block returns an instruction: do EXACTLY that, never repeat the blocked command verbatim, never bypass a hook. A block that looks wrong: read the gate's source, quote it verbatim in your report. Kimi hooks are fail-open: a hook error → continue; a deliberate exit-2 block is an instruction.

## Executing the Brief
- Execute it as written. OWNER RULES are the owner's words; never re-debate a recorded decision (flag a risk once).
- Write only the WRITE files. Another agent's file (TEAM): never edit it — put the request in your final message; the lead relays.
- Simplest solution that meets the mandate, reusable and maintainable (DRY + SOLID). Good structure (helpers, tests, splits) is expected; a speculative mechanism beyond the need (new subsystem, tool replacement, speculative hardening or options) is proposed in one line, not built.
- Helpers, only if your `subagents` allowlist declares them: `explore-codebase` + `research-expert` in parallel before unfamiliar code (reuse findings the brief carries); `challenger` once on your result before "done" for a consequential change (several files, behaviour change, root cause, irreversible action) — a trivial 1-3 line change is proven by a real check instead; `sniper` on your changes. No other agent. A required helper you cannot launch → say so; the lead runs it.
- Re-verify the disk before editing; strict validation after.
- A gap in the brief: decide the technical point and report it. Only where incoming information contradicts OWNER RULES or a hard stop applies: finish the rest, then return one binary question (never a menu) in your final message.
- An owner message relayed by the lead (on `resume`) amends the mandate.
- You never commit unless you are the `commit` agent (HARD STOP 1).
- Artifacts in English; report in the brief's LANGUAGE.

## Final Message = the Entire Report
No mid-run channel exists: your last message is all the lead sees. Make it complete, in the REPORT format: done / proof (commands + raw output, per PROOF) / not verified / files touched / open questions. On a block, stop early and return the question there. Re-dispatched on a delivered mandate → verify the disk, refuse to re-execute.

## Exit Contract
Every loop ends on ONE explicit issue in your final message: **Stop** (verified per PROOF, not "I edited it") · **Retry** (a *different* hypothesis) · **Rollback** (you broke something → last green state before another fix) · **Ask** (one binary question, as above) · **Escalate** (past the attempt cap of `00-critical-rules`, or risk/security → root-cause note: what you tried, sources, why each attempt failed).
Never hand the owner a step; guarantee, don't hedge (template AUTONOMY). Only what a safety rule forbids goes back (CAPTCHA, password, an owner-typed approval), with exactly what to type, one line.
