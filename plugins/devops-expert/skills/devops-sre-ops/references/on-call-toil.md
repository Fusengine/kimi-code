---
name: on-call-toil
description: On-call practice - rotation sizing, primary and secondary, escalation, paging rules, pager load limits, handoff - and toil definition, measurement and reduction
when-to-use: Designing or fixing an on-call rotation, an alert fires too often, a team drowns in manual operational work, deciding what to automate
keywords: on-call, rotation, escalation, primary, secondary, paging, pager load, toil, 50 percent, automation, interrupts, handoff
priority: high
related: burn-rate-alerting.md, runbooks.md, incident-response.md, templates/oncall-handoff.md
---

# On-Call and Toil

**Load when:** a rotation is being set up, pages are frequent, or manual work is eating engineering time. Alert routing configuration (Alertmanager, PagerDuty/Opsgenie integrations) belongs to `devops-observability`.

## Rules for what may page

Only two ways exist to get a human to act: a **page** (urgent) or a **ticket** (not urgent). Every page should be urgent, actionable and need human judgment now (this checklist is the skill's own, consistent with the Workbook alerting chapter, which states that pages and tickets are the only valid ways). Test each paging alert:

| Question | If the answer is no |
|----------|---------------------|
| Is a user, an SLO or data at risk soon? | Make it a ticket or delete it |
| Can the responder do something about it right now? | Fix the alert or automate the response |
| Is it new information, not a duplicate of an alert already firing? | Inhibit or merge |
| Does a runbook exist and is it linked in the alert annotation? | Write it before enabling the page ([runbooks.md](runbooks.md)) |

Symptom-based (SLO burn) alerts page; cause-based alerts (disk 80%, one node down with redundancy left) are tickets unless a hard deadline exists. SLO alert design: [burn-rate-alerting.md](burn-rate-alerting.md).

## Rotation design (SRE Book "Being On-Call", Google figures)

- **Response time** is agreed with the business: typical values are 5 minutes for user-facing or highly time-critical services and 30 minutes for less time-sensitive systems. It follows from the availability target: 4 nines (99.99%) leaves about 13 minutes of downtime per quarter, so reaction must be in the order of minutes.
- **Primary and secondary**: the secondary can be a fall-through for pages the primary misses, or can take non-urgent operational work; two related teams may cover each other as secondary.
- **Quantity balance**: at least 50% of an SRE's time is engineering; of the rest, at most 25% on-call, up to 25% other operational work. With always-on primary plus secondary and week-long shifts, that implies at least 8 engineers for a single-site team, or 6 per site for a dual-site team (follow-the-sun avoids night shifts, at the cost of coordination).
- **Quality balance**: average incident handling including root-cause work, remediation and postmortem takes about 6 hours, so at most 2 incidents per 12-hour shift; the median number of incidents per shift should be 0. A component that pages daily will cause more incidents than the team can absorb. If the limit is exceeded for a quarter, put corrective measures in place.
- **Compensation**: out-of-hours work should be compensated (time off in lieu or pay); the cap doubles as a limit on how much on-call any one person takes.
- **Psychological safety**: on-call engineers get procedures and escalation paths; the goal is never reliability at the expense of the on-call engineer's health.

Small teams and home labs: the sources say the concepts apply at any size; with fewer people, reduce the paging surface instead (fewer, SLO-based pages; automatic recovery; clear "business hours only" tiers) and agree explicitly on what is NOT covered out of hours.

## Escalation

Write the chain down: primary -> secondary -> service owner/engineering lead -> incident commander (major incidents). State the acknowledgement time after which a page escalates automatically (use the response time of the service). An on-call engineer who needs a second team, or is stuck after an hour, declares an incident ([incident-response.md](incident-response.md)). Never hesitate to escalate: PagerDuty's rule is that it is better to have a responder and not need them.

## Shift handoff

At the end of each shift hand over in writing and, if anything is active, live: open incidents and their state, silences and temporary mitigations with expiry, changes in flight, alerts that fired and what was learned, known risks for the next 24 hours. Template: [templates/oncall-handoff.md](templates/oncall-handoff.md).

## Operational load beyond pages

Tickets, interrupts and releases also consume on-call time. Route non-urgent requests to a queue read by the person on duty (not to individuals), so the load is visible and shared.

## Toil

**Definition (SRE Book "Eliminating Toil"):** work tied to running a production service that tends to be manual, repetitive, automatable, tactical, devoid of enduring value, and that scales linearly with service growth. Not every toil task has all attributes; the closer a task is to them, the more likely it is toil.

| Attribute | Test |
|-----------|------|
| Manual | Even running a script by hand is toil time (hands-on time counts, not elapsed time) |
| Repetitive | First or second time is not toil; the Nth time is |
| Automatable | A machine could do it, or the need could be designed away; if human judgment is essential, probably not toil |
| Tactical | Interrupt-driven, reactive (handling pager alerts is toil) |
| No enduring value | The service is in the same state after the task |
| O(n) with growth | Work scales with users, traffic or size |

Not toil: overhead (meetings, HR, goals), and grungy work with lasting value (cleaning up alert configuration).

**Target:** keep toil below 50% of each engineer's time; at least 50% on engineering that reduces future toil or adds features. Lower bound from on-call alone: one week primary plus one week secondary per cycle gives 2/6 = 33% in a 6-person rotation and 2/8 = 25% in an 8-person rotation. Google's survey average was about 33%. Persistent excess means: spread the load, find engineering projects, or re-staff.

### Measure it

1. Keep a toil log for 2 to 4 weeks (the length is this skill's suggestion): each entry has date, task, minutes, source (page, ticket, release, manual request, interrupt).
2. Sum minutes per task class; rank by `frequency x minutes`.
3. Per top class compute: eliminate (design away), automate (script, controller, pipeline), or reduce (self-service, better defaults, fewer alerts).
4. Re-measure the share of toil every quarter; record the trend, not a one-time number.

### Reduce it (order of preference)

1. **Design it away**: remove the need (auto-renewal of certificates, self-healing restarts, retries, capacity headroom).
2. **Automate it**: infrastructure as code and configuration management (`devops-iac`, `devops-ansible`), pipelines (`devops-cicd`), automatic remediation with a limited blast radius.
3. **Make it self-service**: a request template or a pipeline anyone with rights can run.
4. **Document it**: a runbook is the minimum while automation is pending ([runbooks.md](runbooks.md)).

Automate only what is understood and repeated; a first-time or second-time task is not yet toil. Automation of production changes follows the safe-change protocol: dry run, canary, rollback ([change-rollout.md](change-rollout.md)).

## Sources (read 2026-11-10)

- https://sre.google/sre-book/being-on-call/
- https://sre.google/sre-book/eliminating-toil/
- https://sre.google/workbook/on-call/ (introduction and recap of the first book only; the example setups, pager-load anatomy and the later sections were not read)
- https://sre.google/workbook/alerting-on-slos/ (pages and tickets footnote)
- https://response.pagerduty.com/during/during_an_incident/ (escalate early)

## Not verified

- The Workbook On-Call chapter's pager-load analysis and strategies to cut load were not read.
- The 5 / 30 minute response times, 8 / 6 engineer minimums and the 25% on-call cap are Google SRE figures for large, 24/7 services; this skill gives no figure for a different context.
- The paging checklist table, the 2-to-4-week toil log and the escalation chain format are recommendations of this skill built from the sources, not source quotes.
- How Alertmanager or an on-call vendor implements the escalation timers was not read (`devops-observability`).
