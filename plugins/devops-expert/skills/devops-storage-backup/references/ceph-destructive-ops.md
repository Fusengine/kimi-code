---
name: ceph-destructive-ops
description: Destructive Ceph commands (osd purge/destroy/rm, pool delete, host removal, ratio overrides) in ACTION / EFFECT / PROOF / WAIT-FOR-GO format
when-to-use: Before proposing or running any Ceph command that removes an OSD, pool, host or file system, or overrides safety limits
keywords: ceph osd purge, osd destroy, orch osd rm, zap, pool delete, mon_allow_pool_delete, host rm, set-full-ratio, force
priority: critical
related: ceph-operations-health.md, ceph-architecture-deploy.md, backup-destructive-ops.md
---

# Ceph Destructive Operations

**Load when:** a Ceph command deletes data or weakens redundancy. Rule: **propose, then wait for the user's go naming the OSD id, pool or host.** Format: ACTION / EFFECT / PROOF / WAIT-FOR-GO.

## Preflight (read-only)

```bash
ceph -s; ceph health detail; ceph osd tree; ceph df; ceph osd pool ls detail
```

Stop and report if PGs are not `active+clean` (unless the task is exactly that), if fewer OSDs than the pool `size` would remain in the failure domain, or if a backup of the affected pool's data is unverified.

## 1. Remove an OSD (cephadm)

- **ACTION:** `ceph orch osd rm ID [--replace] [--force] [--zap]`
- **EFFECT:** Schedules the OSD for removal: data is drained to other OSDs, then the daemon is removed. `--zap` wipes the device; `--force` skips safeguards (use only on a dead OSD, with a reason). If the cluster lacks capacity or redundancy while draining, a second failure can lose data.
- **PROOF:** `ceph osd safe-to-destroy ID` returns success; `ceph osd ok-to-stop ID`; `ceph osd df` shows the remaining OSDs stay under nearfull after the data moves; `ceph orch osd rm status` afterwards.
- **WAIT-FOR-GO:** "Remove osd.<ID> on <host>, device <by-id>, zap yes/no, remaining capacity <x percent>?"

## 2. Purge or destroy an OSD (low level)

- **ACTION:** `ceph osd purge ID --yes-i-really-mean-it` (= `osd destroy` + `osd rm` + `osd crush remove`)
- **EFFECT:** Removes the OSD from the CRUSH map, auth and OSD map. Any data only on that OSD is lost. Rook's guide runs it only after `ceph osd out`, backfill complete and PGs `active+clean`.
- **PROOF:** `ceph osd safe-to-destroy ID`; `ceph -s` shows `active+clean`; `ceph osd tree` shows the OSD `out` (and down if the disk is dead).
- **WAIT-FOR-GO:** "Purge osd.<ID>, safe-to-destroy output pasted, PGs clean?"

## 3. Delete a pool

- **ACTION:** `ceph osd pool delete POOL POOL --yes-i-really-really-mean-it`
- **EFFECT:** Deletes the pool and all its data (RBD images, CephFS data, RGW buckets): unrecoverable. The monitors refuse unless `mon_allow_pool_delete` is true; enabling it is itself a temporary safety override that must be reverted.
- **PROOF:** `ceph osd pool ls detail`; `rbd ls -p POOL`, `ceph fs ls`, RGW bucket list; list clients (Kubernetes PVs, OpenStack Cinder/Glance, Proxmox storages) that reference it; restore test of the data elsewhere.
- **WAIT-FOR-GO:** "Delete pool <name> (X TB, N images/files), consumers <list>, backup verified at <where>, enable then disable mon_allow_pool_delete?"

## 4. Remove a host or CephFS

- **ACTION:** `ceph orch host drain HOST`, then `ceph orch host rm HOST`; CephFS: `ceph fs volume rm` (not read today; see Not verified)
- **EFFECT:** Drain schedules every OSD on the host for removal; `host rm` removes it from the orchestrator after all daemons are gone. Losing two failure domains at once can take pools below `min_size` (I/O stops) or lose data.
- **PROOF:** `ceph orch ps HOST` is empty, `ceph orch osd rm status` empty, `ceph -s` clean, capacity check as in item 1.
- **WAIT-FOR-GO:** "Drain and remove <host> holding osd.<ids>, remaining failure domains <n>, size/min_size <3/2>?"

## 5. Weaken a safety limit

| Command | EFFECT |
|---------|--------|
| `ceph osd set-full-ratio R` / `set-backfillfull-ratio` / `set-nearfull-ratio` | Raising `full` lets writes continue to fuller OSDs and risks a hard stop with no room to recover; ratios must stay ascending |
| `ceph osd pool set POOL min_size 1` or `size 2` | Accepts I/O with a single copy; a failure now loses data (docs: only temporarily in emergencies) |
| `ceph osd set noout` left on | No rebalancing after real failures; always unset after maintenance |

- **PROOF:** Record the current value (`ceph osd dump | grep -i ratio`, `ceph osd pool get POOL min_size`) and the revert command before changing.
- **WAIT-FOR-GO:** "Temporarily set <setting> to <value> for <duration>, revert command <cmd>, reason <why>?"

## Sources

- https://docs.ceph.com/en/latest/cephadm/services/osd/ and Context7 `/ceph/ceph` (`ceph.rst` osd purge/safe-to-destroy/ok-to-stop; `pools.rst` pool delete and min_size; `troubleshooting-osd.rst` ratios; `host-management.rst` drain) (read 2026-11-10)
- https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Advanced/ceph-osd-mgmt.md (2026-11-10)

## Not verified

- `ceph fs volume rm`, `ceph osd destroy` options and `ceph osd dump` ratio field names: not read today.
- That `ceph orch osd rm` drains before removing: inferred from the documented `status` command and the host-drain page ("All OSDs on the host will be scheduled to be removed"); the OSD page's own explanatory text was truncated.
- No command was run against a real cluster.
