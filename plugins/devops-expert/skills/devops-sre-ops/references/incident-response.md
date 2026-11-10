---
name: incident-response
description: Incident response method - when to declare, roles (incident commander, operations lead, communications lead, scribe), severity levels, communication cadence, mitigate before root cause, live handoff, closing, with ACTION / EFFECT / PROOF / WAIT-FOR-GO for production mitigations
when-to-use: A production service is degraded or down, an alert needs triage, a team needs an incident process, or a mitigation (rollback, failover, restart, traffic shift) is on the table
keywords: incident, incident commander, ops lead, communications lead, scribe, severity, SEV, mitigation, rollback, handoff, war room, incident document, declare
priority: critical
related: troubleshooting-method.md, postmortem.md, change-rollout.md, on-call-toil.md, templates/incident-checklist.md
---

# Incident Response

**Load when:** something in production is broken or about to be. Security incidents (breach, compromise, leaked credential) follow `security-expert`, not this file; data restore mechanics are in `devops-storage-backup`.

## Principles (SRE Book "Managing Incidents", SRE Workbook "Incident Response")

Unmanaged incidents spiral for three reasons: sharp focus on the technical problem by the only responder, poor communication, and freelancing (changes made without coordination). The remedy is a small framework based on the Incident Command System, with the "three Cs": **coordinate** the response, **communicate** with responders, the organization and the outside, **maintain control**. Basic principles: keep a clear line of command, designate clearly defined roles, keep a working record as you go, declare incidents early and often.

## When to declare

Declare early; it is cheaper to close a declared incident quickly than to start the framework hours in. Any one true is enough (SRE Book guideline):

- A second team must be involved to fix it.
- The outage is visible to customers.
- It is unsolved after an hour of concentrated analysis.

Also declare when a burn-rate page shows a fast burn ([burn-rate-alerting.md](burn-rate-alerting.md)). Incident skills atrophy: use the same framework for planned multi-team changes and in game days ([game-days.md](game-days.md)).

## Roles

| Role | Does | Must not |
|------|------|----------|
| **Incident Commander (IC)** | Holds the high-level state, assigns roles, decides, removes roadblocks; by default holds every role not delegated; the person who declares usually starts as IC | Run commands, read graphs or logs (delegate); decisions as IC are final during the incident |
| **Operations lead (Ops)** | Applies operational tools to mitigate and resolve; the only group modifying the system during the incident | Change things the IC has not agreed; freelance |
| **Communications lead** | Public face: periodic updates to responders and stakeholders, handles inquiries, may keep the incident document current | Debug |
| **Planning / scribe** | Files bugs, tracks divergence from normal so it can be reverted, arranges handoffs, notes timestamps and decisions | Decide |
| **Subject matter experts** | Investigate, announce findings and suggested actions to the IC, act only when told | Act on their own suggestion before the IC says go |

If the load on a role grows, ask the IC for more staff and delegate (sub-incidents are allowed). If the incident shrinks, the communications role collapses back into the IC. A solo operator (home lab, one-person team) still plays the roles in sequence: write the incident document first, because it is the substitute for the missing people.

## Severity levels

Define severities by user impact, in numbers, before the incident. The PagerDuty documented model (use as a starting scale and make it specific with percentages of users or accounts affected):

| Level | Meaning (generic) | Response |
|-------|-------------------|----------|
| SEV-1 | Critical, actively impacting a large number of users, or severe impairment breaking an SLA, or customer-data-exposing vulnerability | Major-incident response, IC paged, executive and public notification |
| SEV-2 | Critical issue impacting many users' ability to use the product | Major-incident response, IC paged |
| SEV-3 | Partial loss of function, not most users; likely to become SEV-2 if untouched; no redundancy left | High-urgency page to the service team, top priority, roll back if tied to a recent deployment |
| SEV-4 | Minor issue, users can still use the product (single node of a cluster, delayed job) | Low-urgency page, first priority above normal tasks |
| SEV-5 | Cosmetic or non-impacting bug | Ticket |

Rules: anything above SEV-3 is a major incident; if unsure between two levels, treat it as the higher one and review in the postmortem; a lower severity can still trigger the process when a coordinated response is needed; higher severity justifies riskier mitigations.

## Mitigate first, root-cause later

The first move in a major outage is to make the system work as well as it can, not to find the cause: divert traffic from the broken cluster, shed load to prevent a cascade, disable a subsystem, roll back the last change. Preserve evidence (logs, state dumps) while you do it. If data corruption may be spreading, freezing the system can beat letting it continue. Root cause comes after service is restored; the method is in [troubleshooting-method.md](troubleshooting-method.md). The PagerDuty IC guide follows the same order: size up (symptoms, scope), stabilize (list actions with their risk, decide, check for strong objections, assign with a time to report back), then follow through.

