# Watching Hermes releases

Hermes ships fast (v0.22.0 on 2026-10-14, seven patch releases, v0.23.0 on
2026-11-05). Guidance older than the installed version can be wrong: v0.22.0
retired session reset timers, v0.23.0 made delegation pluggable and flipped
`sessions.auto_prune` back to opt-in.

## Where the truth is

| Source | URL / command | Use |
|--------|---------------|-----|
| Latest release (API) | https://api.github.com/repos/NousResearch/hermes-agent/releases/latest | `tag_name`, `published_at`, `body` = full notes |
| Latest release (page) | https://github.com/NousResearch/hermes-agent/releases/latest | human reading |
| Feed | https://github.com/NousResearch/hermes-agent/releases.atom | RSS/Atom watcher |
| Installed version | `hermes --version` | |
| Behind the channel? | `hermes update --check` | bypasses the 24 h cache, applies nothing |
| Fleet view | `hermes update --plan` | versions of running services |
| Docs | https://hermes-agent.nousresearch.com/docs/ | rendered from `website/docs/` on `main` |
| Key lists | `cli-config.yaml.example`, `user-guide/configuration.md`, `reference/cli-commands.md` | authoritative keys and flags |

There is no `CHANGELOG.md` at the repo root: **release notes are the changelog**.
Read the "Upgrade notes" section of each release first.

Docs on `main` can describe behavior newer than the latest stable release, and
docs can lag the code (example: `delegation.reasoning_effort` exists only in
source). When docs and code disagree, read the source file
(`tools/*.py`, `hermes_cli/config.py`) and set the value explicitly.

## Freshness procedure

1. `hermes --version` on the target machine.
2. `hermes update --check`.
3. Fetch `releases/latest`; if `tag_name` is newer than the version a skill
   was written for (0.23.0 here), read every release body in between,
   "Upgrade notes" first, then the sections on gateway, cron, delegation,
   sessions.
4. Before writing a key, grep it in the current `cli-config.yaml.example` and
   `configuration.md`; after writing, `hermes config get <key>`.
5. Mark any key found only in source as "undocumented" in the deliverable.

A ready-to-run version of steps 1-3 is in
[templates/freshness-check.sh](templates/freshness-check.sh).

## Official domains only

`hermes-agent.nousresearch.com`, `hermes-assets.nousresearch.com`,
`portal.nousresearch.com`, `github.com/NousResearch`, Docker Hub
`nousresearch/hermes-agent`. Anything else claiming to be Hermes is suspect.

## Sources

- https://api.github.com/repos/NousResearch/hermes-agent/releases
- https://github.com/NousResearch/hermes-agent/releases.atom
- https://hermes-agent.nousresearch.com/docs/getting-started/updating
- https://hermes-agent.nousresearch.com/docs/getting-started/official-domains
