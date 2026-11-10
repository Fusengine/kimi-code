# Incident <ID>: <short title>

Live incident document. Keep key facts at the top. Times in UTC. Keep it outside the system being repaired.

## State (update on every change)

- Status: investigating | mitigating | monitoring | resolved       Severity: <SEV-n>     Declared at: <time>
- Impact now: <who is affected, what they see, numbers>
- SLO / burn rate: <SLI, burn rate, % of budget consumed so far>
- Next update due: <time>    Command channel / bridge: <link>

## Roles

| Role | Name | Since |
|------|------|-------|
| Incident Commander (IC) | | |
| Operations lead (only people who change the system) | | |
| Communications lead | | |
| Scribe / planning | | |
| Subject matter experts | | |

IC holds every role not delegated. Command handoff: say "you are now the incident commander, okay?" and wait for the acknowledgement; note it below.

## Declare checklist (any one is enough)

- [ ] A second team is needed
- [ ] Customers can see the outage
- [ ] Unsolved after one hour of focused analysis
- [ ] A fast burn-rate page fired

## First 15 minutes

- [ ] Roles announced in the channel
- [ ] Severity set (unsure between two levels: use the higher)
- [ ] Symptoms and scope written (who, what, since when, constant/growing/flapping)
- [ ] Redundancy left? <yes/no>
- [ ] What changed in the window before the first symptom (deploys, config, infra, traffic, jobs): <list>
- [ ] Evidence preserved (logs, state dumps) before any restart
- [ ] First stakeholder update sent

## Mitigation options (decide before acting; one change at a time)

| # | ACTION | EFFECT / blast radius | PROOF | Go from IC | Result |
|---|--------|----------------------|-------|-----------|--------|
| 1 | | | | yes/no, time | |

## Hypotheses and tests

| # | Hypothesis | Test | Result (include negative) |
|---|------------|------|---------------------------|

## Timeline

| Time (UTC) | Who (role) | Event / decision / action |
|------------|-----------|---------------------------|

## Communication log

| Time | Audience | Message summary | Next update |
|------|----------|-----------------|-------------|

## Resolution and close

- [ ] Recovery confirmed by the SLI for <N> minutes
- [ ] End announced; stakeholders told
- [ ] Temporary mitigations to revert: <list, owner>
- [ ] Silences removed / alerts restored; flags restored
- [ ] Postmortem needed? (user-visible downtime, data loss, on-call intervention, long resolution, monitoring failure, >20% budget) -> owner and date: <>
- [ ] Budget consumed recorded: <%>
