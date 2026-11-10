# ZFS Snapshot and Replication Policy (template)

Copy per pool. Values are examples; take RPO/RTO from [backup-policy-table.md](backup-policy-table.md).

## Dataset classes

| Class | Examples | Snapshot frequency | Keep on source | Replicated to | Replica keep | Notes |
|-------|----------|--------------------|----------------|---------------|--------------|-------|
| critical | databases, VM disks | every 15 min | 48 x 15 min, 24 hourly, 14 daily | off-host pool every 15 min, off-site daily | 30 daily, 12 monthly | App-consistent (quiesce or flush) before snapshot |
| standard | file shares, homes | hourly | 24 hourly, 14 daily, 8 weekly | off-host nightly | 8 weekly, 12 monthly | |
| bulk | media, archives | daily | 7 daily, 4 weekly | off-site weekly | 12 monthly | `compression` already applied |
| scratch | caches, build dirs | none | none | none | none | Excluded on purpose, documented |

## Naming

`auto-YYYYMMDDTHHMMSSZ` for scheduled snapshots, `manual-<ticket>-<note>` for hand-made ones, `pre-<change>` before risky work. Cleanup jobs touch only the `auto-` prefix. Use `zfs hold` on snapshots needed for audits or as incremental bases.

## Rules

1. Replication target is on separate hardware; a snapshot on the source pool is not a backup.
2. Targets receive with `-u` (unmounted) and `-s` (resumable); no hand-made snapshots on targets.
3. Raw sends (`zfs send -w`) for encrypted datasets going to untrusted targets; do not mix raw and non-raw on one dataset.
4. Scrub every pool monthly, staggered; alert on any non-zero error counter.
5. Snapshot removal beyond the table is a destructive change: `zfs destroy -nv` preview and a go ([zfs-destructive-ops.md](../zfs-destructive-ops.md)).
6. Restore test (receive into a scratch dataset, compare data) at least quarterly per class `critical`.

## Not verified

- `zfs list -d 1` (depth) in [zfs-snapshot-replicate.sh](zfs-snapshot-replicate.sh) was not read from `zfs-list(8)` today.
- Frequencies and retention numbers are examples, not recommendations from OpenZFS.
