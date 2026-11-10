# Change Request and Rollout Plan: <title>

ID: <CHG-n>     Type: standard | normal | emergency     Owner: <name>     Approver: <name>
Planned window (UTC): <start - end>     Freeze check: error budget remaining <%>, calendar freeze <no/yes>

## 1. What and why

- Change: <exact description, links to diff / PR / plan output>
- Reason and expected benefit: <>
- Service(s) and SLO(s) at risk: <>

## 2. Blast radius and dependencies

- Who / what is affected if it goes wrong: <users, services, data>
- Upstream and downstream dependencies: <>
- Reversibility: <fully reversible | partly (list non-reversible: schema migration, data delete, external side effect) | not reversible>
- Checkpoint taken before the change (snapshot / backup / state copy) and verified: <what, where, verification>

## 3. Preconditions

- [ ] Read-only discovery done and attached (versions, health, redundancy left)
- [ ] Dry run / plan / diff attached (`<tool> --check`, `diff`, `plan`)
- [ ] Rollback path tested on <staging / canary> on <date>
- [ ] People reachable during the window: <names>; no unattended period follows
- [ ] Monitoring and alerts for the affected SLI confirmed working; silences planned with expiry
- [ ] Stakeholders notified: <who, when>

## 4. Rollout plan (one stage at a time, one canary at a time)

| Stage | Scope (host / % / batch) | Bake time | Watch (SLI, saturation, logs) | Go / no-go owner |
|-------|--------------------------|-----------|-------------------------------|------------------|
| 0 canary | <1 host or 5% of traffic> | <min> | <queries / dashboards> | |
| 1 | | | | |
| 2 | | | | |
| final | | | | |

Pre-stage and post-stage checks run in the same shape as the verification below.

## 5. Rollback criteria (decided now, not during the change)

Roll back immediately if ANY of these is true:

- [ ] Error ratio above <X> for <Y> minutes (canary), or above control by <Z>
- [ ] p99 latency above <ms> for <Y> minutes
- [ ] Saturation above <limit> (memory, queue depth, connections)
- [ ] A burn-rate page fires during the rollout
- [ ] Smoke test <name> fails
- [ ] Target state not reached within <time>

Changing a criterion mid-change requires <owner> sign-off recorded here.

## 6. Production actions (each waits for its go)

```
ACTION       <exact command, explicit target>
EFFECT       <impact, blast radius, non-reversible parts>
PROOF        <verification command and expected result>
WAIT-FOR-GO  <approver>
```

Rollback action:

```
ACTION       <exact rollback command, explicit target>
EFFECT       <what is undone, what is not>
PROOF        <SLI back inside criteria for N minutes>
WAIT-FOR-GO  <approver; pre-approved if a criterion above is met: yes/no>
```

## 7. Verification (PROOF)

- User-facing SLI: <query / probe> within objective for <N> minutes
- Functional checks: <commands>
- Version / state check: <command>
- No new alerts firing; budget burn unchanged

## 8. Communication

- Before: <channel, audience, time>
- During: <updates on stage change or abort>
- After: <summary, link to this record>

## 9. Closure

- [ ] Result: success | rolled back | partial (explain)
- [ ] Silences removed; flags restored; temporary changes reverted
- [ ] Records updated (runbooks, inventory, docs); source of truth (Git/IaC) matches production
- [ ] Follow-up tickets: <>
