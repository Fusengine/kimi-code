# pgBackRest Command Sheet (2.60.0)

Stanza `main`, config `/etc/pgbackrest/pgbackrest.conf` ([pgbackrest.conf](pgbackrest.conf)). Run as the `postgres` OS user. `R` = read-only, `W` = writes (needs the go), `D` = destructive (ACTION/EFFECT/PROOF/WAIT-FOR-GO, see `../destructive-actions.md`).

## Inspect (R)

```bash
pgbackrest --stanza=main info                  # R  backups, sizes, WAL range per repository
pgbackrest --stanza=main info --output=json    # R  for scripts and alert checks
pgbackrest --stanza=main check                 # R  validates config and that archive_command reaches the repository
pgbackrest --stanza=main verify                # R  checks repository files against checksums (can be long)
pgbackrest version                             # R
```

## Set up (W, once per cluster)

```bash
# postgresql.conf: archive_mode = on (restart), archive_command = 'pgbackrest --stanza=main archive-push %p'
pgbackrest --stanza=main stanza-create         # W  creates the stanza in every repository
pgbackrest --stanza=main check                 # R  must pass before the first backup
```

After a PostgreSQL **major upgrade**: set `pg1-path` to the new data directory, then `pgbackrest --stanza=main stanza-upgrade` (W; `--no-online` if the database is offline) and take a new full backup.

## Back up (W, scheduled)

```bash
pgbackrest --stanza=main --type=full backup    # W  weekly
pgbackrest --stanza=main --type=diff backup    # W  daily  (changes since last full)
pgbackrest --stanza=main --type=incr backup    # W  hourly (changes since last backup); default type for 'backup' is incr
# `expire` runs automatically after a successful backup (see D below)
```

Alerts: non-zero exit; newest backup in `info` older than policy; `pg_stat_archiver.failed_count` rising; `check` failing.

## Restore (W/D, to a NEW or intended-to-be-replaced directory, PostgreSQL stopped)

```bash
# Latest state of the newest backup, into an empty directory (restore test or rebuild of a replica)
pgbackrest --stanza=main restore                                                          # W  target dir must be empty (or use --delta: D)
# Point in time; pause at the target so the result can be inspected before it is promoted
pgbackrest --stanza=main --type=time --target="2026-11-10 09:41:00+00" --target-action=pause --archive-mode=off restore   # W
# Named restore point created earlier with: SELECT pg_create_restore_point('before_migration');
pgbackrest --stanza=main --type=name --target=before_migration --target-action=pause --archive-mode=off restore           # W
# A specific backup set instead of the newest suitable one
pgbackrest --stanza=main --set=20261109-020001F --type=immediate --target-action=pause --archive-mode=off restore         # W
# Build a replica from the backups
pgbackrest --stanza=main --type=standby restore                                           # W
# In-place replacement of an existing directory: files not matching the backup are removed
pgbackrest --stanza=main --delta --type=time --target="..." --target-action=pause restore              # D
```

Then start PostgreSQL, wait for `pg_is_in_recovery()` pause at the target, check data read-only, and either `SELECT pg_promote();` (accept) or restore again with another target. Full procedure with proof capture: [restore-test-pitr-runbook.md](restore-test-pitr-runbook.md).

Notes: `--target-action` supports `pause` (default), `promote`, `shutdown`. Since 2.60.0 `restore` stops with an error if a restored file has an invalid page checksum (unless `--no-checksum-page-error`): re-run with another backup set rather than starting the cluster.

## Retention and deletion (D)

```bash
pgbackrest --stanza=main --repo=1 expire                  # D  applies retention now: deletes backups beyond policy and their WAL
pgbackrest --stanza=main --repo=1 --set=<backup-label> expire   # D  expires one set
pgbackrest --stanza=main stop                             # W  stops the stanza's operations (needed before stanza-delete)
pgbackrest --stanza=main stanza-delete                    # D  PERMANENTLY removes all backups and archives of the stanza;
                                                          #    cluster must be shut down or --force. Needs the go naming stanza + repo path
pgbackrest --stanza=main start                            # W  re-enables operations after a stop
```

## Cron / systemd timer example (W, installed once, reviewed)

```cron
# /etc/cron.d/pgbackrest  (user postgres)
30 02 * * 0   postgres  pgbackrest --stanza=main --type=full backup
30 02 * * 1-6 postgres  pgbackrest --stanza=main --type=diff backup
```
