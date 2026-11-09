# Secrets handling

## Where secrets live

- Per profile: `<profile home>/.env` (API keys, bot tokens, passwords) and
  `auth.json` (OAuth). Never in `config.yaml`; reference them there as
  `${VAR}` / `${env:VAR}`. `hermes -p <profile> config set UPPER_SNAKE value`
  always writes to that profile's `.env`. `chmod 600` every `.env`.
- Precedence: CLI args > `config.yaml` > `.env` > defaults (hermes-core).
- Under the multiplexed gateway each profile's keys are resolved from its own
  scope and never unioned with another profile's (hermes-gateways).

## External secret managers (`secrets.*`)

Hermes can load keys at startup from Bitwarden Secrets Manager (`bws`),
1Password (`op://` references) or a **command helper** that prints
`KEY=VALUE` lines; only the manager's bootstrap token stays in `.env`.

```yaml
secrets:
  sources: [<bitwarden|onepassword|command>]   # optional explicit order
  command:
    enabled: true
    command: "<vault cli that prints KEY=VALUE lines>"
    helper_timeout_seconds: 3                   # must be fast and non-interactive
    override_existing: false
  preserve_existing: [<PER_PROFILE_TOKEN_NAME>] # .env value always wins for these
  # profile_alias: true (default): vault FOO_<PROFILE> also fills FOO for that profile
```

Precedence: `.env`/shell wins unless a source sets `override_existing: true`;
mapped sources beat bulk sources; first claim wins (with a startup warning).
Other vaults ship as secret-source plugins (`ctx.register_secret_source`).
CLI: `hermes secrets`.

## Keeping secrets out of the model

- `security.redact_secrets: true` (default): key/token/password patterns are
  masked in tool output and logs; reading `.env`-style files through
  read_file / `cat` masks credential assignments.
- Messaging surfaces never ask for secrets in chat; skills declaring
  `required_environment_variables` prompt only in the local CLI.
- `hermes config get <key>` masks credential-shaped values (`--raw` reveals -
  never run it from an agent session).
- Everything sent to a memory provider is scrubbed first.
- `MEDIA:` attachments can never include another profile's `.env`,
  `auth.json`, `state.db` or sessions.
- Borrowed logins: set `auth.adopt_external_logins: false` if you run the
  Codex CLI or Claude Code beside Hermes and want Hermes on its own login.

## Rules

1. A credential the agent must not use is a credential the agent's processes
   cannot read: not in the profile `.env`, not in `terminal.env_passthrough`,
   not in `docker_forward_env`, not in a file the Hermes OS user can read.
2. One credential per purpose and per profile (separate read and send tokens,
   separate private and company tokens) so revoking one never breaks the other.
3. Rotate through the vault, not by editing several `.env` files; restart the
   gateway after rotating keys that only live in the process environment.
4. `hermes security audit` checks installed dependencies against OSV
   advisories; run it after plugin installs.

## Sources

- https://hermes-agent.nousresearch.com/docs/user-guide/secrets/ (sources, precedence, profiles, child processes)
- https://hermes-agent.nousresearch.com/docs/user-guide/secrets/command
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration (Security, Environment Variable Substitution)
- https://hermes-agent.nousresearch.com/docs/user-guide/security (Credential Redaction, Borrowed CLI logins, Supply-chain advisory checking)
- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes config get`, `hermes secrets`, `hermes security`)
- https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways (per-profile secret scope, MEDIA denylist)
