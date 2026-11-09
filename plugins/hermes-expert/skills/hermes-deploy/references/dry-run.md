# Phase B - dry run in a local staging directory

Input: the derived `profile.yaml` (doc-to-profile.md) and the read-only
copies in `<staging>/live/` (ssh-discovery.md). Output: every artifact, the
self-check results, `CHECKLIST.md` and a diff against the live server. No
`hermes` command that writes runs in this phase, locally or remotely.

Staging directory: `./hermes-staging/<host alias>-<YYYY-MM-DD>/` in the
current working directory unless the owner named another place. A non-empty
directory is refused unless it is a previous staging output (it contains
`CHECKLIST.md`); never write outside it.

## 1. Validate the profile

Against hermes-chief-of-staff `references/templates/profile.yaml`. Every gap
in one list before generating; an owner-only gap goes into the one grouped
question (doc-to-profile.md), never a guessed value.

- YAML parses; `schema_version: 1`; no required field left as `<...>`; no secret-looking value (keys, tokens, passwords) anywhere - `.env` variable NAMES only.
- Names: profile names unique, lowercase, `[a-z0-9-]`; `agents.chief.sees: all`; every manager `entity`, every mailbox `entity` and `profile` resolves; a manager of a `private` entity never serves a `company` entity.
- Roots: every `entities[].workspace_root` is absolute and under `workspace.chief_root`; `scripts_root` and `scratch_root` are outside every root; `workspace.roots` equals the entity roots.
- Employees: `enabled: true` needs `model`; `max_spawn_depth: 1`; `max_concurrent_children` optional (unset = code default 10). `topology: profile_routes` needs the `advanced-delegation` plugin (checklist item, plugin name verified with `hermes plugins` on the server).
- Schedules: each is a 5-field cron expression or `every <N>h|m`; `timezone` is an IANA zone; `daily_reset.method` is `plugin` or `manual`.
- Channels: `owner_conversation` is an owner-only delivery target; `decisions_channel_audience: shared` → private items never go to the decisions channel. Slack channel-id target syntax is flagged UNVERIFIED until checked on the installed version (hermes-gateways).
- Mailboxes: one mailbox per profile per adapter (hermes-gateways); `send_allowed: true` is accepted only when `outbound.send_mechanism` names the existing send mechanism found by discovery (never `none`); a private mailbox is read by a private-entity profile only.
- Model ids and providers come from the live config or the owner: never invented, flagged "unverified, check with `hermes model`" until checked on the server.

## 2. Generate

Each artifact by its owning skill. Layout:

```
<staging>/
├── CHECKLIST.md
├── profile.yaml                                           derived, internal
├── live/<profile>/{config.yaml, SOUL.md, cron.txt, env.names}   read-only copies (Phase A)
├── company/                                               the tree of company-tree.md, 1:1
│   ├── README.md, deploy.sh, shared-skills/, <platform>/routes.yaml
│   └── profiles/<profile>/{distribution.yaml, SOUL.md, config.yaml (chief: config.snippet.yaml),
│                           MEMORY.seed.md, A-COMPLETER.md, skills/<name>-workflow/, cron/README.md}
├── workspaces/<entity-id>/.hermes.md                      one per entity root
├── workspaces/_chief_root/.hermes.md                      for workspace.chief_root
├── scripts/tts-healthcheck.sh                             only when voice.fallback_tts is set
└── diff/<profile>.config.diff, diff/<profile>.SOUL.diff   live vs proposed
```

Per profile: `distribution.yaml`, `MEMORY.seed.md` and `A-COMPLETER.md` from
`templates/` (this skill); `env_requires` lists the profile's `.env` NAMES.

