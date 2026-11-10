---
name: game-days
description: Pointer reference for chaos and game-day exercises - Wheel of Misfortune role-plays, disaster recovery drills, chaos experiment steps and blast-radius rules
when-to-use: Planning a game day, testing a runbook or failover, training on-call engineers, considering a chaos experiment
keywords: game day, chaos engineering, Wheel of Misfortune, DiRT, disaster recovery drill, steady state, blast radius, experiment
priority: low
related: runbooks.md, incident-response.md, on-call-toil.md, change-rollout.md
---

# Game Days and Chaos Experiments (pointer)

**Load when:** you want evidence that runbooks, failover and the team's response work before a real incident. Restore tests and DR mechanics are in `devops-storage-backup`; this file only points to the method.

## Exercise types

| Type | What it is | Risk |
|------|------------|------|
| **Role-play (Wheel of Misfortune)** | Team exercise that Google uses to hone troubleshooting skills and knowledge of the service (the exact format was not read; a common form replays a past or invented incident with one person answering as the system) | None to production |
| **Incident framework drill** | Practice the roles and communication of [incident-response.md](incident-response.md); the SRE Book suggests incident management be part of disaster-recovery testing and that teams role-play the response to an on-call issue already solved | None |
| **Disaster recovery drill** | Theoretical and practical drills of infrastructure and services; Google runs a company-wide annual event (DiRT, Disaster Recovery Training) over several days | Planned, scoped |
| **Chaos experiment** | A controlled experiment on a system to build confidence it withstands turbulent conditions | Needs blast-radius control |

## Chaos experiment steps (Principles of Chaos Engineering)

1. Define steady state as a measurable output indicating normal behavior (throughput, error rate, latency percentiles: the SLIs of [slo-sli-error-budget.md](slo-sli-error-budget.md)).
2. Hypothesize that steady state continues in both a control group and an experimental group.
3. Introduce variables that mirror real events: server crash, disk failure, severed network, a spike in traffic or a scaling event.
4. Try to disprove the hypothesis by comparing steady state between the groups.

Advanced principles in the same source: vary real-world events; run experiments in production where realistic (sampling real traffic is the authentic path) but **minimize blast radius**; automate to run continuously. A weakness found becomes an improvement target.

## Safe game-day protocol

A game day is a change: it uses [change-rollout.md](change-rollout.md). Before starting: written hypothesis, abort criteria (the rollback criteria in numbers), blast radius, a named commander and observer, a verified backup/rollback, announced window, and monitoring in place. Start in staging or on a canary slice. Production fault injection (stop a node, cut a link, fail over a database) is proposed in ACTION / EFFECT / PROOF / WAIT-FOR-GO form and runs only after the go. After: a short postmortem-style write-up ([postmortem.md](postmortem.md)) with action items, and updated runbooks ([runbooks.md](runbooks.md)).

## Sources (read 2026-11-10)

- https://principlesofchaos.org/
- https://sre.google/sre-book/being-on-call/ (Wheel of Misfortune, DiRT)
- https://sre.google/sre-book/managing-incidents/ (incident management in DR testing, role-play)
- https://sre.google/sre-book/testing-reliability/ (mentions Chaos Monkey and Jepsen as non-repeatable fault-injection techniques)

## Not verified

- No chaos tooling (Chaos Mesh, Litmus, Gremlin, Pumba, tc/netem scripts) documentation was read; none is recommended here.
- The Wheel of Misfortune format details (Accelerating SREs to On-Call chapter) were not read.
- The safe game-day protocol is this skill's synthesis.