Typical mitigations by symptom (PagerDuty examples): bad deployment -> roll back; stuck or crashed web application -> rolling restart; event flood -> verify throttling, adjust manually; data center outage -> verify automation removed the bad site; degraded behavior without load -> gather forensic data (heap dumps) then consider a rolling restart.

### Mitigation format (every production action)

```
ACTION       what exactly, on which target (context, host, namespace, service ID), the command
EFFECT       what changes for users and the system; blast radius; what cannot be undone
PROOF        the check that shows it worked (the SLI recovering, health endpoint, error ratio below the threshold) and the check that shows nothing else broke
WAIT-FOR-GO  stop; the incident commander (or the user, when the agent is the operator) says go
```

Example (rollback of a Kubernetes Deployment; command semantics in `devops-kubernetes` / `kubectl-safe-ops`):

```
ACTION       kubectl --context prod-eu -n shop rollout undo deploy/web --to-revision=41
EFFECT       web pods restart on revision 41 (previous image); ConfigMap changes are not rolled back; GitOps will re-apply Git unless the offending commit is reverted too
PROOF        rollout status complete; 5xx ratio on the Gateway under 0.1% for 10 minutes; budget burn alert resolves
WAIT-FOR-GO  yes - revert commit abc123 in Git in the same step
```

An agent never runs a rollback, failover, restart or traffic shift on its own initiative: it proposes this block and waits. The decision on what is allowed without a go is the IC's, recorded in the incident document before the incident.

## Communication

- One **command post**: a chat channel or call with a log (a chat channel is a record that feeds the postmortem). Keep it off the system being repaired.
- One **live incident document**, kept by the IC or scribe, edited by several people, key facts at the top: current state, impact, who holds which role, timeline, hypotheses tried, actions in flight and their owners. Template: [templates/incident-checklist.md](templates/incident-checklist.md).
- **Status updates**: the communications lead sends periodic updates to responders and stakeholders. The sources do not fix an interval. Defaults this skill proposes (not from a source): major incident every 30 minutes, SEV-3 every 60 minutes, plus an update on every state change (mitigated, resolved, severity change). Each update states: impact, what is known, what is being tried, next update time.
- Customer-facing wording is the communications lead's job; PagerDuty's rule is "if in doubt, post it out".
- Responders keep the IC informed of any extra action they take and prioritize tasks the Ops lead delegates.

## Handoff

Hand off command explicitly and live. The outgoing IC says the equivalent of "you are now the incident commander, okay?" and stays on until the incoming IC acknowledges; everyone is told who leads. Update the incoming IC on the incident document, not from memory. See also [templates/oncall-handoff.md](templates/oncall-handoff.md) for the end-of-shift note.

## Closing

1. Confirm recovery by the SLI, not by the absence of alerts.
2. Announce the end; move non-urgent discussion out of the live channel; the communications lead closes the loop with stakeholders.
3. List clean-up: temporary mitigations to revert (planning role tracked the divergence), silenced alerts to restore, feature flags to restore.
4. Decide on a postmortem using the criteria in [postmortem.md](postmortem.md) (user-visible downtime, data loss, on-call intervention such as rollback or rerouting, long resolution time, monitoring failure) and record the budget consumed.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Waiting to declare "until we are sure" | Framework starts hours late; responders collide |
| IC debugging | Nobody holds the big picture |
| Several people changing production | Unknown state; mitigation of one hides another |
| No record of what was tried | Same fix retried, postmortem timeline reconstructed from memory |
| Severity debated mid-incident | Time lost; assume the higher level and review afterwards |
| Rollback without reverting the source of truth (Git/GitOps) | Controller re-applies the bad change |

## Sources (read 2026-11-10)

- https://sre.google/sre-book/managing-incidents/
- https://sre.google/workbook/incident-response/ (principles, 3Cs, main roles; the four case studies and the closing checklist section were not read in full)
- https://sre.google/sre-book/effective-troubleshooting/ (triage: stop the bleeding first)
- https://response.pagerduty.com/before/severity_levels/
- https://response.pagerduty.com/during/during_an_incident/
- https://response.pagerduty.com/training/incident_commander/ (size-up and stabilize steps read; the rest of the page was not)

## Not verified

- The update intervals (30 / 60 minutes) are this skill's defaults; no source read fixes them.
- PagerDuty's severity table is a vendor example, genericized by PagerDuty itself; thresholds in users or percent must come from the team's own SLOs.
- The Workbook's closing "Putting best practices into practice" checklist and the Atlassian incident handbook were not read.
- The solo-operator adaptation is a recommendation of this skill, not a source statement.
