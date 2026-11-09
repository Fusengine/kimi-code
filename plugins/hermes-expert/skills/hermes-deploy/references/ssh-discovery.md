# Phase A - SSH discovery (read-only)

The agent connects itself. Nothing is written on the server in this phase:
no `hermes` subcommand that writes, no file copy, no edit, no `mkdir`.

## 1. Pick the host

1. The owner named a host or an alias → use it.
2. Otherwise read `~/.ssh/config` (and its `Include`s) locally: one `Host`
   entry whose alias or `HostName` clearly matches what the owner or the
   document names → use it, and say which entry in the report.
3. None, or several candidates → ask once: "Which SSH host alias is the
   Hermes server?" Never try hosts one after another.

Connection test, non-interactive so it never hangs on a password prompt:

```bash
ssh -o BatchMode=yes <alias> 'echo ok; id -un; uname -a'
```

Key refused → the only owner step is authorising the agent's key on the
server; give him exactly the one line to run, then retry.

## 2. Freshness and health

```bash
ssh <alias> 'hermes --version'
ssh <alias> 'hermes update --check'
ssh <alias> 'hermes doctor'; echo "exit=$?"     # exit 1 while a problem remains
ssh <alias> 'hermes gateway status'
```

Then read https://github.com/NousResearch/hermes-agent/releases/latest
locally. Newer than 0.23.0 → read every release note since and adjust the
dry run. `hermes` not found on the server → stop: first install is
hermes-core, with its own go.

## 3. Profiles and homes

```bash
ssh <alias> 'hermes profile list'
ssh <alias> 'hermes profile'                    # current profile, path, model, gateway status
```

Home per profile: the default profile is `~/.hermes/` (or `$HERMES_HOME`),
named profiles `~/.hermes/profiles/<name>/` - confirm the path from
`hermes profile` output, never assume it.

## 4. Current state, per profile

Pull copies into `<staging>/live/<profile>/` for the diff of Phase B:

```bash
ssh <alias> 'cat <home>/config.yaml'  > <staging>/live/<profile>/config.yaml
ssh <alias> 'cat <home>/SOUL.md'      > <staging>/live/<profile>/SOUL.md
ssh <alias> 'hermes -p <profile> cron list' > <staging>/live/<profile>/cron.txt
ssh <alias> "sed 's/=.*//' <home>/.env" > <staging>/live/<profile>/env.names   # NAMES only
```

**`.env` is never read with values** - only the `sed` above, which strips
everything after `=`. If a `config.yaml` holds an inline secret (it should
not, hermes-core), mask it in the local copy and list it as a finding.

Also collect, when present:

- `.hermes.md` / `AGENTS.md` at each workspace root and their parents up to
  the git root (`ls`, `cat`), plus `git -C <root> rev-parse --show-toplevel`;
- directory listing of the workspace roots (`ls -la`, depth 2);
- installed plugins: `hermes plugins list`;
- server time zone (`timedatectl show -p Timezone --value`, or
  `readlink /etc/localtime`);
- the send mechanism already on the server (for example an existing send
  script, its cron/timer entry and the account it runs as): `ls -l` of the
  script, how it is triggered, `id <user>` of its account, and whether its
  credential files are readable by the Hermes user (`ls -l`, never `cat`).
  Read the script to answer the audit questions of hermes-security
  `locked-send-pattern.md`; never modify it. None found → record "no send
  mechanism".

## 5. What discovery produces

`<staging>/live/` (read-only copies) and a discovery summary that feeds the
profile derivation: version installed/latest, doctor exit and findings,
profiles and their models, existing cron jobs, platforms and delivery
targets in use, env NAMES per profile, workspace roots and context files,
plugins, time zone.

## Sources

- https://hermes-agent.nousresearch.com/docs/reference/cli-commands (`hermes profile`, `hermes doctor`, `hermes cron list`, `hermes plugins list`, `hermes gateway status`)
- https://hermes-agent.nousresearch.com/docs/user-guide/profiles
- https://man.openbsd.org/ssh_config (`Host`, `HostName`, `Include`, `BatchMode`)
- https://github.com/NousResearch/hermes-agent/releases/latest
