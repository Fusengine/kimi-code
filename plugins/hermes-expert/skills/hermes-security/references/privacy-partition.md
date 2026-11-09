# Privacy partition between profiles

Goal: a private-life agent and a company agent (or several company domains)
on one machine, where nothing from one side reaches the other unless the owner
moves it.

## What Hermes isolates natively (one profile per side)

A profile is a separate Hermes home: its own `config.yaml`, `.env`, `SOUL.md`,
`memories/`, `skills/`, cron jobs, sessions and `state.db`. Under the
multiplexed gateway each routed turn resolves from its own profile:

- provider keys, bot tokens, `${VAR}` references, memory-provider identities;
- allowlists and slash-command gating (a default-profile opt-in never opens a
  secondary's bot);
- outbound egress (cron delivery and `hermes send` post through that profile's bot or fail; `send_message` is not an agent-callable tool at v0.23.0 - tools/send_message_tool.py L28-30);
- session namespace `agent:<profile>:...` and its own `state.db`;
- `terminal.*` sandbox settings and command approvals;
- MCP connections (separate unless entry and credentials are identical);
- the `MEDIA:` denylist covers every profile's secrets and sessions.

## What is NOT isolated by profiles

- **The filesystem.** All profiles' terminals run as the same OS user unless
  you change it; profile A can `cat` profile B's workspace. `HERMES_WRITE_SAFE_ROOT`
  is a write guard for write_file/patch only.
- **Shared OAuth refresh tokens** stay at the root `auth.json` (single-use
  tokens, see hermes-core profiles).
- **The host process**: one gateway PID, one `gateway_state.json`, one HTTP
  listener, the `gateway.profile_routes` table.
- **Delegation across profiles** (`advanced-delegation` `profile_routes`) and
  Kanban boards are bridges by design - configure them deliberately.
- **External services** you point both profiles at (same mailbox, same Slack
  workspace token, same memory bank) merge the data outside Hermes.

## Pattern: a sealed partition

1. One profile per side (`hermes profile create <private-name>`,
   `hermes profile create <company-name>`), never `--clone-all` from the other
   side's profile.
2. Separate credentials for everything: bots, mailboxes, memory provider
   identities (`MEM0_USER_ID`, `SUPERMEMORY_CONTAINER_TAG`, ...), MCP tokens.
   Different Slack workspaces or at least different bots and allowlists.
3. Filesystem: each side's `terminal.cwd` under its own root; for a hard
   boundary give the private side a container backend
   (`terminal.backend: docker`) whose `docker_volumes` mount only the private
   root, and set `HERMES_WRITE_SAFE_ROOT` per side.
4. No cross-profile delegation route or shared Kanban board between the two
   sides; if the chief must see both, it gets summaries the owner approves, not
   raw access.
5. SOUL.md of each side names what must never be mentioned to the other side's
   channels; outbound content goes through the go gate
   ([locked-send-pattern.md](locked-send-pattern.md)).
6. Verify: from the company profile, try to read a private file
   (`hermes -p <company-name> chat -q "read <private path>"`) - it must fail
   on a sealed setup; `hermes -p <name> gateway status` lists each side's own
   adapters only.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways (What is isolated per profile, what is shared)
- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
- https://hermes-agent.nousresearch.com/docs/user-guide/security (File Write Safety: defense in depth, Container Isolation)
- https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation (profile_routes)
