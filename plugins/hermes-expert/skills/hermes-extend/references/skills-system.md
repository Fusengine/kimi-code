# Hermes skills

A Hermes skill is a directory with a `SKILL.md` (YAML frontmatter + body) and
optional `references/`, `templates/`, `scripts/`, `examples/`, `assets/`. Each
installed skill is also a slash command (`/<skill-name>`). Loading is
progressive: `skills_list()` (names + descriptions) -> `skill_view(name)` ->
`skill_view(name, path)` for one reference file.

## Format

```yaml
---
name: my-skill
description: Brief description of what this skill does
version: 1.0.0
platforms: [macos, linux]          # optional OS filter
metadata:
  hermes:
    tags: [automation]
    category: productivity
    requires_toolsets: [terminal]  # optional conditional activation
    fallback_for_toolsets: [web]   # optional: shown only when these are missing
    config:                        # optional non-secret settings -> skills.config
      - key: my.setting
        description: "What this controls"
        default: "value"
        prompt: "Prompt for setup"
required_environment_variables:    # optional; asked securely in the local CLI only
  - name: EXAMPLE_API_KEY
    prompt: Example API key
---
```

Body sections the docs use: `## When to Use`, `## Procedure`, `## Pitfalls`,
`## Verification`. Also available: `requires_tools` / `fallback_for_tools`,
`required_credential_files`. Declared env vars are passed through to
`terminal` and `execute_code` only once the skill is loaded and the var is set.

Writing rules from the docs: capture **lessons, not logs** (a generalizable
rule plus one clause of why, no incident narration); keep always-on rules in
`SKILL.md`; a few topic-named reference files, extended in place. The
`skill_manage` linter warns on `incident-log-shape`, `references-sprawl`
(>60 files) and `oversized-body` (>~24k chars).

## Where skills live (precedence, highest first)

1. Project: `<repo>/.hermes/skills/` or `<repo>/.agents/skills/` - loaded only
   after `hermes skills trust` (stored in `skills.trusted_project_dirs`),
   scanned and quarantined if dangerous; `skills.project_discovery: false`
   turns it off.
2. Local, per profile: `~/.hermes/skills/<category>/<name>/` (agent-created
   skills land here).
3. `skills.create_dir` - redirect where the agent creates skills.
4. `skills.external_dirs` - shared directories; **not** write-protected if the
   Hermes user can write them.

Same name in one directory -> ambiguous, never guessed. Plugin skills use
`plugin:skill` names.

## Agent-created skills

The system prompt asks the agent to save non-trivial workflows with
`skill_manage` (`create`, `patch`, `delete`, `write_file`, `remove_file`):
after a multi-step workflow, after finding the working path past errors, after
a user correction. The background review can also stage changes after a turn.
`/learn` builds a skill from sources (docs, a directory, this conversation).

Controls:
- `skills.write_approval: true` stages every write under
  `~/.hermes/pending/skills/`; review with `/skills pending`,
  `/skills diff <id>`, `/skills approve <id>|all`, `/skills reject <id>|all`,
  `/skills approval on|off`.
- `skills.guard_agent_created` - content scanner, independent of approval.
- `hermes curator lock <skill>` - no tool (skill_manage, write_file, patch,
  terminal) may change it, in any session, YOLO included; you still can.
- Curator (agent-created skills only; bundled and hub skills untouched):
  `hermes curator status|run [--dry-run]|pause|resume|pin|unpin|archive|restore|backup|rollback`.

## Installing and pinning

- `hermes skills browse|search|inspect|install|uninstall|list|check|update|audit`;
  sources include `official/...`, `skills-sh/...`, `well-known:<url>`, GitHub
  paths, direct `https://.../SKILL.md`. Installs are scanned; `--force`
  overrides a caution verdict - read the finding first.
- `hermes skills tap add <repo>` for a custom skill index.
- `skills.auto_load: [names]` pins skills into every session;
  `slack.channel_skill_bindings` pins them per channel (hermes-gateways);
  cron jobs attach them with `--skill <name>` (hermes-cron).
- `hermes bundles` groups skills for one kind of work.
- New skills appear in an open conversation with a one-time note; no reload
  needed (`/reload-skills` only refreshes slash commands).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Skill Settings)
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes skills`, `hermes curator`, `hermes bundles`)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (curator lock, 58 -> 44 built-in skills)
