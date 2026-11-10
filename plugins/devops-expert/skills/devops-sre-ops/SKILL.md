---
name: devops-sre-ops
description: Use when defining or reviewing reliability targets and operations practice - SLI/SLO/SLA and error budgets (and the error budget policy), multi-window multi-burn-rate alerts, incident response (roles, severity, mitigate first, handoff), on-call rotation and toil, blameless postmortems, change management and safe rollout (canary, freeze, rollback criteria decided in advance), runbooks, capacity planning, production readiness reviews, DORA metrics, maintenance windows and patch cadence, game days, and structured troubleshooting of an unknown outage. Not for metrics/logs/tracing tooling (devops-observability), backup/restore and DR mechanics (devops-storage-backup), pipeline implementation (devops-cicd), security incident response (security-expert) or FinOps.
versions:
  google-sre-book: "Site Reliability Engineering, O'Reilly 2016, web edition at sre.google/sre-book (page copyright 2017), read 2026-11-10"
  google-sre-workbook: "The Site Reliability Workbook, O'Reilly 2018, web edition at sre.google/workbook, read 2026-11-10"
  dora: "five-metric software delivery model; dora.dev guide updated 2026-01-05, history page updated 2026-01-02"
  prometheus-rules: "rule file syntax from prometheus.io docs (latest), read 2026-11-10; promtool not run (not installed on authoring host)"
  pagerduty-response-docs: "response.pagerduty.com severity levels and incident roles, read 2026-11-10"
  principles-of-chaos: "principlesofchaos.org, read 2026-11-10"
references:
  - references/slo-sli-error-budget.md
  - references/burn-rate-alerting.md
  - references/incident-response.md
  - references/on-call-toil.md
  - references/postmortem.md
  - references/change-rollout.md
  - references/runbooks.md
  - references/capacity-planning.md
  - references/production-readiness.md
  - references/dora-metrics.md
  - references/troubleshooting-method.md
  - references/game-days.md
  - references/templates/slo-definition.md
  - references/templates/error-budget-policy.md
  - references/templates/burn-rate-alerts.rules.yml
  - references/templates/incident-checklist.md
  - references/templates/postmortem.md
  - references/templates/runbook.md
  - references/templates/change-request-rollout-plan.md
  - references/templates/prr-checklist.md
  - references/templates/oncall-handoff.md
related-skills:
  - devops-observability
  - devops-storage-backup
  - devops-cicd
  - devops-kubernetes
  - devops-gitops-packaging
  - devops-proxmox
  - devops-linux
  - devops-secrets
---

<objective>
Covers the reliability-engineering and day-2 operations method for an IT/DevOps
agent: what to measure and promise (SLI, SLO, error budget and its policy), how
to alert on it (multi-window multi-burn-rate), how to respond (incidents,
on-call, troubleshooting), how to learn (postmortems, game days), how to change
production safely (rollout, rollback criteria, freezes, maintenance windows),
and how to prepare (runbooks, capacity, production readiness, toil, DORA).
It is method, not tooling. Telemetry stacks belong to devops-observability;
backup, restore and disaster recovery mechanics to devops-storage-backup;
pipelines to devops-cicd; security incidents to security-expert.
</objective>

# DevOps SRE Operations

## Agent Workflow (MANDATORY)

Before applying this method to a real system, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find existing SLO documents, alert rules, runbooks, postmortems, on-call and change records in the repo
2. **research-expert** - verify any figure or tool option against the primary source (sre.google, dora.dev, prometheus.io) before relying on it
3. **mcp__context7__query-docs** - only where a library or tool is involved (Prometheus rule syntax, Alertmanager); the method itself has no library

Then read the live state read-only (current alerts, recent changes, budget remaining) before proposing anything.
After writing files in a repo, run **sniper**.

## Sources and currency (checked 2026-11-10)

