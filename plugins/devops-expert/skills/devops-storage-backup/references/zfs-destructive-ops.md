---
name: zfs-destructive-ops
description: Destructive ZFS commands (zpool destroy, zfs destroy, rollback, receive -F, vdev changes) in ACTION / EFFECT / PROOF / WAIT-FOR-GO format
when-to-use: Before proposing or running any ZFS command that deletes data, discards changes or changes pool redundancy
keywords: zpool destroy, zfs destroy, zfs rollback, receive -F, zpool add -f, zpool detach, zpool remove, labelclear, wipefs
priority: critical
related: zfs-pools-datasets.md, zfs-snapshots-replication.md, backup-destructive-ops.md
---

# ZFS Destructive Operations

**Load when:** a ZFS command removes data, rolls state back or changes redundancy. Rule: **propose, then wait for the user's explicit go naming the object (pool, dataset, snapshot).** One go covers one listed command.

Every item below is shown as:

- **ACTION** - the exact command
- **EFFECT** - what it changes and what cannot be recovered
- **PROOF** - the read-only or dry-run check run first, and what the output must show
- **WAIT-FOR-GO** - what the user must confirm

## Common preflight (read-only)

```bash
zpool status -v; zpool list; zfs list -t all -r POOL
zfs get -r -o name,value mounted,mountpoint,used POOL
zpool history POOL | tail -20            # what was done lately
```

Confirm a verified backup of the object exists on separate hardware ([restore-testing-dr.md](restore-testing-dr.md)); a snapshot on the same pool does not count.

## 1. Destroy a snapshot or dataset

- **ACTION:** `zfs destroy POOL/ds@snap` / `zfs destroy POOL/ds` (with `-r` children, `-R` also clones, `-f` force unmount)
- **EFFECT:** Data held only by the destroyed snapshot or dataset is gone. `-r` and `-R` "can destroy large portions of a pool and cause unexpected behavior for mounted file systems in use". A dataset with children or clones is refused unless `-r`/`-R`. A snapshot with clones or a hold fails, unless `-d` marks it for deferred destruction. Unrecoverable once the txg commits (no undo; a pool checkpoint taken before is the only rewind).
- **PROOF:** `zfs destroy -nv POOL/ds@snap` (add `-r`/`-R` as planned): output lists exactly what would go; no data is deleted with `-n`. Compare the list to the user's request.
- **WAIT-FOR-GO:** "Destroy <names listed by -nv>, N snapshots, X GB reclaimed, backup verified on <target>?"

## 2. Rollback

- **ACTION:** `zfs rollback POOL/ds@snap` (`-r` destroys more recent snapshots and bookmarks, `-R` also their clones, `-f` with `-R` forces unmount)
- **EFFECT:** All changes since the snapshot are discarded. Without `-r` ZFS refuses to go past the newest snapshot; with `-r` every intermediate snapshot is destroyed. `-r`/`-R` do not recursively destroy child snapshots of a recursive snapshot; each child must be rolled back on its own.
- **PROOF:** `zfs list -t snapshot -o name,creation POOL/ds` shows which snapshots `-r` would destroy; `zfs diff POOL/ds@snap POOL/ds` shows files that will be lost. Take a fresh snapshot of the current state first (`zfs snapshot POOL/ds@pre-rollback`; it survives only without `-r`, so use `zfs send` to another pool if `-r` is required).
- **WAIT-FOR-GO:** "Roll back <ds> to <snap>, losing changes since <time> and snapshots <list>?"

## 3. Receive with force

- **ACTION:** `zfs receive -F TARGET`
- **EFFECT:** Rolls the destination back to its most recent snapshot first; for a replication stream destroys snapshots and file systems that do not exist on the sender. A reversed `send | receive` direction or wrong target name overwrites the real data.
- **PROOF:** Run the same pipeline with `zfs receive -n -v -F TARGET` and read the names; `zfs list -t all -r TARGET` before and after.
- **WAIT-FOR-GO:** "Receive -F into <TARGET>; local snapshots <list> will be destroyed; source host <A> to target <B> confirmed?"

## 4. Destroy a pool

- **ACTION:** `zpool destroy [-f] POOL`
- **EFFECT:** Destroys the pool and every dataset in it, frees the devices; `-f` force-unmounts active datasets. Recovery is only possible by `zpool import -D` before the disks are reused, and not guaranteed; plan as unrecoverable.
- **PROOF:** `zpool status POOL`, `zfs list -r POOL`, `zpool history POOL`; list the consumers (mounts, VMs, exports, Kubernetes PVs, Proxmox storages) of every dataset; verified backup of each.
- **WAIT-FOR-GO:** "Destroy pool <name> on <host>, datasets <list>, total X TB, backups verified <where>?"

## 5. Change pool redundancy

| Command | EFFECT |
|---------|--------|
| `zpool add [-f] POOL VDEV` | Adds a top-level vdev permanently; `-f` overrides conflicting replication level or ashift. A raidz/draid pool can never remove it; a mismatched ashift blocks future removal |
| `zpool detach POOL DISK` | Drops a mirror member; the mirror loses redundancy |
| `zpool remove POOL VDEV` | Evacuates a top-level vdev in the background and shrinks the pool; refused on pools with raidz/draid vdevs; an I/O error cancels it; the relocation mapping table uses RAM for the life of the pool |
| `zpool offline` / replace of the only good copy | Pool runs degraded or loses the last redundant copy |

- **PROOF:** `zpool add -n POOL VDEV` previews the layout; `zpool remove -n -p POOL VDEV` prints the mapping-table memory; `zpool status POOL` must be ONLINE with no resilver running. Take `zpool checkpoint POOL` before risky layout work (it blocks remove/attach/detach until discarded with `zpool checkpoint -d`).
- **WAIT-FOR-GO:** "Add/remove <vdev>, resulting layout <paste preview>, redundancy before/after <x>?"

## 6. Wipe disks

- **ACTION:** `zpool labelclear -f DEV`, `wipefs -a DEV`, `sgdisk --zap-all DEV`
- **EFFECT:** Removes ZFS labels or all signatures and partition tables; the data on that device is unrecoverable by normal means.
- **PROOF:** `lsblk -f DEV`, `wipefs DEV` (no `-a`: lists signatures only), `zpool import` (lists importable pools using it), serial number matched to the physical bay.
- **WAIT-FOR-GO:** "Wipe /dev/disk/by-id/<id>, serial <sn>, currently <role>?"

## Sources

- https://openzfs.github.io/openzfs-docs/man/master/8/zfs-destroy.8.html , .../zfs-rollback.8.html , .../zfs-receive.8.html , .../zpool-destroy.8.html (read 2026-11-10)
- https://openzfs.github.io/openzfs-docs/man/v2.4/8/zpool-add.8.html , .../zpool-remove.8.html and the "Changing Pool Layout" page (via Context7, 2026-11-10)

## Not verified

- `zpool import -D` recoverability after destroy: widely documented but not read today.
- `zpool labelclear`, `wipefs`, `sgdisk` option behaviour: not read from manuals today; `wipefs` without `-a` listing signatures only is from the util-linux manual and not re-checked.
- `zpool detach` and `zpool offline` pages: man page names confirmed in the index only; behaviour above comes from the remove page and zpoolconcepts.
- No command here was run against a real pool.
