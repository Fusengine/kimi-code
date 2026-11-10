---
name: backup-strategy
description: Backup design - 3-2-1-1-0, RPO/RTO, backup types, retention, immutability, encryption, off-site, monitoring
when-to-use: Designing or auditing what is backed up, how often, where, for how long, and how it is protected from deletion
keywords: 3-2-1-1-0, rpo, rto, full, incremental, forever incremental, retention, gfs, immutable, append-only, object lock, encryption, off-site
priority: critical
related: restore-testing-dr.md, restic.md, borg-borgmatic.md, velero-kubernetes-backup.md, templates/backup-policy-table.md
---

# Backup Strategy

**Load when:** a system has no backup design, or an existing one must be reviewed. Fill [templates/backup-policy-table.md](templates/backup-policy-table.md) per system.

## Targets first

| Term | Question | Drives |
|------|----------|--------|
| **RPO** | How much data can be lost (time since last good copy)? | Backup frequency, replication |
| **RTO** | How long can the service be down? | Restore method, hot vs cold copy, runbook |
| **Retention** | How far back must we recover (corruption found late, legal)? | Keep rules, storage size |

If RPO or RTO is unknown, ask; do not invent. A 24h RPO with a 1h RTO needs a local fast copy plus an off-site copy; a 4h RTO for 10 TB over a 100 Mbit link is arithmetic, not hope: compute restore time from size and bandwidth.

## 3-2-1-1-0

3 copies of the data, on 2 different media or systems, 1 off-site, 1 immutable or offline, 0 errors after verification (restore test or `check`). The extra "1-0" is the ransomware answer: production credentials must not be able to delete or alter at least one copy.

| Copy | Example | Protects against |
|------|---------|------------------|
| Production | ZFS pool / Ceph | n/a |
| Local backup | restic repo on another host, PBS | Operator error, disk loss |
| Off-site, immutable | S3 bucket with object lock, append-only rest-server, Borg `--append-only` server, offline disk | Site loss, ransomware, compromised host |

## Backup types

| Type | Behaviour | Tools |
|------|-----------|-------|
| Full | Everything each time | Rare; large |
| Incremental | Changes since last backup | tar/rsync schemes |
| Forever incremental (deduplicated snapshots) | First full, then only new blocks; every snapshot restores standalone | restic, Borg, PBS |
| Storage snapshot + send | Block-level delta of a dataset | ZFS send |

Deduplicating tools make retention (not full/incremental chains) the thing to design.

## Retention (GFS style)

Keep recent frequent copies and thin out older ones, for example 24 hourly, 7 daily, 4 weekly, 12 monthly, 3 yearly; tool flags in [restic.md](restic.md) and [borg-borgmatic.md](borg-borgmatic.md). Retention deletes data permanently: preview with the tool's dry-run and run it from a separate, trusted host, not from the client being backed up. If clients may only append, pruning must happen server-side with separate credentials.

## Protect the backups themselves

| Control | Implementation |
|---------|---------------|
| Encryption | Client-side (restic, Borg, PBS) with a key stored apart from the repository; **lose the key, lose the backups**: escrow it |
| Immutability | restic rest-server append-only (or rclone serve restic as a front), Borg append-only, S3 object lock, offline media |
| Separate credentials | Backup client writes only; admin credentials never on the client |
| Isolation | Backup network and hosts out of the production admin domain |
| Integrity | `restic check` (+ `--read-data-subset`), `borg check`, ZFS scrub, PBS verify jobs |
| Monitoring | Alert on "no successful backup within RPO", repository size trend, restore-test age |

## What to back up

Data, configuration, secrets-store recovery material (`devops-secrets`), infrastructure code lives in Git, databases need consistent dumps or PITR (`devops-databases`), Kubernetes needs objects plus volumes ([velero-kubernetes-backup.md](velero-kubernetes-backup.md)), VMs on Proxmox use PBS/vzdump (`devops-proxmox`). Exclude caches, `/proc`, `/sys`, temp, and other backups.

## Sources

- https://restic.readthedocs.io/en/stable/060_forget.html (retention, append-only, read 2026-11-10)
- https://borgbackup.readthedocs.io/en/stable/usage/notes.html (append-only, via Context7, 2026-11-10)

## Not verified

- The "3-2-1-1-0" formulation is a vendor-popularised convention; the vendor page was not readable today (page rendered navigation only). The definition above is the commonly stated one.
- Example retention numbers are illustrative, not a standard.
- S3 object-lock support per product: see [object-storage-s3.md](object-storage-s3.md).
