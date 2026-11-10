---
name: change-rollout
description: Change management and safe rollout - change request contents, canary and progressive rollout, feature flags, freeze windows, rollback criteria fixed before the change, maintenance windows and patch cadence, with ACTION / EFFECT / PROOF / WAIT-FOR-GO for rollback, failover, restart, traffic shift and freeze lift
when-to-use: Planning or executing a production change, a release, a patch round or a maintenance window; deciding whether to roll back, freeze or lift a freeze
keywords: change management, canary, progressive rollout, feature flag, freeze, rollback criteria, maintenance window, patch cadence, blast radius, change request
priority: critical
related: slo-sli-error-budget.md, incident-response.md, templates/change-request-rollout-plan.md
---

# Change Management and Safe Rollout

**Load when:** anything in production is about to change. Pipelines and environments are in `devops-cicd`; Kubernetes rollout commands in `devops-kubernetes` (`kubectl-safe-ops`); Helm/Argo/Flux promotion in `devops-gitops-packaging`; OS patching mechanics in `devops-linux`; hypervisor operations in `devops-proxmox`. This file is the method that sits above them.

## Why this matters

About 70% of outages are due to changes in a live system (SRE Book, Introduction), and a majority of incidents at Google are triggered by binary or configuration pushes (Workbook, Canarying Releases). Best practice is automation that implements progressive rollouts, detects problems quickly and accurately, and rolls back safely; this limits the number of users and operations exposed to a bad change and removes human fatigue from repetitive steps. The error budget ([slo-sli-error-budget.md](slo-sli-error-budget.md)) is the governor: change pace follows budget, not the other way around.

## Release engineering principles (Workbook)

Reproducible builds, automated builds, automated tests, automated deployments (deployments are performed by computers, not humans), and small deployments (small self-contained changes are cheaper to roll back and to reason about). More frequent releases mean fewer changes per release and easier rollback.

## The change request (write before acting)

Template: [templates/change-request-rollout-plan.md](templates/change-request-rollout-plan.md). Required content:

1. **What and why**: the change, the service, the SLO at risk, the owner.
2. **Blast radius**: who and what is affected if it goes wrong; dependencies upstream and downstream.
3. **Type**: standard (pre-approved, repeatable, low risk), normal (reviewed), emergency (incident mitigation, reviewed after). Emergency changes during an incident are authorized by the incident commander ([incident-response.md](incident-response.md)).
4. **Rollout plan**: stages, percentages or batches, the bake time per stage, who watches what.
5. **Rollback criteria fixed in advance** (see below) and the exact rollback procedure, tested.
6. **Verification (PROOF)** commands and the SLIs to watch.
7. **Timing**: window, people reachable, no change right before an unattended period; the Google launch checklist lists "Mondays or Fridays" and external events as scheduling considerations.
8. **Communication**: who is told before, during, after.

## Progressive rollout

| Pattern | Use | Source status |
|---------|-----|---------------|
| **Canary** | Part of the service gets the change, for a limited time, and is compared with the control; the result decides whether to proceed | Verified: SRE Workbook, Canarying Releases |
| **Staged / batched rollout** | Zones, racks, nodes or percentages in sequence with checks in between; one node or one small batch first | SRE Book (progressive rollouts); launch checklist mentions staged rollouts |
| **Blue/green** | A parallel environment, traffic switched at once; fast rollback by switching back, double capacity cost | Practitioner pattern, not read at a primary source today |
| **Feature flag / dark launch** | Code ships disabled; exposure grows per cohort or percentage; kill switch without redeploy | Practitioner pattern, not read at a primary source today; the Workbook alerting chapter mentions dark launches as functionality outside any SLO |

### Canary design (Workbook)

A canary is a partial, time-limited deployment of a change plus its evaluation. The canary receives the change; the rest is the control. Requirements: a way to deploy to a subset, an evaluation process that decides good or bad, and integration of that decision into the release process. The goal is to detect bad releases with high confidence and pass good ones without false positives.

- **Budget impact is proportional to traffic exposed to the defect.** Worked example from the chapter: a candidate that fails 20% of requests, deployed everywhere, risks 20% errors; with a 5% canary population the overall error rate is 20% x 5% = 1%.
- Choose population and duration to be representative: size and duration large enough for a representative sample; enough traffic; time of day (performance defects usually show under load, so an off-peak canary may not trigger them); metrics that need time (queue depth) versus quick ones (query success).
- Duration must fit release cadence (a continuously deployed service needs short canaries).
- Run **one canary at a time**: simultaneous canaries make state hard to reason about and contaminate the signal.
- Use the simplest evaluation model that meets the need; compare canary against control for the same period, not against yesterday.
- The canary is not a substitute for tests; it catches what tests and test environments miss.

## Rollback criteria decided before the change

