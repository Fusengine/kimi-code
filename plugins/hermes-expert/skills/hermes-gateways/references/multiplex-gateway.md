# The single multi-profile gateway

Since v0.22.0 one gateway process (the **host**, normally launched by the
default profile) is the only inbound process on the machine and serves every
profile under `profiles/`. In v0.23.0 that same gateway also owns every
session for CLI, TUI, Desktop, editors, bots and cron.

## How the host decides to multiplex

- Key: `gateway.multiplex_profiles` (also accepted top-level as
  `multiplex_profiles`; env override `GATEWAY_MULTIPLEX_PROFILES`).
- **Unset = on when safe.** At each boot the default gateway runs the same
  preflight as `hermes gateway migrate --multiplex`: two or more profiles, no
  secondary still running its own gateway, no duplicate bot credential, no
  port-binding platform without a `/p/<profile>/` ingress. If safe it
  multiplexes and writes `gateway.multiplex_profiles: true` into the default
  profile's `config.yaml`. If not, it serves only the default profile and shows
  a boxed warning (gateway start, `hermes update`, `hermes gateway status`).
- **Explicit `true`** forces multiplexing (`false` is retired and ignored):

```bash
hermes config set gateway.multiplex_profiles true
hermes gateway restart
```

## Which profiles are served

Every live named profile, except those with `gateway.standalone: true` in
their own `config.yaml`. The served set is live: a profile created while the
host runs is served within seconds (control-socket ping, 30 s rescan safety
net) as soon as its `.env` / `config.yaml` carries a bot token. The retired
`gateway.multiplex_profile_allowlist` is removed by a config migration; to keep
a profile off, park it, archive it, or delete it.

## Day-2 operations

| Goal | Command |
|------|---------|
| Take one profile offline, others keep running | `hermes -p <name> gateway stop` (writes the `gateway.parked` marker) |
| Bring it back | `hermes -p <name> gateway start` |
| Reconnect it with fresh config | `hermes -p <name> gateway restart` |
| Stop everything | `hermes gateway stop` (default profile) |
| Restart the host (all bots reconnect) | `hermes gateway restart` |
| What runs, which profiles are served | `hermes status --full`, `hermes gateway status`, `hermes -p <name> gateway status` |
| Pause one platform adapter without restart | `/platform pause <name>`, `/platform resume <name>`, `/platform list` |
| Logs per profile | `agent.log` / `errors.log` / `gateway.log` under that profile's home; `hermes logs` |

- `hermes -p <name> gateway install|start|run` on a served profile refuses
  (exit 78) or attaches to the host; `--force` exists only for real boundaries
  (fleet split across UNIX users, `HERMES_HOME` outside `<default home>/profiles/`).
- `gateway.standalone: true` is a temporary opt-out for one profile that still
  needs its own process; parking is the multiplex-native way to take a profile
  offline.

## What stays isolated per profile

