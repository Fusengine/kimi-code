# Plugins and memory providers

## Kinds of plugins

| Kind | Adds | How it is activated |
|------|------|---------------------|
| General plugin (`~/.hermes/plugins/<name>/`, pip entry point) | tools, hooks, slash commands, CLI subcommands, bundled skills | **Opt-in**: `plugins.enabled` |
| Bundled platform plugin (`plugins/platforms/`) | gateway adapters (Slack, Telegram, ...) | auto-loaded; channel on via credentials / `platforms.<name>.enabled` |
| User platform plugin (`~/.hermes/plugins/platforms/`) | third-party adapter | opt-in via `plugins.enabled` |
| Bundled backend (image_gen, delegation, ...) | provider for a category | auto-loaded; chosen by `<category>.provider` / `delegation.backend` |
| Memory provider (`plugins/memory/`) | external memory | exactly one active: `memory.provider` |
| Context engine | compression strategy | one active: `context.engine` |
| Model provider | inference backend | picked by `--provider` / config |

Project plugins (`.hermes/plugins/`) are not loaded by the gateway that runs
sessions. Gateway event hooks (`~/.hermes/hooks/<name>/HOOK.yaml` +
`handler.py`) are **not** plugins and are trusted by placement - anything
dropped there runs.

## Managing plugins

```bash
hermes plugins                          # interactive toggle UI
hermes plugins search <term>            # catalog search
hermes plugins install <catalog-name>   # repo at a reviewed pinned SHA
hermes plugins install owner/repo [--enable|--no-enable]
hermes plugins install owner/repo --ref <full-40-char-sha>   # reproducible pin
hermes plugins enable|disable <name>
hermes plugins list                     # Source column shows git pinned@<sha8>
hermes plugins check-updates            # read-only
hermes plugins update [<name>] [--yes]  # all at once without a name
hermes plugins remove <name>
hermes plugins capabilities [<name>]    # declared vs granted capabilities
```

`config.yaml`:

```yaml
plugins:
  enabled: [<plugin-name>]
  disabled: [<plugin-name>]     # deny-list, always wins
  auto_apply: false             # opt-in auto-update (v0.23.0); breaking updates are held back
```

Also: `plugins.clone_timeout_seconds` (300), `plugins.hook_callback_timeout`
(30, timed-out `pre_tool_call` fails closed), `plugins.load_timeout_seconds`
(10). Pinned plugins refuse `plugins update`; move them with
`install <source> --force --ref <new-sha>`. Private repos authenticate with
`GITHUB_TOKEN`/`GH_TOKEN`, the `gh` login, or your git credential helper.

Catalog tiers: Official, Verified (built by the vendor), Community. Known
catalog names used elsewhere in this plugin: `hermes-session-reset-policy`
(time-based context resets, hermes-core), `advanced-delegation`
(`model_map` / `profile_routes`, hermes-delegation), bubblewrap sandbox
(hermes-security). Confirm the exact name with `hermes plugins search` before
installing.

## Memory providers

Built-in memory (`memories/MEMORY.md`, `USER.md`) is always on. One external
provider can be added per profile; it then injects provider context, prefetches
memories each turn, syncs turns, extracts on session end, mirrors built-in
writes and adds its own tools. Everything sent to it passes the same secret
scrub as chat delivery.

- Shipped in core: `retaindb`, `byterover`.
- Catalog plugins: `honcho`, `hindsight`, `supermemory`, `mem0`, `openviking`,
  `holographic` (install with `hermes plugins install <name>` first), plus newer
  catalog entries listed in the v0.23.0 notes.

```bash
hermes memory setup          # picker + provider-specific setup
hermes memory status
hermes memory off
hermes config set memory.provider <name>
```

Per-profile scope: under a multiplexed gateway each provider identity
(`MEM0_USER_ID`, `SUPERMEMORY_CONTAINER_TAG`, `HINDSIGHT_BANK_ID`, ...) is read
from the routed profile's `.env`, so a private profile and a company profile
write to different banks. Two agent processes must never share one Hermes
home; shared memory between agents goes through a provider, not a shared
`memories/` directory.

Related gates: `memory.write_approval: true` stages memory writes
(`/memory pending|approve`), see hermes-core.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins
- https://hermes-agent.nousresearch.com/docs/user-guide/features/plugin-catalog
- https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers
- https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways (per-profile memory-provider credentials)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0 (auto-update, catalog growth, Verified tier)
