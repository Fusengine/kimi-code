# Production Readiness Review: <service>

Categories follow the Google Launch Coordination Checklist (abridged original); items marked [added] come from this skill. Each item needs evidence (link, command output, test result). "Yes" without evidence counts as unknown.

Owner: <team>   Reviewer(s): <names>   Date: <>   Target go-live: <>   Review result: go | go with conditions | no-go

| Rating | Meaning |
|--------|---------|
| B | Blocker: no go-live until closed |
| R | Required: closed by an agreed date |
| A | Advisory |

## Architecture
- [ ] Architecture sketch, server types, client request types, dependency map attached
- [ ] Users, journeys and expected load stated

## Machines, sites and redundancy
- [ ] Redundancy level stated (N+1 / N+2) per failure domain (node, rack, site, hypervisor host, storage)
- [ ] New DNS names, certificates and load-balancing set up; certificate renewal automated
- [ ] Network QoS and bandwidth needs known

## Volume, capacity and performance
- [ ] Traffic and bandwidth estimate including launch spike and mix, six months out
- [ ] Load test run; capacity per unit at the latency SLO recorded (capacity-planning.md)
- [ ] End-to-end test done; storage capacity and growth planned
- [ ] Impact on other services understood

## System reliability and failover
- [ ] Behavior known when: a machine dies; a rack/host fails; a site goes offline; the network between sites fails
- [ ] For each backend: death detected, response defined, clean restart/termination without user impact
- [ ] Load balancing, rate limiting, timeouts, retries (backoff and jitter), error handling reviewed
- [ ] Backup and restore defined; restore tested with logged evidence [added] (devops-storage-backup)
- [ ] Disaster recovery plan and rehearsal date

## Monitoring and server management
- [ ] Internal state and end-to-end monitoring in place
- [ ] SLI, SLO and error budget policy approved [added] (templates/slo-definition.md, error-budget-policy.md)
- [ ] Burn-rate alerts live with runbook links [added] (templates/burn-rate-alerts.rules.yml)
- [ ] Alert management defined; the monitoring itself is monitored
- [ ] Financially or legally important alerts and logs identified
- [ ] Logs retained and searchable; no secrets in logs

## Security
- [ ] Security design review done; authentication and TLS reviewed
- [ ] Pre-launch access control in place
- [ ] Secrets in a secret store, rotation defined [added] (devops-secrets; audit via security-expert)

## Automation, change and release
- [ ] Servers, data and configs changed under change control; infrastructure as code
- [ ] Reproducible builds, tested release process, rollback tested
- [ ] Canary under live traffic and staged rollout available (change-rollout.md)
- [ ] Standard operating procedures and runbooks written and tested [added] (templates/runbook.md)

## Operations ownership [added]
- [ ] On-call owner and escalation chain named; rotation sustainable (on-call-toil.md)
- [ ] Incident process and severity levels known to the team
- [ ] Maintenance window and patch cadence defined

## Growth
- [ ] Spare capacity, 10x growth analysis, growth alerts
- [ ] Scalability bottlenecks and caching/sharding plan noted

## External dependencies
- [ ] Third-party systems, quotas and traffic volume listed
- [ ] Graceful degradation defined; no accidental overrun of third parties

## Schedule and rollout planning
- [ ] Hard deadlines and external events checked; not scheduled on a Monday or Friday without reason, nor before an unattended period
- [ ] Rollout plan and rollback criteria written (templates/change-request-rollout-plan.md)

## Findings

| # | Finding | Rating (B/R/A) | Owner | Due | Status |
|---|---------|----------------|-------|-----|--------|

## Accepted risks

| Risk | Owner | Expiry date | Mitigation |
|------|-------|-------------|------------|

## Sign-off

Service owner: <name, date>     Operator: <name, date>
