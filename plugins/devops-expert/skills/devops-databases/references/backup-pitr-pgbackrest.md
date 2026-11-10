---
name: backup-pitr-pgbackrest
description: PostgreSQL continuous backup and point-in-time recovery with pgBackRest - stanza, WAL archiving, full/diff/incr backups, retention, verify, restore and PITR, and the restore test that proves it
when-to-use: Setting up or reviewing PostgreSQL backups, planning RPO/RTO, recovering to a point in time, or before any change that could lose data
keywords: pgbackrest, stanza, archive-push, archive_command, repo1-retention-full, restore --delta, --type=time, target-action, expire, stanza-delete, PITR, verify, check
priority: critical
related: backup-logical-physical.md, destructive-actions.md, major-upgrades.md, templates/pgbackrest.conf, templates/pgbackrest-commands.md, templates/restore-test-pitr-runbook.md
---

# Backup and PITR with pgBackRest

**Load when:** PostgreSQL data must survive a mistake, a disk loss or a site loss. Generic 3-2-1 strategy, repository storage and DR drills belong to `devops-storage-backup`; this file is the PostgreSQL-specific part. Version: pgBackRest **2.60.0** (2026-10-18).

## Model

A backup = a **base backup** (full, differential or incremental) + the **WAL archive** from the base backup's start onward. Base backups alone restore to the end of the backup; the WAL archive gives any point after it (PITR). A WAL archive without a base backup is useless; a base backup without a healthy WAL archive may not even be consistent. pgBackRest waits for the WAL needed by a backup to reach the repository before it finishes.

Features that matter to an operator: parallel processes (`process-max`), lz4/zstd compression, block-level incremental (`repo1-block`) and file bundling (`repo1-bundle`), multiple repositories (local fast restore + remote or object store long retention), backup from a standby (`backup-standby`), page checksum validation, optional repository encryption (`repo1-cipher-type`). Repository kinds include POSIX, S3, Azure and GCS.

## Setup sequence (each step is a change: show it, get the go)

1. Repository host or path with its own disk/bucket and credentials; on the database host `pgbackrest.conf` ([templates/pgbackrest.conf](templates/pgbackrest.conf)).
2. `postgresql.conf`: `archive_mode = on` (restart), `archive_command = 'pgbackrest --stanza=main archive-push %p'`, `wal_level = replica` or higher.
3. `pgbackrest --stanza=main stanza-create` (on the host that owns the repository config), then `pgbackrest --stanza=main check` - it validates configuration and `archive_command` end to end. Do not proceed if `check` fails.
4. First `backup --type=full`, then `info`.
5. Schedule: weekly full, daily differential or incremental, via cron or systemd timer (`devops-linux`); `archive-async=y` plus a `spool-path` on busy systems.
6. **Restore test on a schedule** ([templates/restore-test-pitr-runbook.md](templates/restore-test-pitr-runbook.md)) and alerts: `pg_stat_archiver.failed_count` rising, `last_archived_time` stale, `pgbackrest info` newest backup older than the policy.

Command sheet with read-only vs write markers: [templates/pgbackrest-commands.md](templates/pgbackrest-commands.md).

## Retention

`repo1-retention-full` (count, or time with `repo1-retention-full-type`) keeps that many full backups; differentials are count-based and expire with their full; incrementals expire with their full or differential. WAL is retained for backups that have not expired (per-repo `retention-archive*` can change this; not recommended). `expire` runs automatically after each successful backup and can be run by hand; the archive retention is re-checked every run. Since 2.60.0 `expire` refuses to run if the oldest retained backup would contain page checksum errors (`checksum-page-error`, default on for `expire` and `restore`, off for `backup`): a backup that finishes with checksum warnings is a corruption signal to investigate, not noise.

## Restore and PITR

```bash
# Read-only first: what exists and what WAL range is covered
pgbackrest --stanza=main info
# On the TARGET host, PostgreSQL stopped, target data directory empty or --delta (see destructive-actions.md):
pgbackrest --stanza=main --type=time --target="2026-11-10 09:41:00+00" \
           --target-action=pause --delta restore
# Start PostgreSQL; it replays WAL and PAUSES at the target. Inspect read-only, then decide:
#   psql -Atc "select pg_is_in_recovery(), now()"
#   psql -Atc "select pg_promote()"            -- accept this point: becomes a primary on a new timeline
#   or restore again with another --target       -- wrong point
```

- Recovery targets for `restore --type`: `time`, `lsn`, `xid`, `name` (a marker made by `SELECT pg_create_restore_point('before_migration');`), `immediate` (end of the backup), `standby` (add recovery config for a replica), `default`, `preserve`, `none`.
- `--target-action` supports `pause` (default), `promote`, `shutdown`. Use `pause` for incident PITR so the result can be checked before it becomes a primary; use `promote` in automated restore tests.
- `--delta` restores in place by reusing files that already match and deleting the rest. It is destructive for the existing data directory: only on a directory you intend to replace and only after the proof listed in [destructive-actions.md](destructive-actions.md). Never on a live instance.
- Restore to a **different host or path** first whenever the goal is to recover a few rows or inspect: then copy the data out with `pg_dump`/`COPY`. Overwriting production is the last resort.
- A restore with an invalid page checksum now stops with an error and leaves the cluster unstartable; re-run the restore (a different backup set with `--set`) rather than starting it. `--no-checksum-page-error` downgrades to a warning only with an explicit decision.
- After promotion take a new full backup at once; recovery created a new timeline.

## Dangerous commands

`expire` (deletes backups and WAL), `stanza-delete` (permanently removes all backups and archives of a stanza; needs the cluster shut down or `--force`) and `restore --delta` over a live path are in [destructive-actions.md](destructive-actions.md). Do not delete files from the repository by hand.

## Barman

Barman is the other widely used PostgreSQL backup manager (backup server model, `barman-cloud-*` tools; CloudNativePG uses the Barman Cloud plugin). Its version and current CLI were not verified today: read https://docs.pgbarman.org before use. Choose one tool per cluster; do not run two archivers on the same `archive_command`.

## Sources

- https://pgbackrest.org/ (2.60.0 current stable, features), https://pgbackrest.org/release.html (2.60.0 notes of 2026-10-18), https://pgbackrest.org/command.html (`expire`, `stanza-delete`, `check`, `--target-action`), https://pgbackrest.org/configuration.html , https://pgbackrest.org/user-guide.html (all read 2026-11-10)
- Context7 `/pgbackrest/pgbackrest`: `archive_command`/`archive_mode` snippet, `restore --type=time` example, `restore --type` values, config option table
- https://www.postgresql.org/docs/18/functions-admin.html (`pg_promote`, `pg_wal_replay_resume`, `pg_create_restore_point`), https://www.postgresql.org/docs/18/runtime-config-wal.html (`recovery_target_action` default `pause`)

## Not verified

- `process-max` sizing, `repo1-bundle`/`repo1-block` behaviour on your storage, and S3/Azure/GCS option names beyond the configuration page were not tested.
- Barman's current version, CLI and support status.
- The remediation steps of the 2.59.3 "weak encryption subkeys and salts" notice (2026-10-04) were read only up to its impact paragraph: encrypted repositories created before 2.59.3 may hold weak subkeys in `archive.info`/`backup.info` that an upgrade does not replace (unencrypted repositories are not affected); read the full notice at https://pgbackrest.org/news.html#weak-encryption before trusting an old encrypted stanza.
