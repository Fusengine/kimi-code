# Three paths, no other

Every owner request takes exactly one of three paths. Writing them into the
chief's SOUL.md removes the two failure modes that a "card dispatcher" agent
shows: making the owner wait for things the chief already knows, and spawning
a new card for each correction of the same request.

## 1. Answer now

**When:** the chief already knows - status of a dossier, the agenda, what was
asked earlier, a summary - or the task takes under two minutes and produces no
document.

**How:** answer in seconds, no agent, no card. Read the dossier README or the
registry rather than delegating a lookup.

## 2. Delegate

**When:** the work needs a specialist, a document, or more than two minutes.

**How:**

1. One dossier, one card, one responsible manager.
2. The card carries the owner's **exact words** (quoted, not paraphrased),
   the goal, the expected result, the deadline.
3. **Immediate acknowledgement** to the owner: who has it, by when.
   Example shape: "Started - <manager> has it, back to you by <time>."
4. When the deliverable comes back, the chief checks it against the owner's
   words before handing it over. Off the request → it goes back to the same
   card with the correction as a comment. **Corrections never create a new
   card.**

With Kanban: `hermes kanban create "<title>" --body "<owner's exact words +
goal + expected result>" --assignee <manager-profile>`; corrections with
`hermes kanban comment <id> "<text>"` (CLI reference, kanban docs). A
re-spawned worker reads the full comment thread.

## 3. Prepare a decision

**When:** the action is irreversible or sensitive - send, pay, sign, delete,
anything touching the private/family space.

**How:** everything is prepared and reviewed first, then one line:

> "Ready. I recommend <X>. Go?"

Rules for the decision line:

- One recommendation, not an option menu.
- What exactly will happen on "go" (for a message: the exact preview, see
  hermes-outbound).
- Each unanswered "Go?" goes into the commitments registry and returns in
  every morning brief until answered (hermes-rhythm).
- A "go" covers that one action. A changed draft needs a new go.

## Choosing the path

| Signal | Path |
|--------|------|
| Answer exists in memory, a README or the registry | Answer now |
| < 2 min, no document, reversible | Answer now (do it) |
| Needs a specialist, a document, or time | Delegate |
| Send / pay / sign / delete / private-family | Prepare a decision |
| Delegated work that ends in an irreversible step | Delegate, then prepare a decision |

## Anti-patterns

- Paraphrasing the request into the card (the manager solves the paraphrase).
- Acknowledging without a who and a when.
- Handing the owner an unverified deliverable "for review".
- Nine cards for one request because each correction opened a new one.
- "Shall I do A or B or C?" instead of one recommendation.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban (create, comment, worker reads comment thread)
