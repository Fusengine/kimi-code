---
name: postmortem
description: Blameless postmortems - when to write one, structure, timeline, contributing factors, action items with owners and types, review and publication
when-to-use: After an incident that meets the postmortem criteria, when reviewing a postmortem draft, or when action items from past incidents are not being closed
keywords: postmortem, blameless, timeline, root cause, contributing factors, 5 whys, action items, owner, lessons learned, near miss
priority: high
related: incident-response.md, slo-sli-error-budget.md, templates/postmortem.md
---

# Blameless Postmortems

**Load when:** an incident is resolved and its learning must be captured, or an existing postmortem needs review.

## What it is

A postmortem is a written record of an incident, its impact, the actions taken to mitigate or resolve it, the root cause(s), and the follow-up actions to prevent recurrence. Goals: the incident is documented, all contributing causes are understood, and effective preventive actions are in place. It is a learning tool, not a punishment.

## When to write one

Define the criteria BEFORE the incident (SRE Book triggers):

- User-visible downtime or degradation beyond a threshold.
- Data loss of any kind.
- On-call intervention such as release rollback or traffic rerouting.
- Resolution time above a threshold.
- A monitoring failure (usually means manual incident discovery).
- Plus: any stakeholder may request one; and per the error budget policy example, any single incident consuming more than 20% of the error budget requires one ([slo-sli-error-budget.md](slo-sli-error-budget.md)).

Write it while memory is fresh; the incident document and chat log from [incident-response.md](incident-response.md) are the raw material for the timeline.

## Blameless means

Assume everyone involved acted in good faith with the information they had. Ask why the system allowed, or even encouraged, the action and why the person had incomplete or wrong information. Name roles and systems, not individuals, in the analysis. You cannot fix people; you can fix systems and processes. Do not stigmatize a person or team for producing many postmortems: blame makes problems get hidden.

Pointing-fingers wording: "the on-call should have checked." Blameless wording: "the deploy runbook did not say to check the replica lag, and the dashboard that shows it is not linked from the alert."

## Structure (Google example postmortem; template in [templates/postmortem.md](templates/postmortem.md))

| Section | Content |
|---------|---------|
| Header | Title and incident ID, date, authors, status (draft / in review / complete, action items in progress) |
| Summary | One or two sentences: what failed, for how long |
| Impact | Effect on users, revenue, data; quantified; the SLO and error budget consumed |
| Root causes | The circumstances in which it happened; use a technique such as the "5 Whys" to find contributing factors (more than one) |
| Trigger | The event that exposed the latent condition (for example a traffic spike hitting a latent bug) |
| Detection | How it was noticed (alert, customer, engineer); if not by monitoring, that is a finding |
| Resolution | What restored service, including temporary mitigations still in place |
| Timeline | A "screenplay" of the incident with timestamps, built from the incident document, then enriched |
| Action items | Table: action, type, owner, tracking bug, status |
| Lessons learned | What went well; what went wrong; where we got lucky (near misses) |
| Supporting information | Dashboards, logs, graphs, chat logs, links |

### Timeline rules

One timezone (UTC) for every entry. Entries: detection time, declaration, each hypothesis tried and result, each mitigation with who did it (role) and its effect, recovery, close. Include delays and dead ends; they reveal missing tooling. Use factual statements ("14:07 error ratio crossed 14.4x burn"), not judgments.

### Action items

- Each has a **type**: `mitigate` (reduce impact if it recurs, for example update a playbook), `prevent` (stop recurrence, fix the bug), `process`, or `other`.
- Each has exactly one **owner** (a person or a named team role) and a tracked ticket and, if the item matters, a target date.
- "Knee-jerk" actions are often too extreme or too costly: apply judgment and re-scope to the larger context. Avoid over-optimizing for one incident: for example, prefer a unit test that catches a class of defect early over a one-off monitor.
- At least one high-priority item must address the root cause when the error budget policy demands it (the example policy: P0 item after an incident that used more than 20% of the budget).
- Review open action items in a recurring meeting; unclosed action items are the main way postmortems fail.

## Review and publication

Share the first draft internally and have senior engineers assess completeness. Review criteria (SRE Book): was key incident data collected for posterity; are the impact assessments complete; was the root cause sufficiently deep; is the action plan appropriate and are bug fixes at the right priority; was the outcome shared with relevant stakeholders. Then publish to the widest audience that benefits. Keep postmortems in a searchable place and look for patterns across them (change-related, dependency-related, capacity-related), because the same class of cause usually repeats.

## Culture signals (SRE Workbook)

Healthy: postmortems are requested, action items complete, authors are thanked. Warning: people avoid declaring incidents, postmortems read as blame, action items stay open for quarters.

## Sources (read 2026-11-10)

- https://sre.google/sre-book/postmortem-culture/
- https://sre.google/sre-book/example-postmortem/
- https://sre.google/workbook/postmortem-culture/ (introduction and case-study framing only)
- https://sre.google/workbook/error-budget-policy/ (20% rule)

## Not verified

- The Workbook chapter's sections on incentives, signs of a broken culture, and its full tools and templates list were not read; the "culture signals" row is a summary of the chapter's stated aim, not a quote.
- "Postmortem Analysis" (https://sre.google/workbook/postmortem-analysis/) results on cause categories were not read.
- The UTC timeline rule and "one owner per action item" are recommendations of this skill; the example postmortem shows an owner column but does not state the rule.
