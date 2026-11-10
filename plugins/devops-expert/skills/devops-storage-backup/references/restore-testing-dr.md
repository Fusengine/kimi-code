---
name: restore-testing-dr
description: Restore testing as the only proof of a backup, restore-test procedure per tool, and the disaster-recovery runbook and drill
when-to-use: Proving a backup works, scheduling restore tests, or writing and rehearsing a disaster-recovery plan
keywords: restore test, verification, evidence, disaster recovery, runbook, drill, rto, rpo, scratch restore, checksum
priority: critical
related: backup-strategy.md, restic.md, borg-borgmatic.md, velero-kubernetes-backup.md, templates/restore-test-checklist.md, templates/dr-runbook.md
---

# Restore Testing and Disaster Recovery

**Load when:** a backup is claimed to work, after any backup tool or storage change, or when writing a DR plan. A backup that was never restored is unproven. `check`, `verify` and `scrub` prove structure; only a restore proves usability.

## Restore-test procedure

1. **Pick the sample** by rotation: a different system, snapshot age and data type each run (including the oldest retained snapshot now and then).
2. **Restore to a scratch target**, never over production: empty directory, scratch VM/VMID, scratch namespace, scratch dataset (`zfs receive -u` into a test pool, or a clone).
3. **Prove content:** compare checksums of a sample of files against the source or a manifest; for databases start the engine on the restored files and run a consistency query (`devops-databases`); for VMs boot to login; for Kubernetes check pods Ready and data present.
4. **Measure time** and compare with RTO; record size/duration to estimate full-restore time.
5. **Log evidence** with [templates/restore-test-checklist.md](templates/restore-test-checklist.md): date, operator, source, snapshot id, target, commands, checksum result, duration, verdict, follow-ups.
6. **Clean up** the scratch target (itself a deletion: name it explicitly).
7. **Alert** when the newest passing restore test is older than the policy (for example 90 days).

## Per tool

| Tool | Restore test |
|------|--------------|
| restic | `restic -r REPO restore latest --target /srv/restore-test --include /path` then diff; `restic check --read-data-subset=...` for a sample of pack data |
| Borg | extract an archive to a scratch directory; `borg check` for structure |
| ZFS send | `zfs receive -n -v` for the dry run, then a real receive into a scratch dataset with `-u`; `zpool scrub` of the target pool |
| Velero | `velero restore create --from-backup NAME --namespace-mappings src:scratch` (flag spelling: check `--help`) in a scratch cluster or namespace |
| PBS / vzdump | restore the guest to an unused VMID without starting it on the production network (`devops-proxmox`) |

## Disaster-recovery plan

A DR plan answers: what is lost, who decides, in what order things return, and where the secrets are. Skeleton: [templates/dr-runbook.md](templates/dr-runbook.md). Essentials:

| Element | Requirement |
|---------|-------------|
| Scenarios | Disk, node, rack/site, ransomware (assume production credentials are compromised), operator error, backup-system loss |
| Order of restore | Identity/DNS/secrets and the backup system itself first, then data stores, then applications; dependency table with RTO per item |
| Access | Offline copy of: repository passwords and keys, S3 credentials, hardware contact, the runbook itself |
| Roles | Decision maker, operators, communicator; call tree |
| Verification | Per service: command and expected result proving it is back |
| Drill | At least yearly, fully restoring one critical system from off-site copies on clean hardware or a scratch site; record actual RTO versus target |
| Update | After every drill and every architecture change |

Ransomware rule: restore from the immutable copy, onto rebuilt hosts, with rotated credentials, and before reconnecting check how far back the infection goes (retention must be longer than detection time).

## Sources

- https://restic.readthedocs.io/en/stable/045_working_with_repos.html and .../060_forget.html (restore, check, read 2026-11-10)
- https://github.com/velero-io/velero/blob/main/site/content/docs/v1.18/disaster-case.md (Velero DR flow, via Context7, 2026-11-10)
- https://openzfs.github.io/openzfs-docs/man/master/8/zfs-receive.8.html (`-n`, `-u`, read 2026-11-10)

## Not verified

- Testing cadence and "yearly drill" are practice guidance, not tool documentation.
- `restic restore --include` and `--namespace-mappings` spellings were not re-read on current references.
- The ransomware sequence is general incident practice; align it with the organisation's incident process (`devops-sre-ops`).
