---
name: zfs-snapshots-replication
description: ZFS snapshots, holds, send/receive replication (full, incremental, raw, resumable) and scrub scheduling
when-to-use: Setting up snapshot policy, replicating a dataset to another pool or host, or scheduling and reading scrubs
keywords: zfs snapshot, zfs hold, zfs send, zfs receive, incremental, raw send, resume token, scrub, zpool status
priority: high
related: zfs-pools-datasets.md, zfs-destructive-ops.md, restore-testing-dr.md, templates/zfs-snapshot-replicate.sh
---

# ZFS Snapshots, Replication and Scrub

**Load when:** a dataset needs point-in-time copies, an off-host replica or a health scan.

## Snapshots

```bash
zfs snapshot -r tank/data@auto-2026-11-10T0200       # -r: same name on all descendants
zfs list -t snapshot -o name,used,refer -s creation tank/data
zfs hold keep tank/data@auto-2026-11-10T0200         # blocks destroy (EBUSY) until released
zfs holds tank/data@auto-2026-11-10T0200
zfs release keep tank/data@auto-2026-11-10T0200
```

A snapshot is instant and consumes space only as the live data diverges. It lives in the same pool: **it is not a backup**. Name snapshots by policy and time (`auto-`, `manual-`) so cleanup scripts never touch hand-made ones.

## Replication

| Need | Command shape |
|------|--------------|
| First full copy | `zfs send tank/data@s1 \| ssh BACKUP zfs receive -u backup/data` |
| Incremental | `zfs send -I @s1 tank/data@s2 \| ssh BACKUP zfs receive -u backup/data` (send `-i` for one step, `-I` for all intermediate snapshots) |
| Encrypted without keys on target | `zfs send -w tank/secret@s \| ssh BACKUP zfs receive -u backup/secret` |
| Dry run of the receive | add `-n -v` to `zfs receive` |
| Resumable | `zfs receive -s`; after a break read `receive_resume_token` and send with `zfs send -t TOKEN` |
| Abandon a partial receive | `zfs receive -A backup/data` |

Key facts from `zfs-receive(8)`:

- An incremental stream needs the destination's **most recent snapshot to equal the stream's source**; otherwise the receive fails. Do not take or keep stray snapshots on the destination.
- `-F` rolls the destination back to its latest snapshot and, for a replication stream, destroys snapshots and datasets missing on the sender. Treat `-F` as destructive ([zfs-destructive-ops.md](zfs-destructive-ops.md)).
- `-u` leaves the received file system unmounted; use it on backup targets so a replica never mounts over live paths.
- A replication package (`zfs send -R`) deletes, on receive, snapshots that no longer exist on the sender.
- Raw streams (`-w`) can only be received as is; do not mix raw and non-raw receives on one encrypted dataset (an `IV set guid mismatch` error follows).
- `zfs receive -c` can repair corruption using a healthy stream, only for data blocks, followed by a scrub.

The target pool should be on separate hardware, ideally another site; give the replication user only the delegated permissions it needs (`zfs allow`).

## Scrub

```bash
zpool scrub tank           # verifies every block checksum; repairs from redundancy
zpool status -v tank       # progress, errors, affected files
zpool scrub -p tank        # pause; `zpool scrub tank` resumes; -s stops
zpool scrub -w tank        # wait for completion (scripts)
```

Scrub examines all data; resilver only data known to be out of date; only one of the two runs at a time. A scrub never fixes a pool without redundancy: it reports. Schedule a monthly scrub per pool (staggered, never `-a` on many pools at once: load and memory pressure), and alert on any non-zero READ/WRITE/CKSUM error counter.

## Policy

See [templates/zfs-snapshot-policy.md](templates/zfs-snapshot-policy.md) for a frequency/retention table and [templates/zfs-snapshot-replicate.sh](templates/zfs-snapshot-replicate.sh) for a script with a dry-run default. Third-party tools (for example sanoid/syncoid) automate this; they were not evaluated here.

## Sources

- https://openzfs.github.io/openzfs-docs/man/master/8/zfs-receive.8.html , .../zpool-scrub.8.html , .../zfs-destroy.8.html (read 2026-11-10)
- https://openzfs.github.io/openzfs-docs/Basic%20Concepts/Datasets/Snapshots%20and%20Clones.html (holds) and .../Data%20Storage/Encryption.html (raw sends) via Context7, 2026-11-10

## Not verified

- `zfs send -i/-I`, `-t TOKEN` and `zfs allow` details were not read from `zfs-send(8)` / `zfs-allow(8)` today (only referenced from the receive page).
- Scrub frequency (monthly) is a practice choice, not an OpenZFS requirement.
- sanoid/syncoid not evaluated.