Write them into the change request. Examples of measurable criteria (numbers come from the service's SLO, not from this skill):

| Criterion | Example form |
|-----------|--------------|
| SLI breach | Error ratio above `X` for `Y` minutes in the canary, or above the control by more than `Z` |
| Latency | p99 above threshold for `Y` minutes |
| Saturation | Memory, queue depth or connection count above a stated limit |
| Burn rate | A fast-burn page fires ([burn-rate-alerting.md](burn-rate-alerting.md)) during the rollout |
| Functional | A named smoke test fails |
| Time | The change does not reach the target state within the allotted time |

Decision rule: if any criterion is met, roll back first and investigate after. Nobody argues the criterion mid-change; a change to the criterion needs the owner's sign-off recorded. A rollback is only real if its path was tested: database migrations that are not backward compatible, destroyed data, and external side effects are not undone by redeploying the old version; those changes need an expand/contract migration or a backup checkpoint (`devops-storage-backup`) before the go.

## Freeze windows

- **Budget-driven freeze**: when the budget for the window is exhausted, halt all changes except P0 fixes and security fixes until the service is back within SLO (SRE Workbook example error budget policy). Exceptions are decided by the named escalation owner.
- **Calendar freeze** (holidays, billing close, events, an unattended period): a team decision; publish dates, exception procedure, and who approves. The sources do not give default dates.
- **Lifting a freeze** is a production decision (format below).

## Maintenance windows and patch cadence

The sources do not prescribe a cadence; define one per class and record it:

| Class | Default proposed by this skill | Rule |
|-------|-------------------------------|------|
| Critical security fix (actively exploited) | As soon as validated, outside the normal window | Emergency change; canary first on one host |
| Routine OS/package updates | Weekly or fortnightly, in the maintenance window, canary host first | Same flow as any change |
| Kernel, hypervisor, cluster version upgrades | Scheduled window with rollback plan and backup checkpoint | One node at a time; verify quorum/health between nodes |
| Certificates, licences | Automated renewal with alert well before expiry | Treat a manual renewal as toil ([on-call-toil.md](on-call-toil.md)) |

Window rules: announce in advance, state the expected impact and duration, drain or fail over before touching a node, patch one failure domain at a time, verify with the user-facing SLI (not only service status), and close the window explicitly. Silences created for the window carry an expiry.

## ACTION / EFFECT / PROOF / WAIT-FOR-GO

Every production action produced by this method uses this block and stops at WAIT-FOR-GO. Examples:

**Rollback**
```
ACTION       roll back web to the previous release (tool-specific command, explicit target)
EFFECT       users see the previous version; restart of N pods/instances; non-reversible state (migrations, queued jobs) listed
PROOF        error ratio and latency back inside criteria for 10 minutes; version endpoint shows the old version
WAIT-FOR-GO  needs the incident commander / change owner go
```

**Failover**
```
ACTION       promote replica B / move VIP to node B (exact command, target)
EFFECT       connections drop for ~N seconds; writes may be lost if replication lag > 0 (current lag shown); node A must be fenced before it returns
PROOF        writes succeed on B; replication state shows A fenced; SLI healthy
WAIT-FOR-GO  yes - fencing confirmed first
```

**Restart**
```
ACTION       restart service S on host H (rolling, one at a time)
EFFECT       in-flight requests on H fail unless drained; cache is cold; dependent jobs retry
PROOF        health check passes; connection count recovers; no error burst after warm-up
WAIT-FOR-GO  yes
```

**Traffic shift**
```
ACTION       move X% of traffic from site A to B (weights in the load balancer / DNS / Gateway)
EFFECT       B receives X% more load; capacity headroom on B: shown; DNS TTL delays the shift for up to TTL
PROOF        B saturation under limit; user SLI unchanged; A drained
WAIT-FOR-GO  yes
```

**Freeze lift**
```
ACTION       lift the change freeze for service S
EFFECT       queued changes may flow; budget remaining: shown; first change goes through canary
PROOF        budget back within SLO or an explicit exception recorded by the policy's escalation owner
WAIT-FOR-GO  the error budget policy owner
```

An agent running as operator proposes the block and waits; it does not apply the action on its own initiative. A go covers that block only. Never stack a second fix on a broken state: roll back to the last good state first.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Rollback criteria written after the change starts | Debate during the incident, delayed rollback |
| Big-batch release "to save time" | One defect, large blast radius, hard rollback |
| Canary at off-peak | Load-dependent defects pass |
| Two canaries at once | Signal contamination |
| Redeploy-as-rollback with a non-reversible migration | Old code against new schema |
| Rollback of the cluster without reverting Git | The GitOps controller re-applies the change |
| Silences left after the window | Real alerts muted |

## Sources (read 2026-11-10)

- https://sre.google/workbook/canarying-releases/ (release engineering principles, canary definition, requirements, SLO/budget minimization and population/duration sections)
- https://sre.google/sre-book/introduction/ (change management, 70% of outages)
- https://sre.google/sre-book/testing-reliability/ (canary test as structured acceptance, incubation period)
- https://sre.google/sre-book/launch-checklist/ (scheduling, staged rollouts, canaries)
- https://sre.google/workbook/error-budget-policy/

## Not verified

- Blue/green and feature-flag guidance is practitioner knowledge; no primary source on either was read in this session.
- The Workbook canary chapter's metric-selection, evaluation-statistics and implementation sections were not read.
- Maintenance window and patch cadence defaults are this skill's proposals, not source figures; change request types (standard/normal/emergency) follow common ITIL-style practice and were not checked against ITIL documentation.
- The Google SRE Book chapter "Release Engineering" was not read.
