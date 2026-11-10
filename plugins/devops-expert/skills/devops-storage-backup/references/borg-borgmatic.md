---
name: borg-borgmatic
description: BorgBackup and borgmatic - repositories, prune/compact semantics, append-only servers, check, borgmatic configuration and scheduling
when-to-use: Backing up hosts with Borg, writing a borgmatic config, or maintaining a Borg repository
keywords: borg, borgmatic, prune, compact, append-only, borg serve, authorized_keys, check, keep_daily, encryption_passphrase, borg 2
priority: high
related: backup-strategy.md, backup-destructive-ops.md, restic.md, templates/borgmatic-config.yaml
---

# BorgBackup and borgmatic

**Load when:** Borg is the chosen tool. Stable release 1.4.5; Borg 2 is documented as beta, so use 1.x for production unless the owner decides otherwise. borgmatic 2.2.0 is the configuration-driven wrapper. Template: [borgmatic-config.yaml](templates/borgmatic-config.yaml).

## Core semantics (Borg 1.x docs)

| Command | Effect |
|---------|--------|
| `borg create` | Writes a new archive (deduplicated, compressed, authenticated encryption) |
| `borg prune` | Deletes archives according to `--keep-*` rules. Always run `-v --list --dry-run` first |
| `borg compact` | Actually frees repository space; prune alone does not. `--threshold` default 10 percent |
| `borg delete` | Deletes archives or the repository |
| `borg check` | Verifies repository consistency |

```bash
borg prune -v --list --dry-run --keep-daily=7 --keep-weekly=4 --keep-monthly=-1 "$REPO"
borg prune -v --list --keep-daily=7 --keep-weekly=4 --keep-monthly=-1 "$REPO"     # after the go
borg compact "$REPO"                                                               # frees space
```

`--keep-monthly=-1` keeps one archive for every month. `borg compact` needs no key, so it can run on the server side. Prune/compact/delete are destructive: [backup-destructive-ops.md](backup-destructive-ops.md).

## Append-only

`borg config /path/to/repo append_only 1` (or `borg init --append-only`) makes the repository never overwrite or delete committed data; `borg compact` then silently compacts nothing, but `borg delete` and `borg prune` are still accepted at the command level and only their effect on segments is blocked. A server can be forced with `command="borg serve --append-only ..."` in `authorized_keys`: clients use a restricted key, administration uses a second key with plain `borg serve`. `borg init` through an append-only `borg serve` does not create an append-only repository. A transaction log in `transactions` allows rolling the repository back to an earlier state after an attack. Switching modes is reversible with `borg config`.

## borgmatic

One YAML file describes sources, repositories, retention and checks; `borgmatic` runs create, prune, compact and check as configured.

- `source_directories`, `repositories` (each with `path` and `label`), `keep_daily/weekly/monthly`, `checks` (with `frequency`), `encryption_passphrase`.
- Secrets: `encryption_passphrase: "{credential systemd borgmatic.pw}"` reads a systemd service credential, so the passphrase never sits in the config.
- Scheduling: sample `borgmatic.service` and `borgmatic.timer` ship with the project; move them to `/etc/systemd/system/`, `systemctl enable --now borgmatic.timer`. If `ProtectSystem=strict` is on and the repository is local, add its path to `ReadWritePaths`.
- Database dumps: borgmatic has database hooks (for example `postgresql_databases`), but dump correctness and PITR belong to `devops-databases`.
- 2.2.0 notes: a `tarballs` hook, and a fix restoring Borg cache hits for the ZFS/LVM/Btrfs snapshot hooks.

## Key and passphrase

Losing the key or passphrase loses the data. Export the key material for the repository mode in use and store it apart from the repository (`devops-secrets`, DR runbook sealed section).

## Sources

- https://borgbackup.readthedocs.io/en/stable/usage/prune.html , .../usage/compact.html , .../usage/notes.html , .../faq.html (via Context7 `/websites/borgbackup_readthedocs_io_en_stable`, 2026-11-10)
- https://github.com/borgbackup/borg/releases/tag/1.4.5 (read 2026-11-10); Context7 `/borgbackup/borg` description: Borg 2 in beta
- https://github.com/borgmatic-collective/borgmatic/releases/tag/2.2.0 ; borgmatic docs via Context7 `/borgmatic-collective/borgmatic` (README, how-to/set-up-backups.md, reference/configuration/credentials) (2026-11-10)

## Not verified

- `borg check --verify-data`, `borg key export` and `borg create` flag details: not read from the 1.4.5 pages today.
- Borg 1.4.5 changelog content: the release page rendered only navigation text.
- borgmatic option names beyond those shown in its README and credentials page (for example `checks` item keys across 2.x versions).
- Borg 2 migration path: not evaluated.
