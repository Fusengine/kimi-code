---
name: backup-pbs
description: Backups from the Proxmox VE side - vzdump modes, scheduled backup jobs (jobs.cfg, /cluster/backup), retention, protection, Proxmox Backup Server storage integration and client-side encryption
when-to-use: Defining or auditing backup jobs, attaching a PBS datastore to PVE, setting retention, or taking a pre-change backup before a risky operation
keywords: vzdump, jobs.cfg, /cluster/backup, schedule, prune-backups, keep-last, protected, fleecing, pbs storage, fingerprint, encryption-key, master-pubkey, qmrestore, pct restore
priority: high
related: storage-model.md, safe-change-protocol.md
---

# Backups and PBS Integration (PVE side)

**Load when:** a backup job is created or audited, a PBS datastore is attached, retention is set, or a change needs a pre-change backup. PBS server internals (datastores, GC, verify, sync, S3 backend, tape) and **restore drills** belong to skill `devops-storage-backup`.

Sources: https://pve.proxmox.com/pve-docs/vzdump.1.html , https://pve.proxmox.com/pve-docs/pve-admin-guide.html section 7.8 (pbs), https://pve.proxmox.com/pve-docs/api-viewer/ (`POST /cluster/backup`) - docs 9.2.13. PBS current release 4.2 (2026-04-29), PBS 4 EOL TBA (https://pbs.proxmox.com/docs/faq.html).

## Modes

| `--mode` | VM | Container |
|----------|----|-----------|
| `snapshot` (default) | Live backup, lowest downtime, small inconsistency risk; guest agent `fsfreeze` if `agent: 1` | Needs all backed-up volumes on snapshot-capable storage |
| `suspend` | Compatibility only; longer downtime, no consistency gain: use `snapshot` | rsync to `--tmpdir`, short suspend, second rsync; needs space |
| `stop` | Orderly shutdown, highest consistency, short downtime | Container stopped for the whole backup |

QEMU guest agent option `freeze-fs` (9.2; aliases `freeze-fs-on-backup`, `guest-fsfreeze`) controls freeze/thaw. `--fleecing enabled=1,storage=<id>` (VMs only) caches copy-before-write data in a local fleecing image so a slow backup target does not throttle or hang guest writes. CT extra mount points are only included when their Backup option is set; bind and device mounts are never backed up.

## Attach a PBS datastore

```bash
pvesm scan pbs <pbs-host> <user>@pbs --password <pw> --fingerprint <sha256-fp>
pvesm add pbs pbs-main --server <pbs-host> --datastore <store> \
  --username <user>@pbs --fingerprint <sha256-fp> --password
pvesm status
```

- Use a dedicated PBS user or token with backup rights on that datastore only, not `root@pam`. The password is stored root-only in `/etc/pve/priv/storage/<id>.pw`.
- `--fingerprint` is required for self-signed PBS certificates (`proxmox-backup-manager cert info` on the PBS host).
- Client-side encryption: `--encryption-key autogen` stores the key in `/etc/pve/priv/storage/<id>.enc`. **Without the key, backups are unrecoverable**: export it at once (`proxmox-backup-client key paperkey ... --output-format text`) to a password manager and an offline copy. Optional `--master-pubkey` adds an RSA-wrapped copy of the key to every backup.
- Different encryption keys on one datastore defeat deduplication between them.

## Scheduled jobs

Jobs live in `/etc/pve/jobs.cfg`, run by `pvescheduler`, managed in Datacenter, Backup or via the API:

```bash
pvesh create /cluster/backup --id nightly-prod --schedule "01:30" \
  --storage pbs-main --vmid 100,101,200 --mode snapshot --enabled 1 \
  --prune-backups keep-last=3,keep-daily=13,keep-weekly=8,keep-monthly=11 \
  --repeat-missed 1 --notes-template "{{guestname}} on {{node}}"
pvesh get /cluster/backup
```

- Schedules use the calendar-event syntax (admin guide appendix "Calendar Events"): `01:30` daily, `sat 02:00`, `mon..fri 22:00`.
- `--all 1` with `--exclude <vmids>` instead of `--vmid` to catch new guests automatically.
- `--repeat-missed 1` runs jobs missed while the node or scheduler was down.
- The legacy `starttime`/`dow` parameters are deprecated in favour of `schedule` (9.2). The `maxfiles` setting was dropped in 9.0: use `prune-backups`.
- Retention is usually set on the storage (`prune-backups` storage option); job-level values override it. Weeks follow ISO weeks.

Full job template: [templates/backup-job-pbs.md](templates/backup-job-pbs.md).

## One-off pre-change backup

```bash
vzdump <vmid> --storage pbs-main --mode snapshot --notes-template "pre-change {{vmid}}" --protected 1
```

`--protected 1` excludes the backup from pruning (enforced by PVE/PBS, not by the filesystem). Remove protection once the change is accepted.

## Restore (PVE side)

`qmrestore <archive> <vmid>` for VMs, `pct restore <vmid> <archive>` for CTs. PBS supports live-restore of VMs: the VM starts while the restore is still ongoing (https://pve.proxmox.com/wiki/Migrate_to_Proxmox_VE). Restoring over an existing VMID replaces it: use a **new** VMID for tests.

## Verification

- `pvesh get /cluster/backup` shows the job, `enabled 1`, the right storage.
- Every production VMID appears in a job: compare `qm list` / `pct list` with `/etc/pve/jobs.cfg` (or the GUI's backup-job guest view).
- Task log of the last run: `OK` per guest. A backup is only proven by a restore to a test VMID - procedure in `devops-storage-backup`.

## Pitfalls

- Backups stored on the same node/pool as the guests: not a backup.
- Encryption key only on the PVE node that is being backed up: lost with the node.
- Destroying a guest without `--purge` leaves it in jobs (job warnings); with `--purge` it silently leaves the job.
- Veeam (third party) broke for VMs on QEMU machine version >= 10.0 after the 9.0 upgrade (https://pve.proxmox.com/wiki/Upgrade_from_8_to_9 known issues).

## Not verified

- An API endpoint listing guests not covered by any backup job was not checked; the grep comparison above is the verified-safe method.
- Behaviour of a live-restore that fails midway: not read at the source; test on a throwaway VMID before relying on live-restore.
