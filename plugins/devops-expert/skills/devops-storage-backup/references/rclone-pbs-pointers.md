---
name: rclone-pbs-pointers
description: rclone as a transport for backups (never as the backup tool) and the pointer to Proxmox Backup Server
when-to-use: Copying backup repositories off-site, fronting storage for restic, or deciding how Proxmox guests are backed up
keywords: rclone, sync, copy, serve restic, proxmox backup server, pbs, vzdump, datastore, verify job
priority: medium
related: restic.md, object-storage-s3.md, backup-strategy.md
---

# rclone and Proxmox Backup Server

**Load when:** a repository must be copied to remote storage, or Proxmox guests need backup. Current rclone: 1.76.0.

## rclone: transport, not backup

rclone moves files between local storage and many remote types. Rules:

| Rule | Why |
|------|-----|
| `rclone copy` adds, `rclone sync` makes the destination match the source and **deletes extra destination files** | A wrong source or an emptied source then empties the destination |
| Always preview with `--dry-run` | Shows what would be transferred or deleted without doing it |
| Copy **repositories** (restic/Borg directories) only when no backup is running, or prefer the tool's own replication (`restic copy`) | A half-written repository copy is not restorable |
| `rclone serve restic` can front a backend with append-only behaviour for restic clients | Ransomware protection with backends that lack it ([restic.md](restic.md)) |
| Credentials in `rclone.conf` mode 0600, config encryption when stored on shared hosts | Remote keys are as sensitive as the data |

A synced copy is a mirror: corruption and deletion propagate. Keep versioning or immutability on the remote ([object-storage-s3.md](object-storage-s3.md)).

## Proxmox Backup Server (PBS) - pointer

PBS 4.2 (2026-04-29, per the research notes in `docs/research-devops-plugin.md`) is the native backup target for Proxmox VE guests: deduplicated, incremental, client-side encryption, datastores with namespaces, verify jobs and garbage collection, S3-compatible datastore support, push/pull sync to a second PBS for the off-site copy. Datastore design, jobs, retention, encryption keys and restore of guests are covered in `devops-proxmox`; do not duplicate them here. What this skill adds: apply [backup-strategy.md](backup-strategy.md) (a second PBS or S3 copy off-site, an immutable leg) and [restore-testing-dr.md](restore-testing-dr.md) (restore a guest to a scratch VMID on a schedule).

Destructive PBS actions (datastore removal, group or namespace deletion, prune and GC) follow the same ACTION / EFFECT / PROOF / WAIT-FOR-GO format as [backup-destructive-ops.md](backup-destructive-ops.md).

## Sources

- https://github.com/rclone/rclone/releases/tag/v1.76.0 (release page title read 2026-11-10)
- https://pbs.proxmox.com/docs/introduction.html (read 2026-11-10; table of contents only)
- https://restic.readthedocs.io/en/stable/060_forget.html (rclone as append-only complement, read 2026-11-10)
- `docs/research-devops-plugin.md` (PBS 4.2 row, from https://pbs.proxmox.com/wiki/Roadmap)

## Not verified

- rclone `sync`/`copy` semantics and `--dry-run`: well-known behaviour, not re-read from rclone.org today (the release page rendered navigation only).
- PBS feature list above comes from the research file, not re-read today; the PBS documentation pages were fetched only as a table of contents.
- rclone remote types and `serve restic` flags: not read.
