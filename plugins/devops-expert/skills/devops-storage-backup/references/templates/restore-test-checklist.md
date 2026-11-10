# Restore Test Checklist (one sheet per test)

Store completed sheets with the backup documentation (not on the system under test).

| Field | Value |
|-------|-------|
| Date / operator | |
| System and data set tested | |
| Backup tool and version | restic / borg / zfs send / velero / PBS: |
| Repository or target (name only, no secrets) | |
| Snapshot / archive / backup id and its age | |
| Restore target (scratch dir, dataset, VMID, namespace) | |
| Policy RTO for this system | |

## Steps

- [ ] Structure check passed (`restic check` / `borg check` / `zpool scrub` of target / PBS verify) - result:
- [ ] Restored into a scratch target, never over production
- [ ] Commands used (paste, redact secrets):
- [ ] Content verified: checksum sample / row counts / service boots / pods Ready - method and result:
- [ ] Oldest retained snapshot sampled this quarter: yes / no
- [ ] Data size restored: ______  Duration: ______  Throughput: ______
- [ ] Measured full-restore estimate vs RTO: within / exceeds (action:)
- [ ] Scratch target removed (named explicitly, go given)
- [ ] Keys/passwords used came from the sealed DR store, not from the production host: yes / no

## Verdict

PASS / FAIL / PARTIAL. Findings and owners with dates:

## Evidence log line

`YYYY-MM-DD | system | snapshot-id | target | result | duration | operator`
