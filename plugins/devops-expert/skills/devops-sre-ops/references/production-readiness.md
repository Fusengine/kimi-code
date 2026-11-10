---
name: production-readiness
description: Production readiness review - objectives, the launch coordination checklist categories, how to run a review and what blocks a go-live
when-to-use: Before a new service, a major feature or a migration goes to production, or when taking over operations of an existing service
keywords: production readiness review, PRR, launch checklist, launch coordination, go-live, readiness, operational readiness
priority: high
related: slo-sli-error-budget.md, capacity-planning.md, runbooks.md, change-rollout.md, templates/prr-checklist.md
---

# Production Readiness Review

**Load when:** something is about to go live or change hands. Checklist: [templates/prr-checklist.md](templates/prr-checklist.md).

## Objectives (SRE Book, "The Evolving SRE Engagement Model")

A Production Readiness Review (PRR) is run by the operating team with the development team when production responsibility is requested. Its objectives:

1. Verify that the service meets accepted standards of production setup and operational readiness, and that the service owners are prepared to work with the operators.
2. Improve the reliability of the service in production and minimize the number and severity of incidents to be expected; a PRR targets all aspects of production the operators care about.

The aspects collectively called "production" in that chapter: system architecture and interservice dependencies; instrumentation, metrics and monitoring; emergency response; capacity planning; change management; performance (availability, latency, efficiency).

Scale the review to the service: a one-page checklist for a small internal service, a longer review with a sign-off for a user-facing or a dependency-heavy one. Services that do not justify full engagement still benefit from documentation and a short consultation, as the same chapter describes.

## Checklist categories (Google Launch Coordination Checklist, abridged original)

The original checklist groups launch questions into these categories; the template turns them into yes/no items for a self-hosted environment:

| Category | Asks about |
|----------|-----------|
| Architecture | Sketch, server types, request types from clients |
| Machines and datacenters | Capacity, N+2 redundancy, network QoS, new domain names, DNS load balancing |
| Volume, capacity and performance | Traffic and bandwidth estimates including the launch spike and mix six months out; load test and end-to-end test; capacity per site at maximum latency; storage capacity; impact on other services |
| System reliability and failover | What happens when a machine dies, a rack fails, a site goes offline, the network between sites fails; for each backend: how to detect its death and what to do; clean termination or restart without user impact; load balancing, rate limiting, timeout, retry and error handling; backup/restore and disaster recovery |
| Monitoring and server management | Internal state and end-to-end monitoring, alert management, monitoring the monitoring, financially important alerts and logs |
| Security | Security design review, code audit, authentication, TLS, pre-launch access control |
| Automation and manual tasks | Change control for servers, data and configs; release process, repeatable builds, canaries under live traffic, staged rollouts |
| Growth issues | Spare capacity, 10x growth, growth alerts, scalability bottlenecks, caching, sharding |
| External dependencies | Third-party systems, traffic volume, graceful degradation, not overrunning third parties |
| Schedule and rollout planning | Hard deadlines, external events, "Mondays or Fridays", standard operating procedures |

## Added by this skill (not in the original list)

The checklist predates modern practice in some areas; the template adds SLO and error budget definition ([slo-sli-error-budget.md](slo-sli-error-budget.md)), SLO-based alerts with linked runbooks ([burn-rate-alerting.md](burn-rate-alerting.md), [runbooks.md](runbooks.md)), a tested restore (`devops-storage-backup`), on-call ownership and escalation ([on-call-toil.md](on-call-toil.md)), and secrets handling (`devops-secrets`, `security-expert` for the audit).

## Running the review

1. **Intake**: owner, purpose, dependencies, users, expected load, target SLO, rollout date.
2. **Evidence, not assertions**: each checklist item has a link, a command output or a test result; "yes" without evidence is "unknown".
3. **Walk the failure modes**: for each dependency and each failure domain, ask what the user sees and how it is detected and mitigated. Use the troubleshooting model ([troubleshooting-method.md](troubleshooting-method.md)) on a paper outage.
4. **Rate findings**: blocker (no go-live until closed), required (closed within an agreed time), advisory.
5. **Sign-off** by the owner and by the operator; record accepted risks with an owner and an expiry date.
6. **Follow up**: findings are tracked as tickets; re-review after the first incident or after major change.

Typical blockers: no restore tested, no alerting for the user-facing SLI, no rollback path, single point of failure with no accepted-risk record, no owner on call, secrets in plain text, capacity unproven by a load test.

## Sources (read 2026-11-10)

- https://sre.google/sre-book/evolving-sre-engagement-model/ (SRE engagement, production aspects, PRR objectives; the PRR process and later phases were not read in full)
- https://sre.google/sre-book/launch-checklist/ (Google Launch Coordination Checklist, circa 2005, abridged by the authors)

## Not verified

- The PRR process steps after the objectives (analysis, improvement, training, onboarding) and the "Frameworks and SRE Platform" part of the chapter were not read in full.
- The blocker/required/advisory rating and the evidence rule are this skill's method.
- The Launch Coordination Engineering chapter ("Reliable Product Launches at Scale") was not read.
