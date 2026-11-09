# Real test day

One ordinary working day on the new setup, with the owner, before calling
the migration done. A demo proves the happy path; a real day shows the
gaps.

## Script

| Time | What | Pass when |
|------|------|-----------|
| Morning | Morning brief fires on schedule | Arrives on time; sections in order; every open "Go?" from the registry present; no internal traces in owner-facing text |
| Request 1 | A question the chief already knows (dossier status) | Answered in seconds, no card |
| Request 2 | A task needing a manager and a document | One card, owner's exact words quoted, immediate ack with who and when; deliverable verified before handover; a correction goes to the same card |
| Request 3 | An outbound action (email with attachment) | Trace scan 0 hits; exact preview (from, to, subject, body, attachment); nothing sent before go; sent through the server's existing send mechanism after go |
| Day | Pilot check and mail triage | Silent when nothing new; triage moves nothing before "ok" |
| Day | Voice replies (if enabled) | Spoken for the ear; forced failure of the primary → backup speaks, incident reported |
| Evening | Evening review | Done / Left / Waiting for you; matches what actually happened |
| Next morning | Fresh context | New conversation, yet the brief knows everything open (from files) |

## Record

For each line: pass/fail, evidence (message link or screenshot, log line),
and the fix if failed. A failure → fix, then repeat that line the next day;
the migration is done when a full day passes.

## After the day

Re-run every measure ([measures.md](measures.md)) and fill the before/after
table. Present it to the owner with the failures found and fixed.
