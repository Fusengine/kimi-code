# Backup Policy Table (template)

One row per system or data class. Every blank must be answered by the owner or the business; do not invent values.

| System / data | Owner | Criticality | RPO | RTO | Method and tool | Frequency | Retention | Copies (3-2-1-1-0) | Immutable leg | Encryption and key location | Off-site target | Restore test cadence | Last restore test |
|---------------|-------|-------------|-----|-----|-----------------|-----------|-----------|--------------------|---------------|-----------------------------|-----------------|----------------------|-------------------|
| Example: file server `/srv` | IT | High | 24 h | 4 h | restic to S3 | nightly 02:30 | 7d/4w/12m/3y | prod + local repo + S3 | S3 object lock 35 d | client-side; password in secret store + sealed copy | S3 EU | quarterly | 2026-10-12 |
| Example: Postgres | DBA | Critical | 5 min | 1 h | PITR + base backup (`devops-databases`) | continuous + daily base | 14d | | | | | monthly | |
| | | | | | | | | | | | | | |

## Reading the table

- RPO drives frequency; RTO drives the method (local fast copy or replica for short RTO).
- "Copies" must show 3 copies, 2 media/systems, 1 off-site; "Immutable leg" must be non-empty for anything critical.
- A row without a restore-test date is "unproven".
- Retention changes are deletions: apply through [../backup-destructive-ops.md](../backup-destructive-ops.md).
