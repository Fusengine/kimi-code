# Skill, script, plugin or MCP?

A skill is text the model reads and interprets every time; a script is code
that does the same thing every time. Pick by what must be guaranteed.

| The work... | Use | Why |
|-------------|-----|-----|
| needs judgement (triage, drafting, summarising, choosing) | **Skill** | the model must read context and decide; a skill gives it the procedure and pitfalls |
| is the same steps with the same inputs every time (fetch, transform, check a threshold) | **Script** in `~/.hermes/scripts/`, run by a no-agent cron job or called from a skill | zero tokens, zero drift, testable exit codes |
| has an irreversible side effect (send, pay, delete, move mail) | **Locked script** behind an owner approval (hermes-security) | a skill is a request to the model, not an enforcement point |
| must run on a timer with no reasoning | **No-agent cron job** (`--no-agent --script`) | stdout delivered verbatim, empty stdout = silent tick |
| needs reasoning on a timer | **Cron job + skill** (`--skill <name>`) | the job loads the procedure each run |
| is a new tool the model should call with typed arguments, or a hook on every tool call | **Plugin** (`ctx.register_tool`, `ctx.register_hook`) | schema-checked, can block (`pre_tool_call`) |
| already exists as an external service with an MCP server | **MCP server** with `tools.include` | no code to maintain; per-tool approval with `trust: untrusted` |
| is a fact to remember | **Memory**, not a skill | memory is always in context; skills load on demand |

## Combining them (the usual right answer)

The skill holds the judgement and calls the script for the deterministic part:
"read the inbox digest produced by `inbox-digest.sh`, classify, then prepare
drafts for the owner's go". The script owns what must not vary; the skill
never re-implements it in prose.

## Smells

- A skill whose procedure is a fixed list of shell commands -> make it a script.
- A script full of `if` branches guessing intent -> the judgement belongs in a
  skill.
- A skill that says "never send without approval" as the only safeguard ->
  enforcement is missing; add the go gate (hermes-security: `approvals.deny`
  on send commands, no send credential in the profile).
- The agent re-creates the same helper in several sessions -> commit it to
  `scripts/` and reference it from the skill.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills (skills vs memory, agent-managed skills)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron (no-agent mode, `--skill`)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins (Pluggable interfaces)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