Method statements trace to the Google SRE Book and SRE Workbook (online editions), DORA (dora.dev), PagerDuty's public incident response documentation, Prometheus documentation and principlesofchaos.org. Each reference ends with the URLs read and a "Not verified" list: figures that are Google-scale (on-call staffing, response times) are labeled as such; defaults proposed by this skill (update cadence, patch cadence, toil log length) are labeled as the skill's own.

## Overview

| Area | Decision in one line |
|------|----------------------|
| **SLO** | 100% is the wrong target; SLI = good events / total events; error budget = 1 - SLO; an SLO without a signed error budget policy has no teeth |
| **Alerting** | Page on budget burn: 14.4x over 1 h and 5 min, 6x over 6 h and 30 min; ticket on 1x over 3 d and 6 h (99.9% SLO, 30 days); short window = 1/12 of the long one |
| **Incidents** | Declare early; separate IC, ops, communications; mitigate before root cause; hand off command explicitly |
| **On-call** | Pages are urgent and actionable; at most about 2 incidents per shift; sustainable rotation; handoff in writing |
| **Postmortem** | Blameless, quantified impact, timeline in UTC, contributing factors, actions with type and one owner |
| **Change** | Small, staged, canary first; rollback criteria written before the change; budget exhausted = freeze except P0 and security |
| **Production actions** | Always ACTION / EFFECT / PROOF / WAIT-FOR-GO; the agent proposes, a human says go |
| **Toil** | Keep below 50% of time; measure, then design away, automate or document |
| **DORA** | Five metrics (lead time, deployment frequency, failed deployment recovery time, change fail rate, deployment rework rate); MTTR is the old name |

## Critical Rules

1. **Measure before promising** - an SLO needs a defined SLI, a measurement point, an owner and a policy ([slo-sli-error-budget.md](references/slo-sli-error-budget.md))
2. **Alert on user-visible budget burn, with both windows** - never a bare `for:` on a short window ([burn-rate-alerting.md](references/burn-rate-alerting.md))
3. **Mitigate first, then find the cause** - stop the bleeding, preserve evidence ([incident-response.md](references/incident-response.md), [troubleshooting-method.md](references/troubleshooting-method.md))
4. **One change at a time, one commander** - only the operations lead changes production during an incident
5. **Rollback criteria are decided before the change**, in numbers, in the change request ([change-rollout.md](references/change-rollout.md))
6. **Every production action uses ACTION / EFFECT / PROOF / WAIT-FOR-GO** and waits for the go; the agent never rolls back, fails over, restarts, shifts traffic or lifts a freeze on its own initiative
7. **Blameless, with owners** - postmortems fix systems, each action item has a type, an owner and a ticket ([postmortem.md](references/postmortem.md))
8. **No invented figures** - a number not in a verified source is labeled as this skill's default or marked not verified; derive burn-rate and budget values with the formulas, show the arithmetic
9. **Never print secrets** - runbooks and incident documents name the store path, not the value (devops-secrets)

## Architecture

