---
name: restic
description: restic usage - repositories, environment and password handling, backup, retention with forget/prune, check, restore, copy, append-only
when-to-use: Backing up a host or directory with restic to local, SFTP, REST or S3 storage, or maintaining a restic repository
keywords: restic, init, backup, snapshots, forget, prune, check, read-data-subset, restore, copy, rest-server, append-only, RESTIC_PASSWORD_FILE
priority: high
related: backup-strategy.md, backup-destructive-ops.md, restore-testing-dr.md, templates/restic-backup.sh
---

# restic (0.19.1)

**Load when:** configuring or operating restic. Current release 0.19.1 (2026-07-05). Templates: [restic-backup.sh](templates/restic-backup.sh), [restic-backup.service](templates/restic-backup.service), [restic-backup.timer](templates/restic-backup.timer), [restic-maintenance.sh](templates/restic-maintenance.sh).

## Configuration without leaking secrets

| Variable | Use |
|----------|-----|
| `RESTIC_REPOSITORY` | Repository location (overridden by `-r`) |
| `RESTIC_PASSWORD_FILE` | Password file; whole file read, surrounding whitespace trimmed; takes precedence over `RESTIC_PASSWORD` |
| `RESTIC_PASSWORD_COMMAND` | Command that prints the password (secret manager) |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | S3 credentials |
| `RESTIC_CACHE_DIR`, `RESTIC_COMPRESSION` | Cache location; compression (repository format v2) |

Keep these in a root-owned `0600` env file loaded by systemd (`EnvironmentFile=`), never on a command line. The repository password cannot be recovered: store it in the secret store (`devops-secrets`) and in the DR runbook's sealed section.

## Everyday commands

```bash
restic -r "$REPO" init                                   # once; prints a repository id
restic -r "$REPO" backup --one-file-system --exclude-file /etc/backup/excludes.txt --tag host-daily /etc /srv /home
restic -r "$REPO" snapshots --group-by host
restic -r "$REPO" ls --long latest
restic -r "$REPO" restore SNAPSHOT_ID --target /tmp/restore-test
restic -r "$REPO" check                                  # structure; add --read-data-subset=... to read some packs
restic -r "$REPO" copy --from-repo "$OTHER" --verbose    # replicate snapshots to a second repository
```

`--one-file-system` stops at file-system boundaries (skips `/proc`, `/sys`, other mounts; unsupported on Windows). `snapshots`'s size column exists for snapshots from 0.17.0 on. Exit codes of `check`: 0 ok, 1 error, 10 repository missing, 11 locked, 12 wrong password; use them in scripts.

## Retention: forget and prune

`forget` removes snapshots; `prune` removes the data only they referenced. `forget --prune` does both when something was removed. During prune the repository is locked and backups cannot complete; run `restic check` after. Policy flags: `--keep-last/hourly/daily/weekly/monthly/yearly N`, `--keep-within DURATION`, `--keep-tag`. **Always preview:** `restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --dry-run`. If every snapshot of a group would be removed by a tag policy, `forget` errors. Destructive format: [backup-destructive-ops.md](backup-destructive-ops.md).

## Locks

Locks are files in `locks/`; a lock older than 30 minutes is stale, and on the same machine restic also tests whether the owning process is alive. Use `--retry-lock DURATION` in timers instead of deleting locks by hand.

## Append-only and ransomware

A compromised client can delete its own backups. Serve the repository append-only: restic's `rest-server` has an append-only mode, and `rclone serve restic` can front other backends. With append-only, policy-based forgetting must run elsewhere with different credentials (the docs warn about security considerations of policy removal in append-only repos). Pair with an S3 object-lock bucket where supported ([object-storage-s3.md](object-storage-s3.md)).

## Restore testing

Restore to an empty directory, compare checksums of a sample against the source, and measure time: [restore-testing-dr.md](restore-testing-dr.md). `restic check` proves structure, a restore proves usability.

## Sources

- https://github.com/restic/restic/releases/tag/v0.19.1 (read 2026-11-10)
- https://restic.readthedocs.io/en/stable/060_forget.html , .../045_working_with_repos.html (read 2026-11-10)
- Context7 `/restic/restic` (2026-11-10): 040_backup.rst (`--one-file-system`), cmd_check.go (exit codes), 075_scripting.rst (environment variables), design.rst (locks), global.go (`--password-file`)

## Not verified

- `--read-data-subset` argument forms and `restic unlock` semantics: flag existence seen in source, forms not read.
- `--exclude-file`, `--tag` on `backup`: standard options, not re-read on the 0.19.1 reference today.
- `rest-server` configuration (htpasswd, `--append-only`) was not read.
- The `s3:` repository URL scheme: see [object-storage-s3.md](object-storage-s3.md).
- Default compression mode and new 0.19 features: release notes read only up to the 0.19.1 fix list.
