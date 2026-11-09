---
name: hermes-extend
description: Use when extending Hermes Agent - writing or installing Hermes skills (SKILL.md format, ~/.hermes/skills, agent-created skills, skill_manage, curator, skills.write_approval), installing and managing plugins (catalog, plugins.enabled, auto-update, pinned refs), choosing a memory provider plugin, adding MCP servers (mcp_servers, trust, tool filters, spend limits), browser automation with browser_exec, or deciding between a skill and a script. Not for messaging adapters (hermes-gateways), approvals and sandboxing (hermes-security) or core config (hermes-core).
---


<objective>
Give a Hermes Agent profile new abilities the supported way: Hermes skills
(procedures loaded on demand), plugins from the catalog (tools, hooks, memory
providers, platform and backend plugins), MCP servers (external tools), and the
`browser_exec` browser - and know when a deterministic script beats all of
them. Every key and command below was read in the official 0.23.0 docs.
</objective>

# Hermes Extend

## Freshness check

Before writing or changing any Hermes config, run `hermes --version` and
`hermes update --check`, then read
https://github.com/NousResearch/hermes-agent/releases/latest. If the installed
or latest version is newer than 0.23.0, read every release note since 0.23.0
("Upgrade notes" first) and adjust. Never apply guidance from this skill to a
newer version without that check.

## Decision map

| Question | Load |
|----------|------|
| Write, install, lock, approve or share a Hermes skill | [skills-system.md](references/skills-system.md) |
| Install / enable / update / pin a plugin; pick a memory provider | [plugins-memory.md](references/plugins-memory.md) |
| Add an MCP server, filter its tools, gate its writes or costs | [mcp.md](references/mcp.md) |
| The agent must click, fill or scrape a web page | [browser.md](references/browser.md) |
| Skill, script, cron script, plugin or MCP? | [skill-vs-script.md](references/skill-vs-script.md) |
| Ready-to-fill files | [templates/hermes-skill-template.md](references/templates/hermes-skill-template.md) (copy to `~/.hermes/skills/<category>/<name>/SKILL.md`), [templates/extend-config.yaml](references/templates/extend-config.yaml) |

## What changed recently (v0.22.0 - v0.23.0)

- Built-in skills 58 -> 44 (Word/PowerPoint/Excel merged into `microsoft-office`);
  `hermes curator lock <skill>` forbids any agent rewrite, even in YOLO.
- Memory providers (Honcho, Supermemory, Hindsight, Mem0, OpenViking,
  Holographic) moved to catalog plugins; core ships RetainDB and ByteRover.
- Plugin catalog ~600 -> 1,050+ entries, Verified tier, `hermes plugins update`
  for all, opt-in `plugins.auto_apply`.
- MCP: per-tool prices (`tool_costs`) and per-chat `spend_limit` that asks even
  in YOLO; `hermes mcp serve` became the `mcp-serve` plugin.
- Browser: only `browser_exec` drives the browser; the ten old `browser_*`
  tools and agent-browser were removed - rewrite any skill or toolset list that
  names them.

## Critical rules

1. **Never name a tool, key or plugin you have not seen** in the docs, the
   catalog (`hermes plugins search`, `hermes mcp catalog`) or the source.
2. **Third-party code is opt-in.** Installing a plugin does not enable it;
   `plugins.enabled` (or `--enable`) is the consent step. Read the manifest
   (`source:`, bootstrap commands) before installing a catalog MCP.
3. **Agent-written skills are unreviewed procedures.** On any profile that acts
   for an owner, set `skills.write_approval: true` and lock hand-curated skills
   with `hermes curator lock <skill>`.
4. **Untrusted MCP servers get `trust: untrusted`** so every write-capable call
   asks first; `tools.include` keeps the surface minimal.
5. **One external memory provider per profile**, chosen by `memory.provider`;
   built-in `MEMORY.md` / `USER.md` stay on alongside it.
6. **Deterministic, repeatable, side-effecting work is a script**, not a skill
   ([skill-vs-script.md](references/skill-vs-script.md)).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills
- https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins
- https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers
- https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
- https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference
- https://hermes-agent.nousresearch.com/docs/user-guide/features/browser
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