```
reliability/
├── slos/<service>.md              # filled slo-definition.md, one per service
├── policy/error-budget-policy.md  # signed by the product owner
├── alerts/<service>.rules.yml     # recording + burn-rate alert rules, promtool-checked
├── runbooks/<alert-or-operation>.md
├── incidents/<id>.md              # live document, then the postmortem
├── changes/<chg-id>.md            # change request and rollout plan
├── readiness/<service>-prr.md
└── oncall/handoff-<date>.md
```

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **SLI/SLO/SLA, error budget** | [slo-sli-error-budget.md](references/slo-sli-error-budget.md) | Setting targets, choosing SLIs per service type, budget arithmetic, the policy |
| **Burn-rate alerting** | [burn-rate-alerting.md](references/burn-rate-alerting.md) | Turning an SLO into pages and tickets, noisy or silent alerts, low traffic |
| **Incident response** | [incident-response.md](references/incident-response.md) | Anything broken in production, roles, severity, communication, handoff |
| **On-call and toil** | [on-call-toil.md](references/on-call-toil.md) | Rotation, paging rules, escalation, toil measurement |
| **Postmortems** | [postmortem.md](references/postmortem.md) | After an incident, reviewing a draft, action items not closing |
| **Change and rollout** | [change-rollout.md](references/change-rollout.md) | Any production change, canary, freezes, rollback, patch windows |
| **Runbooks** | [runbooks.md](references/runbooks.md) | Writing, testing, automating a procedure |
| **Capacity planning** | [capacity-planning.md](references/capacity-planning.md) | Forecast, headroom, load testing, order dates |
| **Production readiness** | [production-readiness.md](references/production-readiness.md) | Before go-live or taking over a service |
| **DORA metrics** | [dora-metrics.md](references/dora-metrics.md) | Measuring delivery performance with the current definitions |
| **Troubleshooting** | [troubleshooting-method.md](references/troubleshooting-method.md) | Unknown cause: what changed, blast radius, hypothesis and test |
| **Game days** | [game-days.md](references/game-days.md) | Testing runbooks and failover, chaos experiments (pointer) |

### Templates

| Template | When to Use |
|----------|-------------|
| [slo-definition.md](references/templates/slo-definition.md) | Writing the SLO document for a service |
| [error-budget-policy.md](references/templates/error-budget-policy.md) | Formalizing what happens when the budget is spent |
| [burn-rate-alerts.rules.yml](references/templates/burn-rate-alerts.rules.yml) | Prometheus recording and burn-rate alert rules (99.9% / 30 d), placeholders to replace |
| [incident-checklist.md](references/templates/incident-checklist.md) | Live incident document with roles, timeline and close-out |
| [postmortem.md](references/templates/postmortem.md) | Blameless postmortem |
| [runbook.md](references/templates/runbook.md) | Runbook for an alert or operation |
| [change-request-rollout-plan.md](references/templates/change-request-rollout-plan.md) | Change with staged rollout and rollback criteria |
| [prr-checklist.md](references/templates/prr-checklist.md) | Production readiness review |
| [oncall-handoff.md](references/templates/oncall-handoff.md) | End-of-shift handoff note |

## Quick Reference

```text
error budget      = 1 - SLO                          99.9% / 30 d -> 0.001 -> 43.2 min of full outage
burn rate         = error_rate / (1 - SLO)           alert threshold = burn_rate * (1 - SLO)
budget consumed   = burn_rate * window / period      14.4 * 1h / 720h = 2%    6 * 6h / 720h = 5%    1 * 72h / 720h = 10%
time to exhaust   = period / burn_rate               720h / 14.4 = 50h        720h / 6 = 5 d
max burn rate     = 1 / (1 - SLO)                    90% SLO -> 10, so a 14.4 page can never fire
```

```bash
promtool check rules references/templates/burn-rate-alerts.rules.yml   # exit 0 valid, 1 error
```

Production action block (every rollback, failover, restart, traffic shift, freeze lift):

```text
ACTION       exact command with explicit target
EFFECT       what changes, blast radius, what cannot be undone
PROOF        check that it worked + check that nothing else broke
WAIT-FOR-GO  who gives the go; stop here
```

## Best Practices

### DO
- Write the error budget policy before the first SLO miss and get it signed by the product owner
- Link a runbook in every paging alert's annotation; test runbooks in game days
- Use one alert parameter set for all services; bucket request classes instead of tuning each endpoint
- Record the budget consumed in every postmortem and link incidents to the deployments that caused them
- Keep incident documents and runbooks outside the system being repaired

### DON'T
- Set a 100% target, or alert on a bare `for:` duration of a short window
- Debug as the incident commander, or let several people change production at once
- Argue rollback criteria during the change, or roll back a cluster without reverting Git when GitOps owns it
- Report MTTR as a DORA metric, or set DORA metrics as team goals
- Duplicate sibling content: telemetry configuration is devops-observability, restore tests and DR are devops-storage-backup
