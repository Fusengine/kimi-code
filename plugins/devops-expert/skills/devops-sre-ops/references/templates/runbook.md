# Runbook: <alert or operation name>

Owner team: <team>     Last tested / reviewed: <date, how: game day | real incident | staging>
Service / SLO: <link>  Default severity: <SEV-n>      Alert: <alert name> (annotation runbook_url points here)

## When to use

- Trigger: <alert or situation, what the user or monitor sees>
- This is NOT: <similar situations with other runbooks>

## Impact

<What breaks, for whom, how fast the budget burns.>

## Prerequisites

- Access: <role / group; credential by name or store path, never the value>
- Target: <host / context / namespace / VM ID, written explicitly>
- Tools: <commands needed>

## 1. Diagnose (read-only)

| Step | Command (explicit target) | Healthy | Unhealthy means |
|------|---------------------------|---------|-----------------|
| 1 | `<command>` | <expected> | <interpretation / next step> |
| 2 | `<command>` | | |

## 2. Mitigate (least risky first, one change at a time)

For each action:

```
ACTION       <exact command with explicit target>
EFFECT       <what changes, blast radius, what cannot be undone>
PROOF        <check that it worked, check that nothing else broke, how long to watch>
WAIT-FOR-GO  <who gives the go; write "none" only for actions the owner pre-approved>
```

## 3. Verify

- SLI back inside objective for <N> minutes: <query / dashboard>
- Dependent services healthy: <checks>

## 4. Roll back

For each mitigation above: <how to undo, with the same format>

## 5. Escalate

- Escalate to <role / contact> when: <condition or time limit>
- Declare an incident when: a second team is needed, customers see it, or unsolved after one hour.

## 6. After

- [ ] Temporary changes reverted, silences removed
- [ ] Ticket / postmortem opened if criteria met
- [ ] This runbook corrected for anything that misled

## Automation status

<manual | partly automated (what, where) | automated (link); candidate for automation: yes/no, why>

## Related

<Dashboards, past postmortems, sibling skills.>
