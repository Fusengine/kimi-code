---
name: capacity-smart-monitoring
description: Capacity monitoring and alert thresholds for ZFS, Ceph, repositories and buckets, SMART disk health, and backup-freshness alerts
when-to-use: Defining storage alerts, investigating a filling pool or cluster, or checking disk health
keywords: capacity, smartctl, smart, zpool list, ceph df, nearfull, freshness, alert, exporter, node_exporter, textfile
priority: high
related: ceph-operations-health.md, zfs-pools-datasets.md, backup-strategy.md
---

# Capacity and SMART Monitoring

**Load when:** designing alerts for storage and backups, or a disk is suspected. Dashboards, Prometheus and Alertmanager configuration belong to `devops-observability`; this file lists what to watch and why.

## What to alert on

| Signal | Source | Warn | Critical | Why |
|--------|--------|------|----------|-----|
| ZFS pool capacity | `zpool list -H -o name,cap,health` | 75 percent | 85 percent | Fragmentation and write slowdown grow near full; thresholds are practice values |
| ZFS health / errors | `zpool status -x`, READ/WRITE/CKSUM counters | any non-zero counter | DEGRADED / FAULTED | Redundancy lost or data errors |
| Last scrub age and result | `zpool status` | older than 45 days | errors found | Silent corruption |
| Ceph health | `ceph health detail` | `HEALTH_WARN` | `HEALTH_ERR` | Redundancy or availability |
| Ceph fullness | `ceph osd df`, `ceph df` | most-full OSD at 70 percent | at `nearfull` 85 percent | `backfillfull` 90 and `full` 95 stop recovery and writes |
| Backup freshness | newest successful snapshot time per system | older than RPO | older than 2x RPO | Silent failure of the job |
| Repository size growth | `restic stats`, `borg info`, bucket size | forecast < 30 days to full | < 7 days | Retention or churn changed |
| Restore-test age | evidence log | older than 90 days | older than 180 days | Unproven backups |
| SMART | `smartctl` | pending/reallocated sectors rising | self-test or overall health failed | Early disk failure |

Alert on the **absence** of a success signal (dead-man switch, for example a heartbeat ping after each backup) rather than only on job errors.

## SMART

`smartctl` (smartmontools; Debian testing ships 7.5) controls and reads SMART for ATA/SATA, SCSI/SAS and NVMe devices; use `/dev/sdX` for SATA/SAS and `/dev/nvme0` for NVMe, and `-d` when disks sit behind a RAID controller.

```bash
smartctl -i /dev/sdX          # identity
smartctl -H /dev/sdX          # overall health verdict
smartctl -a /dev/sdX          # all SMART data (attributes, error log, self-test log)
smartctl -t short /dev/sdX    # start a short self-test (reads media, no data change)
```

Run a short self-test weekly and a long one monthly; schedule them with `smartd` (smartmontools daemon) so failures are mailed or exported. A SMART "PASSED" verdict does not mean the disk is healthy: watch reallocated, pending and uncorrectable sector counts and the error log. Replace on rising counters, not on failure. Ceph and ZFS replacement procedures: [ceph-operations-health.md](ceph-operations-health.md), [zfs-pools-datasets.md](zfs-pools-datasets.md).

## Exporters (pointers)

node_exporter textfile collector for backup timestamps, a ZFS exporter, the Ceph MGR Prometheus module, and a SMART exporter are common choices; selection, rules and dashboards: `devops-observability`.

## Cleaning up space safely

Never free space by deleting snapshots, backups or OSDs under pressure without the destructive-ops protocol ([zfs-destructive-ops.md](zfs-destructive-ops.md), [ceph-destructive-ops.md](ceph-destructive-ops.md), [backup-destructive-ops.md](backup-destructive-ops.md)). First find the owner of the growth: `zfs list -o space -r POOL`, `ceph df`, `restic stats`.

## Sources

- https://manpages.debian.org/testing/smartmontools/smartctl.8.en.html (read 2026-11-10: supported device paths, `-d`, description; options list truncated)
- Context7 `/ceph/ceph` troubleshooting-osd.rst (ratios, `ceph osd df`, `ceph df`, 2026-11-10)
- https://openzfs.github.io/openzfs-docs/man/master/8/zpool-scrub.8.html (read 2026-11-10)

## Not verified

- The meaning of `smartctl -i/-H/-a/-t short` was not confirmed on the truncated man page today; they are the standard documented options.
- `smartd` configuration syntax was not read.
- ZFS `zpool list -o cap`, `zfs list -o space` column names: not run or read today.
- Warn/critical numbers are practice thresholds, not vendor or project requirements, except the Ceph ratios (documented defaults 0.85 / 0.90 / 0.95).
- Heartbeat/dead-man-switch services and exporter names are examples only.
