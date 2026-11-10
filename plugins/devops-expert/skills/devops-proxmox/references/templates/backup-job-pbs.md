---
name: backup-job-pbs
description: Attach a Proxmox Backup Server datastore to PVE with a dedicated user and client-side encryption, then define a scheduled backup job with retention
keywords: pvesm add pbs, fingerprint, encryption-key, paperkey, pvesh create /cluster/backup, schedule, prune-backups, repeat-missed, jobs.cfg
---

# Template: PBS Storage and Scheduled Backup Job

## Usage

PVE side only. Creating the PBS datastore, its user/permissions, verify jobs and GC is done on the PBS host (skill `devops-storage-backup`). Commands from https://pve.proxmox.com/pve-docs/pve-admin-guide.html section 7.8, https://pve.proxmox.com/pve-docs/vzdump.1.html and the `POST /cluster/backup` schema in https://pve.proxmox.com/pve-docs/api-viewer/ (docs 9.2.13). Current PBS: 4.2.

## Variables

```bash
PBS=pbs01.example.internal
DS=prod                       # PBS datastore ID
PBSUSER=pve-backup@pbs        # dedicated PBS user, realm included
STORE=pbs-prod                # storage ID inside PVE
FP=<sha256 fingerprint>       # on PBS: proxmox-backup-manager cert info
```

## 1. Attach the datastore

```bash
pvesm scan pbs $PBS $PBSUSER --password --fingerprint "$FP"   # lists datastores the user can see
pvesm add pbs $STORE --server $PBS --datastore $DS --username $PBSUSER \
  --fingerprint "$FP" --password --content backup \
  --encryption-key autogen
pvesm status | grep $STORE
```

## 2. Secure the encryption key immediately

```bash
# key stored root-only at /etc/pve/priv/storage/$STORE.enc
proxmox-backup-client key paperkey /etc/pve/priv/storage/$STORE.enc --output-format text > /root/$STORE-paperkey.txt
```

Move the paper key into the password manager and an offline copy, then delete `/root/$STORE-paperkey.txt`. Without this key every encrypted backup is unrecoverable.

## 3. Scheduled job

```bash
pvesh create /cluster/backup \
  --id nightly-prod \
  --schedule "01:30" \
  --storage $STORE \
  --all 1 --exclude 9000 \
  --mode snapshot \
  --enabled 1 \
  --repeat-missed 1 \
  --prune-backups keep-last=3,keep-daily=13,keep-weekly=8,keep-monthly=11,keep-yearly=9 \
  --notes-template "{{guestname}} ({{vmid}}) on {{node}}" \
  --comment "Nightly production backup to PBS"
pvesh get /cluster/backup --output-format json-pretty
grep -A12 "nightly-prod" /etc/pve/jobs.cfg
```

- `--all 1 --exclude <vmids>` covers new guests automatically; use `--vmid 100,101` for an explicit list instead.
- Retention example from the admin guide (daily backups, about 10 years of coverage). Retention can instead live on the storage (`pvesm set $STORE --prune-backups ...`); job values override it.
- Slow targets and busy VMs: add `--fleecing enabled=1,storage=local-lvm`.

## 4. First run on demand

```bash
vzdump 100 --storage $STORE --mode snapshot      # one guest, watch the task log for "OK"
```

## Verification

- `pvesm list $STORE --vmid 100` shows the new backup.
- The job's next run time is visible in Datacenter, Backup; the first scheduled run's task log is `OK` for each guest.
- Restore test to a new VMID (`qmrestore $STORE:<backup-volid> <test-vmid>`) - full drill and evidence in `devops-storage-backup`.

## Rollback

Disable instead of delete: `pvesh set /cluster/backup/nightly-prod --enabled 0` (`PUT /cluster/backup/{id}`, "Update vzdump backup job definition", accepts `enabled`). Removing the storage entry (`pvesm remove $STORE`) deletes no backup data on PBS.

## Not verified

- Whether `pvesm scan pbs` accepts `--password` without a value (interactive prompt) as `pvesm add` does: the admin guide shows `[--password <string>]`.
