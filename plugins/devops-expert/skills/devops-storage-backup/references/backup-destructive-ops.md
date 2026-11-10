---
name: backup-destructive-ops
description: Destructive backup commands (restic forget --prune, borg prune/compact/delete, velero backup delete, bucket deletion, wipefs) in ACTION / EFFECT / PROOF / WAIT-FOR-GO format
when-to-use: Before proposing or running any command that deletes backups, repositories, buckets or disk signatures
keywords: restic forget, prune, borg prune, borg compact, borg delete, velero backup delete, bucket delete, wipefs, retention
priority: critical
related: restic.md, borg-borgmatic.md, velero-kubernetes-backup.md, zfs-destructive-ops.md
---

# Backup Destructive Operations

**Load when:** a command removes backup data, a repository, a bucket or a disk signature. A deleted backup cannot be restored. Rule: **propose, then wait for the user's go naming the repository, snapshot ids or backup names.** Format: ACTION / EFFECT / PROOF / WAIT-FOR-GO.

## Preflight (read-only)

```bash
restic -r "$REPO" snapshots --group-by host,paths; restic -r "$REPO" check
borg list "$REPO"; borg info "$REPO"
velero backup get; velero backup-location get
```

State the newest verified restore test date ([restore-testing-dr.md](restore-testing-dr.md)). If no restore test exists, say so and ask first.

## 1. restic forget / prune

- **ACTION:** `restic -r REPO forget SNAPSHOT_ID...` or `forget --keep-daily N ... [--prune]`, `restic -r REPO prune`
- **EFFECT:** `forget` removes snapshots; `prune` permanently deletes data referenced only by them and rewrites packs. During prune the repository is locked, so backups cannot complete. A too-aggressive policy (or a policy matching the wrong host/path group) removes history that cannot be rebuilt. If all snapshots of a group would go because of a tag policy, restic refuses.
- **PROOF:** the same command with `--dry-run` (shows "keep" and "remove" lists per group); `restic check` before; run `restic check` again after.
- **WAIT-FOR-GO:** "Forget <N> snapshots: <ids/groups>, keep policy <flags>, repository <name>, last restore test <date>; then prune?"

## 2. borg prune / compact / delete

- **ACTION:** `borg prune ... REPO`, `borg compact REPO`, `borg delete REPO[::ARCHIVE]`
- **EFFECT:** `prune` removes archives by retention rules; `compact` is what actually frees space (segments rewritten; in append-only mode nothing is compacted); `borg delete` of a repository deletes all archives. Deleted archives are unrecoverable except via append-only transaction-log rollback if the repository was append-only.
- **PROOF:** `borg prune -v --list --dry-run <same flags>`; `borg check REPO`; confirm `--glob-archives` limits the scope to the intended host (`{hostname}-*`).
- **WAIT-FOR-GO:** "Prune with <flags> on <repo>, archives removed <list from dry-run>, then compact?"

## 3. velero backup delete

- **ACTION:** `velero backup delete NAME` (interactive confirmation)
- **EFFECT:** Deletes the backup's data from object storage and its volume snapshots; the request returns before everything is gone ("fully deleted after all associated data ... are removed"). TTL expiry does the same automatically in the GC loop, so a short `ttl` on a Backup or on a Schedule template means the backups it creates are deleted when they expire.
- **PROOF:** `velero backup describe NAME --details`; `velero backup get` for the newest *other* completed backup; BSL `accessMode` is ReadWrite (a ReadOnly BSL makes deletion fail with label `velero.io/gc-failure=BSLReadOnly`).
- **WAIT-FOR-GO:** "Delete backup <name> (created <date>, contains <namespaces>), a newer verified backup <name> exists?"

## 4. Bucket or repository deletion

- **ACTION:** `rclone purge`, `aws s3 rb --force`, `mc rb --force`, `rm -rf` of a repository directory, `restic`/`borg` repository path removal
- **EFFECT:** Removes every object, including all backup generations, and often object versions. No tool-level undo.
- **PROOF:** listing of the bucket (`rclone lsd`, object count and size), confirmation no other tool shares the prefix, replication/immutable copy exists and is listed.
- **WAIT-FOR-GO:** "Delete bucket/path <name> on <endpoint>, X GB, N objects, remaining copies <where>?"

## 5. wipefs and disk signatures

- **ACTION:** `wipefs -a DEV`, `sgdisk --zap-all DEV`, `mkfs.*` on a used device
- **EFFECT:** Erases file-system, RAID, LVM or ZFS signatures; data becomes unreachable.
- **PROOF:** `lsblk -f DEV`, `wipefs DEV` (without `-a`: lists only), serial and `/dev/disk/by-id` match the physical drive, `zpool import` shows no importable pool on it.
- **WAIT-FOR-GO:** "Wipe <by-id path>, serial <sn>, last role <role>, data copy verified <where>?"

## 6. Changing retention or immutability

Shortening retention, disabling append-only, removing object lock or lowering replication is a deletion in slow motion. Present the old and new values, the data that becomes eligible for deletion, and wait for the go.

## Sources

- https://restic.readthedocs.io/en/stable/060_forget.html (read 2026-11-10)
- https://borgbackup.readthedocs.io/en/stable/usage/prune.html , .../usage/compact.html , .../usage/notes.html (via Context7, 2026-11-10)
- https://github.com/velero-io/velero/blob/main/site/content/docs/v1.18/how-velero-works.md , .../contributions/oracle-config.md (delete wording) via Context7, 2026-11-10

## Not verified

- `rclone purge`, `aws s3 rb --force`, `mc rb --force`: named from knowledge of the tools, not read from their manuals today.
- `wipefs` and `sgdisk` option behaviour: not read today.
- `borg delete REPO::ARCHIVE` syntax differs in Borg 2; verify with `borg delete --help` on the installed version.
