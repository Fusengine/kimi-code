---
name: troubleshooting-method
description: Structured method for diagnosing an unknown outage - problem report, triage, what changed, blast radius, hypothesis then test, bisection, evidence log, when to stop and mitigate
when-to-use: Something is broken and the cause is not known, an alert fires with no obvious reason, a past fix did not hold
keywords: troubleshooting, hypothesis, what changed, blast radius, bisection, triage, evidence, negative result, root cause, unknown outage
priority: high
related: incident-response.md, postmortem.md, change-rollout.md
---

# Structured Troubleshooting of an Unknown Outage

**Load when:** the cause is unknown. Stack-specific diagnosis lives in the sibling skills (`devops-kubernetes` troubleshooting playbook, `devops-linux`, `devops-networking`, `devops-proxmox`, `devops-observability` for telemetry queries). This file is the generic loop that decides what to do next.

## Model

Troubleshooting is the hypothetico-deductive method (SRE Book "Effective Troubleshooting"): from a problem report and the system's telemetry and logs, hypothesize potential causes, then test each hypothesis by comparing observed state with the theory or by treating the system (changing it in a controlled way) and observing; repeat until the cause is found, then correct it and write the postmortem. Fixing the proximate cause does not have to wait for root-causing.

## Step 0 - the report

An effective problem report states the expected behavior, the actual behavior and, if possible, how to reproduce it. Open a ticket or incident-document line for every issue so a record exists. Capture the first timestamp of the symptom: it anchors the "what changed" search.

## Step 1 - triage and stop the bleeding

Match the response to the impact: one user with a workaround is not an all-hands emergency; a global outage is. In a major outage your first instinct is to find the root cause; resist it. First make the system work as well as it can: shift traffic away from the broken part, shed load to stop a cascade, disable a subsystem, roll back the last change ([incident-response.md](incident-response.md), format in [change-rollout.md](change-rollout.md)). Preserve evidence while doing so (copy logs, snapshot state).

## Step 2 - blast radius

Write down, with numbers where possible:

| Question | Why |
|----------|-----|
| Who is affected: all users, a region, a tenant, one request class? | Splits shared causes from local ones |
| What is affected: reads, writes, one endpoint, one dependency? | Points to the component |
| Since when, and is it constant, growing, flapping or periodic? | Periodic points to cron, backup or batch jobs; growing to leaks or load |
| Is redundancy left? | Decides urgency (one more failure = outage) |
| What is the SLO impact (burn rate)? | Decides paging and severity ([burn-rate-alerting.md](burn-rate-alerting.md)) |

## Step 3 - what changed

Systems tend to keep working until an external force acts: a configuration change, a deployment, a shift in the load. Recent changes are the most productive place to look. Build the change list for the window around the first symptom time, across every layer:

- application releases and feature flag flips
- configuration and secret changes, certificate expiry
- infrastructure as code applies, Ansible runs, package and kernel updates, reboots
- cluster events: node drains, upgrades, autoscaler actions, evictions
- hypervisor, storage, network and DNS changes, vendor or upstream incidents
- traffic: a marketing event, a crawler, a retry storm, a daily or monthly peak
- scheduled jobs: backups, scans, batch imports, log rotation

Overlay change markers on the error-rate graph (deployment start and end annotations). If a change correlates, rolling it back is both a test of the hypothesis and a mitigation; treat it under the ACTION / EFFECT / PROOF / WAIT-FOR-GO format.

## Step 4 - generate hypotheses

Sources of hypotheses: the change list, the symptom pattern, known failure modes of the architecture, the dependency graph (use the request path). Use "what, where, why": find out what the malfunctioning system is actually doing, why, and where its resources go or its output goes (the SRE Book example walks from high latency to CPU use to log sorting to one regular expression). Keep a short ranked list; each entry has the evidence for and against.

## Step 5 - test, cheapest and safest first

1. Order tests by likelihood, and consider the risk of each test to the system: test network reachability before auditing a permission change.
2. A good test splits the hypotheses into mutually exclusive groups so its result rules some in and some out.
3. Prefer read-only observation; use a controlled treatment (restart one instance, drain one node, flip one flag) only when observation cannot discriminate, and only one change at a time.
4. Beware confounders: a restart can fix a symptom and erase the evidence; a deploy during the test changes the system under test.
5. Divide and conquer: examine a layered system from one end to the other, or bisect the request path (is the half to the left healthy?). Inject known test requests at each hop (black-box check) to see where output stops being correct.
6. Record every test and result, including negative ones, in the incident document. A negative result is information: it removes a branch and it must not be repeated.

## Step 6 - confirm, fix, prevent

A hypothesis is confirmed when you can reproduce the failure or explain every observation, and when removing the cause removes the symptom. Apply the fix as a normal change with a rollback criterion; verify with the SLI, not only with the absence of alerts. Then follow [postmortem.md](postmortem.md). If the same fix is proposed twice after failing once, stop and form a new documented hypothesis instead.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Starting at root cause while users are down | Longer outage |
| Changing several things at once | Cannot tell which helped or hurt |
| Trusting a single dashboard | The blind spot of that SLI hides the real symptom |
| Ignoring a dependency's status because "it is up" | Partial failures, timeouts and saturation count |
| Closing on the first plausible cause | Wrong fix, recurring incident |
| No log of what was tried | Repeated tests, impossible postmortem timeline |

## Sources (read 2026-11-10)

- https://sre.google/sre-book/effective-troubleshooting/ (theory, problem report, triage, examine, diagnose, test and treat; the later "negative results" and "cure" parts were not read in full)
- https://sre.google/sre-book/managing-incidents/
- https://response.pagerduty.com/training/incident_commander/ (size-up: symptoms and scope)

## Not verified

- The Effective Troubleshooting sections after "Test and Treat" (negative results, cure, case study) were not read.
- The change-source checklist and the blast-radius table are this skill's synthesis, not source lists.