- **`SOUL.md`** - chief: hermes-chief-of-staff `references/templates/soul-rules.md` (three paths, eight rules, Outbound block, Manner with per-contact overrides) + hermes-outbound (owner's voice); managers: the manager block of the same file. Values from the profile only. No unresolved `<...>`; avoid literal injection-like phrases (the scanner flags them, hermes-core).
- **`.hermes.md`** - per entity root: hermes-workspace `references/templates/hermes-md-filing.md` + hermes-core `references/templates/hermes-project.md`; the ritual procedures the cron prompts name ("Morning brief", "Evening review", ...) are written in the `.hermes.md` under `workspace.chief_root` (hermes-rhythm). `.hermes.md` is found from the working directory up to the git root: the checklist says where each file is placed and whether the root needs `git init` (discovery showed none) or a `/context` check.
- **`config.yaml`** (merge, never replace; no `_config_version`) - fragment from hermes-core `references/templates/config-core.yaml`; `approvals.*` + `approvals.deny` + `skills/memory.write_approval` + `delegation.subagent_auto_approve: false` from hermes-security `references/templates/security-config.yaml`; `delegation.*` per topology from hermes-delegation templates (default backend, or `profile_routes` listing the routed profiles on the chief); chief only: `gateway`, `platforms`, `slack`, `display`, `tts`, `stt` from hermes-gateways `references/templates/gateway-config.yaml` when channels/voice are declared. Emit only keys the profile calls for: no `mcp_servers`, `secrets`, `fallback_providers` or pinned cron model unless the profile supplies them. `terminal.cwd` = the entity root (managers) or `chief_root` (chief). `terminal.backend: local` unless the server already uses another one, with the checklist warning that profiles are not sandboxes. Then **merge** the fragment into the live copy: a YAML-aware deep merge (never text concatenation), fragment keys win, every other live key is kept; `company/profiles/<profile>/config.yaml` is the merged result (`install --force` writes it whole). The chief (default profile, not installable) gets only `config.snippet.yaml`, merged on the server by `deploy.sh`.
- **`env.names`** - one `.env` variable NAME per line with a comment, no values: provider key, `allowed_users_env`, Slack/Telegram/Discord tokens for each profile that has a platform or a delivery target, mailbox `credentials_env`. Names already present in `live/<profile>/env.names` are marked "exists".
- **Cron** - `company/profiles/<profile>/cron/README.md` with exact `hermes -p <profile> cron create ...` commands from hermes-rhythm `references/templates/cron-jobs.md`, hermes-workspace `references/templates/cleanup-job.md`, hermes-mail-triage and hermes-cron `references/cron-cli.md`: `--workdir` (an absolute path holding a `.hermes.md`), `--timezone`, `--deliver`, `--catch-up`, `--name`, and every job created `--paused --paused-reason "canary"`. Chief: morning brief, pilot check, evening review, weekly review, monthly dashboard, weekly cleanup per entity root. Mail profile: one triage job per mailbox, workdir = its entity root, private mailbox → `owner_conversation` only. A live job with the same purpose (from `live/<profile>/cron.txt`) is edited or replaced explicitly in the checklist, never duplicated. `daily_reset.method: manual` → the evening review prompt ends with the one-line `/new` reminder; `plugin` → checklist step to install `hermes-session-reset-policy` and the `session_reset` block.
- **Go gate** - nothing is generated or installed for sending. The checklist reports the existing send mechanism from discovery with the audit answers of hermes-security `locked-send-pattern.md` (sends only after an explicit go? from which account? credentials readable by the Hermes user? can the agent trigger it without the go?); every "no", "unclear" or missing mechanism is an owner decision. No send credential appears in any profile `.env`, `terminal.env_passthrough` or `config.yaml`.
- **Voice fallback** (`voice.fallback_tts` set; a pattern, not a Hermes feature) - `scripts/tts-healthcheck.sh` from hermes-gateways `references/templates/` with `PROFILE`, primary/secondary providers and the probe voice path filled from `voice.*`; a no-agent cron job `--script tts-healthcheck.sh` created under the `voice.incident_to` profile, delivering to the decisions channel; checklist step to copy the script into that profile's `scripts/` directory.
- **Workspace layout** - directory list in the checklist (hermes-workspace `references/layout.md`) under each entity root, plus `scripts_root` and `scratch_root`; directories that already exist on the server are marked "exists".

## 3. Self-checks (no live write)

Results pasted in the checklist:

- every generated `.yaml` parses;
- every dotted key of every `config.yaml` fragment is traced to a cited source in the skills (untraceable → removed, or marked "code-only/undocumented" with its source file);
- the merge kept every live key: `diff/<profile>.config.diff` shows no removed line except keys the fragment sets - any other removal = merge bug, stop and fix;
- no unresolved profile placeholder (a `<...>` standing for a profile value) and no secret in any generated file - runtime markers meant for the agent, such as `<id>` in a draft path or `<client>` in a folder pattern, stay;
- `bash -n` on every `.sh`;
- every `hermes cron create` flag exists in hermes-cron `references/cron-cli.md`;
- every cron `--workdir` has a `.hermes.md` in the staging layout;
- each SOUL.md carries the three paths and the eight rules.

## 4. CHECKLIST.md

Header (host alias, source document(s), date, installed/latest version,
doctor exit, skipped checks); decisions taken by the agent with their
provenance; owner answers; blocked items; key table (key → profile → source
URL → documented / code-only / undocumented / unverified); non-native
behaviours and how each is built (three paths, eight rules, go gate and send-mechanism audit, TTS
fallback, daily reset, partition); the diff summary per profile; exact
commands in apply order (apply-verify-rollback.md); the test day; rollback.

## 5. STOP

Show the owner, in plain words: what will change on the server (from the
diffs), what was decided for him, what stays pending (secret values, model
checks). Ask for ONE go. Nothing is applied before it.

## Sources

- hermes-chief-of-staff, hermes-core, hermes-security, hermes-delegation, hermes-gateways, hermes-cron, hermes-rhythm, hermes-workspace, hermes-mail-triage, hermes-outbound (each template's own Sources)
- https://hermes-agent.nousresearch.com/docs/user-guide/configuration
- https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files
