# Private vs company partition

The chief sees both worlds; every other agent sees one. The partition is what
lets an owner hand private and family matters to the same assistant without
fearing they surface in a client file.

## Layers of the seal

| Layer | Company | Private | Hermes primitive |
|-------|---------|---------|------------------|
| Agents | Company managers | Private managers | Separate profiles (own `config.yaml`, `.env`, SOUL.md, memory, sessions, cron) |
| Credentials | Company mailboxes, tokens | Personal mailbox, calendar | Per-profile `.env`; the multiplexed gateway resolves each profile's own `.env` |
| Work items | Company board or tenant | Private board or tenant | Kanban boards (hard boundary) or `--tenant` (soft filter) |
| Files | `<workspace>/<company>/` | `<workspace>/<private>/` | Workspace roots + `terminal.cwd` per profile (hermes-workspace) |
| Project rules | `.hermes.md` in the company root | `.hermes.md` in the private root | Context-file resolution (hermes-core) |
| Memory | Profile memory | Profile memory | Never share one Hermes home between agents |

Kanban docs: boards are the hard isolation boundary, tenants are a soft
filter. Use separate boards for company and private when the seal matters.

## Rules to state in every SOUL.md

1. No private or family document in a company dossier, and the reverse.
2. A manager that is unsure whether something is private or company asks the
   chief; it never invents a folder.
3. Only the chief reads across both spaces, and only to brief the owner.
4. Anything touching the private/family space is a decision path
   (prepare, recommend, go) - see [three-paths.md](three-paths.md).

## Not native - say so

- **File-level isolation between profiles** is not guaranteed by profiles
  alone; profiles are not sandboxes (hermes-core). Use container/sandbox
  terminal backends or `HERMES_WRITE_SAFE_ROOT` (hermes-security). How
  `HERMES_WRITE_SAFE_ROOT` behaves with several profiles on one multiplexed
  gateway is unverified - test it.
- **One mailbox per email adapter instance per profile**: a private mailbox
  and company mailboxes need separate profiles or a mail tool
  (hermes-gateways, hermes-mail-triage).

## Verification (migration or audit)

- List each profile's `.env` variable names (not values) and check no
  private credential sits in a company profile.
- `hermes kanban list --assignee <profile>` per board: no cross-space cards.
- Grep the company root for private markers defined in `profile.yaml`
  (names of family members, private case names) - expected: none.
- Read each manager's `terminal.cwd`: inside its own root.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
- https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban (boards, tenants)
- https://hermes-agent.nousresearch.com/docs/user-guide/security (file write safety, container isolation)
- https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways
