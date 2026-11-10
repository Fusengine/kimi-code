# On-Call Handoff: <rotation / service group>

Outgoing: <name>     Incoming: <name>     Shift end (UTC): <time>     Handoff method: written + live (call/chat) if anything is active
Incoming acknowledges: "<name> has the pager as of <time>"

## Open incidents (live handoff required)

| ID | Severity | State | Current IC | Next action / due | Document link |
|----|----------|-------|------------|-------------------|---------------|
| | | | | | |

If command of an incident changes hands: outgoing says "you are now the incident commander, okay?" and stays until acknowledged.

## Active temporary measures

| Measure (silence, mitigation, feature flag, manual workaround, scaled-up capacity) | Why | Owner | Expires / revert by |
|-----------------------------------------------------------------------------------|-----|-------|---------------------|

## Changes in flight or scheduled (next 24-72 h)

| Change ID | What | When (UTC) | Rollout stage | Go / no-go owner |
|-----------|------|------------|---------------|------------------|

Change freeze status and error budget remaining: <>

## Alerts during the shift

| Alert | Count | Actionable? | Action taken / ticket | Alert to fix or delete? |
|-------|-------|-------------|----------------------|-------------------------|

Pages total: <n>   Out of hours: <n>   Incidents (distinct root cause): <n>   Non-urgent interrupts: <n>

## Known risks and watch items

- <degraded redundancy, capacity trending toward limits, expiring certificates, upstream maintenance, vendor incidents>

## Toil and follow-ups

- Manual tasks done more than once: <task, minutes> (candidates for runbook or automation)
- Tickets opened: <links>
- Runbooks that misled or were missing: <links>

## Contacts and access check

- [ ] Pager device and escalation chain tested
- [ ] Access to the systems and secrets stores confirmed
- [ ] Secondary on-call and incident commander contacts known
