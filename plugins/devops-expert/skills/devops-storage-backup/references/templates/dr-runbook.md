# Disaster-Recovery Runbook (skeleton)

Keep an offline, printed or sealed copy. Review after every drill and architecture change.

Owner: ______  Last reviewed: ______  Last drill: ______  Next drill: ______

## 1. Scope and targets

| System | Criticality | RPO | RTO | Backup location(s) | Restore method |
|--------|-------------|-----|-----|--------------------|----------------|
| | | | | | |

## 2. Roles and contacts

Decision maker, operators, communicator, vendor and hardware contacts, escalation order, out-of-band communication channel.

## 3. Declaring a disaster

Triggers (site down > X h, data loss confirmed, ransomware suspected), who may declare, how it is announced. For ransomware: isolate first, assume production credentials are compromised, restore from the immutable copy.

## 4. Access and secrets (sealed section)

Where to find, offline: repository passwords and keys, S3 credentials, Ceph admin keyring recovery path, hypervisor and out-of-band (IPMI) logins, DNS/registrar and certificate authority access. Reference locations only; values live in the secret store and an offline escrow (`devops-secrets`).

## 5. Restore order

1. Out-of-band access, network, DNS, time
2. Secrets store and identity
3. The backup system itself (repository host, S3 endpoint, PBS, Velero BSL)
4. Storage platform (ZFS pools, Ceph) if lost
5. Data stores (databases per `devops-databases`)
6. Applications and Kubernetes (cluster per `devops-k8s-cluster`, workloads via Velero)
7. Edge: load balancers, reverse proxy, certificates

## 6. Per-system recovery steps

For each system: prerequisites, exact commands (with dry-run or scratch step first), expected duration, verification command and expected output, rollback if the restore fails.

## 7. Verification and handback

Service checks per system, data-consistency checks, monitoring green, backups re-enabled and first new backup verified, credentials rotated if compromise was possible, stakeholders informed.

## 8. After action

Timeline, actual RTO/RPO vs targets, gaps, owners and dates, runbook updates.
