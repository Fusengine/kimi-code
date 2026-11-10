---
name: ha-crs
description: Proxmox VE High Availability - HA resources, affinity rules, fencing, Cluster Resource Scheduler modes, load balancing, maintenance and disarm
when-to-use: Making guests highly available, placing them with rules, tuning CRS, or doing node/cluster maintenance with HA active
keywords: ha-manager, CRM, LRM, watchdog, fencing, node-affinity, resource-affinity, crs, dynamic, static, disarm-ha, node-maintenance
priority: high
related: cluster-quorum.md, storage-model.md, safe-change-protocol.md
---

# HA and the Cluster Resource Scheduler

**Load when:** adding HA to a VM/CT, writing placement rules, a node fenced itself, enabling automatic rebalancing, or planning maintenance on an HA cluster.

Source unless noted: https://pve.proxmox.com/pve-docs/ha-manager.1.html (9.2.13).

## Preconditions

- At least 3 votes (3 nodes, or 2 + QDevice) - see [cluster-quorum.md](cluster-quorum.md).
- Guest disks on storage reachable from the recovery nodes (shared storage, or ZFS replication with its asynchronous data-loss window).
- Passed-through devices handled via resource mappings.

## Fencing model (why HA reboots nodes)

A node with active HA services that loses quorum cannot reset its watchdog; it **reboots after 60 seconds**. Hardware watchdog if present, else `softdog`. The cluster recovers the services elsewhere only after it can take the failed node's lock. If no HA service is configured for more than 15 minutes, the CRM goes idle and closes its watchdog. Consequence: never cut the corosync network on an HA cluster without disarming first.

## Resources and rules

```bash
ha-manager add vm:100 --state started --max_restart 1 --max_relocate 1
ha-manager status
ha-manager config
# placement rules (PVE 9 replaces HA groups; groups auto-migrate to rules once all nodes run 9)
ha-manager rules add node-affinity db-on-fast --resources vm:100,vm:101 --nodes pve1:2,pve2:1 --strict 0
ha-manager rules add resource-affinity keep-apart --resources vm:201,vm:202 --affinity negative
ha-manager rules list
```

- `--strict 1` on a node-affinity rule restricts resources to the listed nodes only.
- Rules are checked for feasibility before being applied; infeasible rules are disabled.
- `ha-manager remove <sid>` defaults to `--purge 1`: it also removes the resource from rules (deleting a rule if it was the last member). The guest keeps running; only HA management stops.
- After HA group migration issues: `journalctl -eu pve-ha-crm` on the active CRM node (https://pve.proxmox.com/wiki/Upgrade_from_8_to_9).

## CRS scheduling modes

Configured in `/etc/pve/datacenter.cfg` (Datacenter, Options, Cluster Resource Scheduling):

```text
crs: ha=dynamic,ha-auto-rebalance=1
```

| Mode | Uses | Notes |
|------|------|-------|
| `basic` (default) | number of active guests per node | |
| `static` | configured CPU/memory of active guests | |
| `dynamic` (9.2) | average CPU/memory usage + configured quotas | Required, with `static`, for the load balancer |

Load balancer (9.2): `ha-auto-rebalance` (default 0) migrates **HA resources only**, sequentially, obeying affinity rules. Threshold default 30%, improvement margin default 10%, hold duration default 3 rounds (rounds are about 10 s). Exclude a guest with `ha-manager set vm:100 --auto-rebalance 0`. `ha-rebalance-on-start` for static/dynamic is still technology preview. Full key list: `crs: [ha=<basic|static|dynamic>] [,ha-auto-rebalance=<1|0>] [,ha-auto-rebalance-hold-duration=<number>] [,ha-auto-rebalance-margin=<number>] [,ha-auto-rebalance-method=<bruteforce|topsis>] [,ha-auto-rebalance-threshold=<number>] [,ha-rebalance-on-start=<1|0>]` (https://pve.proxmox.com/pve-docs/pve-admin-guide.html, datacenter.cfg).

## Maintenance

| Need | Command | Effect |
|------|---------|--------|
| One node: hardware work, kernel | `ha-manager crm-command node-maintenance enable <node>` | HA services migrate away; the mode survives reboots until `... disable <node>` |
| Whole cluster: corosync network change | `ha-manager crm-command disarm-ha freeze` | Releases **all** watchdogs; no fencing, failover or recovery; state changes not applied |
| Same, manual moves needed | `ha-manager crm-command disarm-ha ignore` | Resources leave HA tracking and are managed manually |
| End of window | `ha-manager crm-command arm-ha` | Resources return to their previous HA state |

While disarmed, a real node failure is **not** recovered: keep the window short and announced.

Known issue (9.2): disarming while HA resources are still migrating can stall an upgrade from a pve-ha-manager version older than 5.2.4 on the package triggers; keep HA armed during upgrades or wait for migrations to finish; re-arming unblocks it (https://pve.proxmox.com/wiki/Roadmap, 9.2 known issues).

## Verification

```bash
ha-manager status          # quorum OK, master node, each service "started" on the expected node
journalctl -u pve-ha-crm -u pve-ha-lrm --since "-1h"
```

Test failover on a non-critical guest before trusting it (cut its node's power or network in a planned window, with the owner's go).

## Pitfalls

- HA on local, non-replicated disks: the guest cannot start elsewhere.
- Manual migrations that violate node-affinity rules are refused since 9.2.
- Remote migration of HA resources to another cluster is refused since 9.2: remove them from HA first.
- Adding a guest to HA during create/restore requires `Sys.Console` since 9.2 (PSA-2026-00015-1).

## Not verified

- CLI flags exposing `ha-auto-rebalance-*` other than the `datacenter.cfg` keys above (the web UI is the documented path).
