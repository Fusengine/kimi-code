# Postmortem: <title> (incident <ID>)

Blameless: describe roles, systems and decisions in context; assume good intent and the information available at the time. No individual is named as a cause.

Date: <YYYY-MM-DD>     Authors: <names>     Status: draft | in review | complete, action items in progress
Severity: <SEV-n>      Reviewers: <names>   Published to: <audience>

## Summary

<One or two sentences: what failed, for how long, how it was resolved.>

## Impact

- Users / customers affected: <number or percent, which journeys>
- Duration: <start> to <end> (UTC), <minutes>
- Data loss: <none | description>
- SLO: <SLI value during incident>; error budget consumed: <% of window budget>; policy triggered: <yes/no, which clause>

## Root causes and contributing factors

<Circumstances in which it happened. Use the 5 Whys or another technique; list several contributing factors, not one culprit.>

1. <factor> - why it existed
2. <factor>

## Trigger

<The event that exposed the latent condition.>

## Detection

<How it was noticed: alert (which), customer, engineer. Time from start to detection: <min>. If not detected by monitoring, state the gap.>

## Resolution

<What restored service. Temporary mitigations still in place, with owner and removal date.>

## Timeline (UTC)

| Time | Event / decision / action | Role |
|------|---------------------------|------|
| | Change deployed / condition began | |
| | First symptom | |
| | Detection / page | |
| | Incident declared, roles assigned | |
| | Hypothesis tried and result | |
| | Mitigation applied | |
| | Service restored (SLI recovered) | |
| | Incident closed | |

## Lessons learned

What went well:
- <>

What went wrong:
- <>

Where we got lucky (near misses):
- <>

## Action items

Type: mitigate (reduce impact if it recurs) | prevent (stop recurrence) | process | other. One owner each; tracked ticket; re-scope knee-jerk items.

| Action item | Type | Owner | Ticket | Due | Status |
|-------------|------|-------|--------|-----|--------|
| <at least one high-priority item for the root cause if the budget policy requires> | prevent | | | | TODO |
| Update runbook <name> with <what was missing> | mitigate | | | | TODO |

## Review checklist

- [ ] Key incident data collected for posterity
- [ ] Impact assessment complete and quantified
- [ ] Root cause sufficiently deep (more than the proximate trigger)
- [ ] Action plan appropriate; priorities fit the budget policy
- [ ] Shared with relevant stakeholders

## Supporting information

<Dashboards (with time range), logs, graphs, chat transcript, incident document link.>