Resolved from the routed profile on every turn, never from the default one:
provider keys, bot tokens and `${VAR}` references; authorization
(`GATEWAY_ALLOWED_USERS`, `GATEWAY_ALLOW_ALL_USERS`, every platform allowlist);
slash-command gating; adapter settings (`require_mention`, `allow_bots`, ...);
outbound egress (cron delivery, `hermes send`, restart notices; `send_message` is not registered as a model tool at v0.23.0, tools/send_message_tool.py L28-30 - a profile with no bot for a
platform fails clearly, never posts through another profile's bot); session
namespace (`agent:<profile>:...`, default keeps `agent:main:...`) and its own
`state.db`; logs; `terminal.*` sandbox settings; command approvals and
`command_allowlist`; memory-provider identities; MCP connections (shared only
when the entry and credentials are identical).

Shared by design: the process, its PID/lock, `gateway_state.json` under the
default home, the one HTTP listener, and the `gateway.profile_routes` table.

## HTTP-inbound platforms

Secondary profiles share the default profile's listener under a prefix:
`POST http://host:8644/webhooks/<route>` (default) vs
`POST http://host:8644/p/<profile>/webhooks/<route>`. Webhook routes can be
bound to a profile with `hermes webhook ... --route-profile <profile>`.

## One bot, several profiles: `gateway.profile_routes`

Multiplexing picks the profile per credential (each profile's own token) or per
URL prefix. When several communities share **one** bot token, route specific
users / guilds / channels / threads to different profiles with
`gateway.profile_routes`, declared on the default profile. Shape running in
production on 0.23.0 (one Discord bot, one channel per manager):

```yaml
gateway:
  multiplex_profiles: true
  profile_routes:
    - name: <route-label>          # e.g. the channel name
      platform: discord
      guild_id: '<guild-id>'       # optional
      chat_id: '<channel-id>'
      profile: <profile>           # default = the chief
```

Keep the routes in one source file (`company/<platform>/routes.yaml`,
hermes-deploy `company-tree.md`) merged into the live config; for any other
selector (users, threads) read "Routing shared-bot chats to profiles" first.

## Agent-to-agent: the `a2a` platform

The bundled `a2a` platform plugin (`plugins/platforms/a2a/`) makes a profile
callable by other agents over HTTP (A2A v1.0) and gives it the `a2a` toolset
(`a2a_discover`, `a2a_call`, `a2a_list`, `a2a_history`, `a2a_orchestrate`).
Use it for synchronous consultations between managers (e.g. "ask the legal
manager"); durable work still goes on a Kanban card.

```yaml
platforms:
  a2a:
    enabled: true
    extra:
      port: <port>                 # one per profile (default 9900), e.g. 9900 chief, 9901.. managers
      advertised_toolsets: [a2a, kanban, memory, skills, web]
platform_toolsets:
  a2a: [a2a, ...]                  # what an inbound A2A turn may call
a2a_agents:                        # outbound peers this profile may call
  <peer-profile>:
    url: http://127.0.0.1:<peer-port>/<peer-profile>
    auth: {type: bearer, token: <secret - never in git or the plugin>}
    timeout: 300
    capabilities: [consultation]
```

No token → the server binds `127.0.0.1` only; widening needs a token, `A2A_HOST`
and `A2A_TRUSTED_PEERS` (plugin README, env vars `A2A_PEER_TOKENS`,
`A2A_MAX_PINGPONG_TURNS`). With A2A on, keep `voice.auto_tts: false`: an
auto-TTS audio sent before an A2A reply was replaced by a delivery-failure
notice instead of the answer (observed in production).

## Health

- `hermes gateway status` flags "heartbeat stale" (housekeeping stamp older
  than 120 s) and "exited degraded" (event-loop watchdog, exit 75).
- `gateway.loop_watchdog` (default on), `gateway.systemd_watchdog_seconds`
  (Linux/systemd, regenerate with `hermes gateway install --force`).
- `gateway.delivery_ledger` (default on): present in code
  (`gateway/delivery_ledger.py`), undocumented - verify on your version.
  At-least-once redelivery of final replies after a crash, labelled
  "Recovered reply" when ambiguous.
- Keep the host awake (macOS `caffeinate`, Linux `loginctl enable-linger`).

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways
- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/ (Gateway Commands, watchdog, delivery reliability, `/platform`)
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes webhook --route-profile`)
- https://github.com/NousResearch/hermes-agent/blob/main/gateway/config.py (`multiplex_profiles` resolution order)
- https://github.com/NousResearch/hermes-agent/blob/v0.23.0/gateway/delivery_ledger.py (`gateway.delivery_ledger` config gate, default on; code only)
- https://github.com/NousResearch/hermes-agent/releases/tag/v0.23.0
- `plugins/platforms/a2a/{README.md,tools.py}` v0.23.0 (`a2a_agents`, `platforms.a2a.extra`, `A2A_*` env vars)
