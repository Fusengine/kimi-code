# fuse-hermes

Expert configuration of **Nous Research Hermes Agent** (open source, MIT, [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)) — baseline version 0.23.0, with a mandatory freshness check against the latest release before any config is written. Universal Hermes knowledge lives in the skills; one owner's specifics come from the owner's own description of the organisation, turned by the agent into an internal profile.

## Agent

| Agent | Description |
|-------|-------------|
| **hermes-expert** | Deploys a chief-of-staff system end to end from a free-form description of your organisation: reads the document, connects to the server over SSH, derives the profile, dry-runs, applies after your go, verifies. Also configures, audits and evolves existing installs |

## Skills

| Skill | Description |
|-------|-------------|
| hermes-core | Install, update channels, profiles, `config.yaml` schema, models/providers, SOUL.md / `.hermes.md` / AGENTS.md resolution, sessions, logs/health |
| hermes-delegation | `delegation.*` keys, pluggable backends, `advanced-delegation`, spawn depth, concurrency, manager/employee topology |
| hermes-cron | `hermes cron` jobs — schedules, `--workdir`, timezone, catch-up, reasoning effort, delivery, preflight |
| hermes-gateways | Multiplexed gateway, Slack/Telegram/Discord/email adapters, voice TTS/STT, building a fallback |
| hermes-extend | Skills system, memory providers, MCP, plugins, `browser_exec` |
| hermes-security | Approval model, `approvals.deny`, sandbox/terminal backends, secrets, go gate (audit of the server's existing send mechanism, no send script shipped) |
| hermes-chief-of-staff | Chief → managers → employees, three paths, eight rules, private/pro partition, `profile.yaml` template |
| hermes-rhythm | Morning brief, evening review, weekly review, monthly dashboard, commitments, decisions channel |
| hermes-outbound | Nothing-internal-leaves checklist, owner's voice, show-exact-before-go, irreversible go gate |
| hermes-mail-triage | Bulk, SPF/DKIM/DMARC, blocklists, scam checks, learning, never moves mail alone |
| hermes-workspace | Layout, naming, scratch outside workspace, end-of-task checklist, weekly cleanup |
| hermes-migration | Backup, new SOUL/workflow, test day, before/after measures |
| hermes-deploy | Document → profile, read-only SSH discovery, dry run + diff, one go, apply, verify, rollback |

## Freshness

Hermes ships often and its docs can lag its code. Every skill starts with the same check: `hermes --version`, `hermes update --check`, and the [latest release notes](https://github.com/NousResearch/hermes-agent/releases/latest). Newer than 0.23.0 → read every release note since before applying any guidance.

## Installation

```bash
/plugin install fuse-hermes
```

## Usage

Give the agent your document and the server. That is all:

> "Here is how my company works (attached PDF). Set up Hermes on `<ssh host alias>`."

The document can be a PDF, DOCX, Markdown, plain text, or just a conversation. The agent:

1. reads it and derives the operating profile itself (you never write YAML);
2. connects to the server over SSH and inspects it read-only (version, profiles, config, cron, `hermes doctor`);
3. asks you at most one grouped question, only for decisions that are yours (who is the owner, which mailboxes, what is private);
4. prepares everything locally and shows you what will change on the server;
5. after your single "go": backs up, applies, verifies, and keeps a rollback ready.

You never run a command. Secret values are never printed: you set them yourself, or tell the agent where they are on the server.

The agent also handles one-off Hermes work: a `~/.hermes/` home, a `config.yaml` / `SOUL.md` / `.hermes.md` to write or audit, an upgrade.

For Kimi Code agents/skills use `agent-creator` / `skill-creator`; for prompt design outside Hermes use `prompt-engineer`.
