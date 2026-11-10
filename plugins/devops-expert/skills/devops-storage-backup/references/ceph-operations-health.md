---
name: ceph-operations-health
description: Reading Ceph health, capacity and fullness, maintenance flags, and the safe OSD replacement procedure
when-to-use: Ceph reports HEALTH_WARN/ERR, a disk fails, a node needs maintenance, or capacity is rising
keywords: ceph -s, ceph health detail, osd df, nearfull, backfillfull, noout, ok-to-stop, safe-to-destroy, orch osd rm, replace
priority: critical
related: ceph-architecture-deploy.md, ceph-destructive-ops.md, capacity-smart-monitoring.md
---

# Ceph Operations and Health

**Load when:** a Ceph cluster shows anything other than HEALTH_OK, or before maintenance. All commands here are read-only unless marked.

## Read first

```bash
ceph -s                      # overall status, quorum, OSDs up/in, PG states
ceph health detail           # names the failing checks and objects
ceph osd tree                # hierarchy and up/down state
ceph osd df                  # per-OSD utilisation (look at the MOST full OSD)
ceph df                      # per-pool usage
ceph orch ps                 # cephadm daemons
ceph orch osd rm status      # running OSD removals
```

## Health states

| State | Meaning | Action |
|-------|---------|--------|
| `HEALTH_OK` | No active checks | None |
| `HEALTH_WARN` | A check is active (for example `1 nearfull osd(s)`) | Read `ceph health detail`; fix before it escalates |
| `HEALTH_ERR` | Serious: PGs down, OSDs full, quorum trouble | Stop non-urgent changes; restore redundancy first |
| PG `down+peering` | Not enough surviving OSDs to serve data | Find the down OSDs (`ceph health detail` lists them); do not purge anything |

PGs should be `active+clean` after any change; never stack a second change while PGs are degraded.

## Capacity

Defaults: `nearfull` 0.85 raises `OSD_NEARFULL`, `backfillfull` 0.90 stops backfills, `full` 0.95 blocks client writes. Ratios must stay ascending (`ceph osd set-nearfull-ratio` < `set-backfillfull-ratio` < `set-full-ratio`). `ceph df` reports available space against the **most full OSD** of the pool, so one outlier can stall writes: use the balancer module or `reweight-by-utilization`. Alert at 70 percent used and plan growth at 75-80 percent; changing ratios to "make room" is a stop-gap that needs a go ([capacity-smart-monitoring.md](capacity-smart-monitoring.md)).

## Maintenance

For short planned downtime of a node, set `ceph osd set noout` before and `ceph osd unset noout` after, so Ceph does not rebalance. Before stopping OSDs: `ceph osd ok-to-stop ID [ID...]` returns success only if stopping them does not immediately make data unavailable.

## Replace a failed OSD (cephadm)

1. **Read-only:** `ceph osd tree`, `ceph health detail`, `ceph osd safe-to-destroy ID` (success only if removal does not reduce redundancy/durability), `ceph orch device ls`.
2. **Dry run** of any spec change: `ceph orch apply ... --dry-run`.
3. **Go**, then: `ceph orch osd rm ID --replace` (add `--zap` to wipe the device; `--force` only after the go and a reason). Follow `ceph orch osd rm status` until it finishes.
4. Swap the physical disk, confirm it appears `AVAILABLE` in `ceph orch device ls`, and let the matching OSD spec recreate the OSD (or `ceph orch daemon add osd HOST:DEV`).
5. **Verify:** `ceph -s` returns to `active+clean`; the new OSD is `up` and `in`; recovery finished; SMART on the other disks of that host is clean ([capacity-smart-monitoring.md](capacity-smart-monitoring.md)).

Removing a whole host: `ceph orch host drain HOST`, wait for `ceph orch osd rm status` to empty, check `ceph orch ps HOST`, then `ceph orch host rm HOST` (destructive: [ceph-destructive-ops.md](ceph-destructive-ops.md)).

## Rook (Kubernetes)

Run the same `ceph` commands in the Rook toolbox. Manual OSD removal in Rook: detach the PVC label, `ceph osd out osd.ID`, wait until PGs are `active+clean`, then `ceph osd purge ID --yes-i-really-mean-it` (destructive).

## Sources

- https://docs.ceph.com/en/latest/cephadm/services/osd/ (read 2026-11-10)
- Context7 `/ceph/ceph` (2026-11-10): https://github.com/ceph/ceph/blob/main/doc/rados/troubleshooting/troubleshooting-osd.rst (ratios, `ceph df`), .../doc/rados/operations/health-checks.rst , .../doc/man/8/ceph.rst (`ok-to-stop`, `safe-to-destroy`, `purge`), .../doc/cephadm/host-management.rst (drain)
- https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Advanced/ceph-osd-mgmt.md (2026-11-10)

## Not verified

- Exact semantics of `--replace` (documented elsewhere as keeping the OSD id reserved): the page excerpt read shows only the flag, not its explanation.
- The 70/75-80 percent alert points are practice thresholds, not Ceph documentation.
- `ceph osd set noout` behaviour was seen in a Nautilus upgrade note; confirm against the current Umbrella/Tentacle docs.
- Balancer module commands (`ceph balancer`) not read today.
