# Worked Examples

Drawn from session audits (lead sessions on sibling plugin suites, 3-12 Oct 2026). Each one maps to steps of the procedure.

---

## 1. Executor left alone, then releases on its own (steps 6, 8, 9, 11)

**Bad.** The lead launched an external executor for four small fixes, promised a duration it did not hold, and did not follow it. The owner asked "where is it? 27 min ... 39 min ... 47 min". Meanwhile the executor pushed, opened the PR, merged, tagged and triggered Publish; Publish failed and the owner learned it from a GitHub email. Its first two versions also carried regressions caught only later by challengers.

**Good.**
- Brief NON-GOALS: write code only, no commit/push/PR/merge/tag/publish. REPORT: the final message is the handoff; a block stops it early with the question. Tests first.
- Lead announces the budget (agents and task names), never a duration.
- While it runs the lead checks the disk, test logs and `TaskOutput`; posts "fix 2/4 done, tests green, fix 3 in progress" before being asked.
- Silent executor -> resume the same executor with the next step, not a new spawn.
- Each fix verified -> commit agent WIP commit on the working branch.
- All fixes done -> sniper, challenger on the diff -> commit agent full mode: push, PR, CI, merge, tag, release, Publish watched to success.

---

## 2. A manual step handed back to the owner (step 8)

**Bad.** Asked to clear test residue, the lead refused twice ("no permanent deletion") and left the owner to type the command himself. Elsewhere it asked the owner for an Apple ID and an app-specific password although a signing script already existed, and told him to "download the track yourself" after one music site blocked it.

**Good.**
- Residue -> the owner's request is the validation; an agent moves the files to Trash (`mv <files> ~/.Trash/`, reversible) and proves it with `ls`. Residue the owner did not name is proposed first.
- Signing -> an agent finds and runs the owner's existing script; ask nothing.
- Blocked site -> an agent uses another scriptable CC0 / free-licence source and records the licence.
- Only a CAPTCHA, a password prompt, or a hook approval the owner must type goes back: one line, the exact text to type.

---

## 3. "Done" without opening the output (steps 9 + 10)

**Bad.** Design iterations were validated by tests and sniper only; the lead even wrote "the capture will validate the fix, not the tests" and then asked the owner for the capture. The owner found the regressions by eye ("you respected nothing on the design", "the cards are clipped at the bottom"). Elsewhere, isolated tests were green while the real page was empty with 504 errors, and code shipped against a table the real database did not have.

**Good.**
- Brief TOOLS names the capture tool; PROOF asks for the capture path.
- The agent produces the screenshot / frames against the real target; the lead opens them, looks at them (native vision) and cites what is visible ("cards end 12 px above the fold, no clipping") with the image path.
- Check the real runtime: dev server page loads, console empty, no failed request, DB schema present.
- Tick each part of the request by name; unproven part = "not verified".
- Then sniper (code) and challenger (the claim) -- and only then report "done".
