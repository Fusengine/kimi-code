---
name: runbooks
description: Runbook structure, writing rules, testing, ownership and review cadence, and the decision on when to automate a runbook
when-to-use: Writing or reviewing a runbook, linking a runbook to an alert, deciding between documenting and automating a recurring operation
keywords: runbook, playbook, procedure, alert annotation, automation, toil, wheel of misfortune, review, SOP
priority: high
related: on-call-toil.md, incident-response.md, change-rollout.md, templates/runbook.md
---

# Runbooks

**Load when:** an alert has no documented response, an operation is done from memory, or a recurring task needs a decision: document or automate.

## What a runbook is for

A runbook turns a known situation (an alert, a recurring operation, a planned maintenance step) into steps another competent engineer can follow at 03:00 under stress. It is not a design document and not a postmortem. The Google example postmortem lists "update playbook with instructions for responding to cascading failure" as an action item, which is the normal feedback loop: incidents produce runbook improvements.

## One alert, one runbook

Every paging alert links its runbook in an annotation (`runbook_url`, next to `summary`), so the page and the procedure arrive together; see [templates/burn-rate-alerts.rules.yml](templates/burn-rate-alerts.rules.yml). An alert without a runbook is not ready to page ([on-call-toil.md](on-call-toil.md)).

## Structure (template: [templates/runbook.md](templates/runbook.md))

| Section | Content |
|---------|---------|
| Title and ID | Same name as the alert or operation |
| Owner and last review | A named owner team and the date of the last test or review |
| When to use | The alert or situation, the symptom the user or monitoring sees, what it is NOT |
| Impact and severity | What breaks for whom; default severity; link to the SLO |
| Prerequisites | Access, tools, credentials by name (never values), the right context/host |
| Diagnose | Ordered read-only checks, each with the command and the expected output for healthy and unhealthy |
| Mitigate | Ordered actions, each in ACTION / EFFECT / PROOF / WAIT-FOR-GO form ([change-rollout.md](change-rollout.md)) |
| Verify | The SLI or check that proves recovery, and for how long to watch |
| Rollback | How to undo each mitigation |
| Escalate | When to stop, who to call, when to declare an incident ([incident-response.md](incident-response.md)) |
| Related | Dashboards, postmortems, sibling skills (`devops-kubernetes`, `devops-proxmox`, ...) |

## Writing rules

1. Imperative, numbered steps; one action per step; the exact command with explicit target (host, context, namespace, ID), never "restart the service".
2. State the expected result after each step, and what to do if it differs.
3. Diagnosis before mitigation; read-only before mutating; the least risky mitigation first.
4. Destructive or irreversible steps are marked, carry their effect and a go requirement.
5. Never put secrets in a runbook; name the secret store path or variable.
6. Write it so that someone who has never seen the system can start: link, do not assume.
7. Keep it short; long background belongs in a linked design document.

## Test and maintain

- **Test by use**: a runbook that has never been followed is a hypothesis. Run it in a game day, a "Wheel of Misfortune" role-play (Google's team exercise to hone troubleshooting and service knowledge), or on a staging system ([game-days.md](game-days.md)).
- **Review triggers**: after every incident that used it (fix what misled), after every change to the system it covers, and on a calendar (a quarterly review is a sensible default; the sources give no figure).
- **Ownership**: one owning team; the date of last verification is in the file.
- **Retire** a runbook when the alert is removed or the step has been automated.

## Document or automate?

Use the toil criteria ([on-call-toil.md](on-call-toil.md)): manual, repetitive, automatable, tactical, without lasting value, growing linearly.

| Situation | Decision |
|-----------|----------|
| Seen once or twice, cause unclear | Document the diagnosis; do not automate yet |
| Repeated, steps stable, safe to retry | Automate the steps; keep the runbook as the description and the fallback |
| Repeated, needs human judgment | Automate evidence gathering (collect diagnostics into the ticket), keep the decision manual |
| The action is high-risk (data loss, failover, destructive) | Automate the preparation and verification; keep the go human |
| The need could be removed by design | Fix the design; delete the runbook |

Automation of a production action carries the same controls as a manual one: dry run, canary, limited blast radius, an off switch, logging of what it did, an alert when it fails. Automation that acts silently can be an incident cause itself; the Google postmortem case study on a rack decommission shows a retry of an automated workflow acting on an empty filter as "no filter" and wiping machines globally. Tooling for the automation is in `devops-ansible`, `devops-cicd` and `devops-iac`.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Runbook as narrative prose | Unusable at 03:00 |
| Commands without explicit target | Wrong host or cluster |
| Stale after a migration | The procedure itself causes damage |
| No expected output | The responder cannot tell success from failure |
| Automating before understanding | Faster wrong actions |

## Sources (read 2026-11-10)

- https://sre.google/sre-book/example-postmortem/ (playbook action item)
- https://sre.google/sre-book/being-on-call/ (Wheel of Misfortune, DiRT)
- https://sre.google/workbook/postmortem-culture/ (automation case study introduction)
- https://sre.google/sre-book/eliminating-toil/

## Not verified

- No primary source read prescribes a runbook structure or a review cadence; the section table, the writing rules and the decision table are this skill's synthesis from the sources above and general practice.
- The SRE Book chapters on emergency response and practical alerting, where playbook practice is discussed, were not read.
