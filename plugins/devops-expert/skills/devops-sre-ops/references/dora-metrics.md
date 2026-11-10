---
name: dora-metrics
description: DORA software delivery performance metrics as currently defined (five metrics in two groups), history of the definition changes, how to collect them from Git, CI and incident data, and the misuse pitfalls
when-to-use: Measuring delivery performance, reviewing a dashboard that still uses the four keys or MTTR, choosing what to track for a team or service
keywords: DORA, deployment frequency, change lead time, failed deployment recovery time, change fail rate, deployment rework rate, MTTR, four keys, throughput, instability
priority: medium
related: change-rollout.md, slo-sli-error-budget.md, postmortem.md
---

# DORA Metrics (current definition set)

**Load when:** someone asks to measure delivery performance or quotes "the four keys / MTTR". Pipeline instrumentation is in `devops-cicd`; dashboards in `devops-observability`.

## Current definition set

DORA (as published at dora.dev, guide last updated 2026-01-05) identifies **five** software delivery performance metrics, in two groups:

| Group | Metric | Definition (DORA wording, shortened) |
|-------|--------|--------------------------------------|
| Throughput | **Change lead time** | Time for a change to go from committed to version control to deployed in production |
| Throughput | **Deployment frequency** | Number of deployments over a period, or the time between deployments |
| Throughput | **Failed deployment recovery time** | Time to recover from a deployment that fails and requires immediate intervention |
| Instability | **Change fail rate** | Ratio of deployments that require immediate intervention following a deployment, likely resulting in a rollback or a hotfix |
| Instability | **Deployment rework rate** | Ratio of deployments that are unplanned but happen as a result of an incident in production |

The metrics are leading indicators for organizational performance and employee well-being, and lagging indicators for software development and delivery practices. DORA's research reports that speed and stability are not trade-offs: top performers do well across all five. They apply to one application or service at a time.

## What changed (history page, 2026-01-02)

| Year | Change |
|------|--------|
| 2014 | Four variables: deployment frequency, lead time for changes, mean time to recover (MTTR), change fail rate; change fail rate did not correlate into the single construct that year |
| 2015 | Model of throughput (deployment frequency, lead time) and stability (MTTR, change fail rate) |
| 2018 | "Availability" added as an operational measure |
| 2021 | Availability broadened to "reliability" (latency, performance, scalability too); described as an operational metric, not a delivery metric (the 2021 report wrongly called it the "fifth metric") |
| 2023 | MTTR renamed and redefined as **failed deployment recovery time**, limited to failures caused by a change to production, not external events such as a data center outage |
| 2024 | **Deployment rework rate** introduced; five delivery metrics in two factors: throughput and instability |

Consequences for agents: do not report "MTTR" as a DORA metric any more (the right metric is failed deployment recovery time); do not call it "four keys" without noting the change; reliability (SLO attainment) is tracked separately with the SLO method ([slo-sli-error-budget.md](slo-sli-error-budget.md)).

## Collecting the data (self-hosted setup)

| Metric | Source | Computation |
|--------|--------|-------------|
| Change lead time | Git commit timestamp and a production deployment event (CI job, Argo CD/Flux sync, release tag) | For each change: deploy time minus first commit time (or merge time; state which); report the median and a high percentile |
| Deployment frequency | Production deployment events | Count per week per service |
| Failed deployment recovery time | Incident or rollback record linked to a deployment | Time from deployment flagged as failed to restoration of service |
| Change fail rate | Deployment events and incident/rollback/hotfix records | Failed deployments / all deployments in the period |
| Deployment rework rate | Deployment events and incident links | Unplanned deployments caused by an incident / all deployments |

Rules: define "deployment", "production", "failed" and the clock start once per service and write it down; link incidents to the deployments that caused them (a field in the incident document and in the postmortem, [postmortem.md](postmortem.md)); compute per service, never blended across teams.

## Pitfalls (DORA)

- Setting the metrics as goals (Goodhart's law): teams will game them.
- One metric to rule them all: use several, with some tension between them.
- Using industry as a shield against improving.
- Comparing disparate systems (mobile app vs mainframe) or competing across teams.
- Siloed ownership: share all five across development, operations and release.
- Focusing on measurement at the expense of improvement: start with conversation and DORA's Quick Check before building integrations.

Improvement lever named by DORA: reduce batch size of changes; smaller changes are easier to move and easier to recover from ([change-rollout.md](change-rollout.md)).

## Sources (read 2026-11-10)

- https://dora.dev/guides/dora-metrics/ (page states "Last updated: January 5, 2026")
- https://dora.dev/insights/dora-metrics-history/ (page states "Last updated: January 2, 2026")

## Not verified

- Performance bands (elite/high/medium/low) and the latest annual report's benchmark figures were not read; no band is stated here.
- The measurement table (data sources, median plus percentile, merge-time versus commit-time choice) is this skill's guidance, not DORA's tooling advice; DORA's Quick Check and source-available tools were not evaluated.
- Whether DORA updated its definitions after 2026-01-05 was not checked beyond these two pages.
