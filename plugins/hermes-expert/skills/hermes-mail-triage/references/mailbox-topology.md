# Mailbox topology

## The constraint

The Hermes email gateway adapter is configured per profile with one
account (`EMAIL_ADDRESS`, `EMAIL_PASSWORD`, `EMAIL_IMAP_HOST`,
`EMAIL_SMTP_HOST` in that profile's `.env`). It exists so people can email
the agent and get replies: it polls UNSEEN mail and treats each message as a
conversation. Multi-mailbox support inside one adapter is not documented.
Detail and options: [hermes-gateways #several-mailboxes](../../hermes-gateways/references/messaging-adapters.md#several-mailboxes).

## Two different jobs

| Job | Tool | Why |
|-----|------|-----|
| The owner or contacts **talk to** the agent by email | Email gateway adapter, on a dedicated address, with `EMAIL_ALLOWED_USERS` | Docs: use a dedicated account, restrict senders |
| The agent **triages** the owner's existing mailboxes | Bundled Himalaya email skill (`himalaya` CLI, several accounts in `~/.config/himalaya/config.toml`) or an IMAP/MCP mail tool | Read-only access, several accounts, no auto-reply behaviour |

Do not triage through the conversation adapter: it marks existing messages
as seen on start and answers allowed senders.

## Layout options for N mailboxes

1. **One mail profile per partition** (recommended): a company mail profile
   holding the company accounts in its Himalaya/MCP config, a private mail
   profile for the private account. Credentials stay in each profile's
   `.env`; the seal holds.
2. **One profile per mailbox**: maximum isolation, more cron jobs and
   profiles to maintain.
3. **One profile for all**: simplest, but breaks the private/company seal -
   avoid when a private mailbox is involved.

Schedule: one cron job per mail profile, e.g. `every 2h`, delivering the
proposal list to the decisions channel (hermes-rhythm, hermes-cron).
Sending from any of these accounts goes through hermes-outbound and, after
the owner's go, the server's existing send mechanism (hermes-security) -
never from the triage job.

## Verify before claiming

- `himalaya` account syntax and read-only flags: check the installed
  version's docs and the bundled skill page.
- That the triage run leaves `\Seen` untouched: test on one message, check
  its flags in a mail client.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email
- https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/email/email-himalaya
- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
