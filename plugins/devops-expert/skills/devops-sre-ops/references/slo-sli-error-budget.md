---
name: slo-sli-error-budget
description: SLI, SLO and SLA definitions, how to choose SLIs per service type, how to write an SLO, error budget arithmetic and the error budget policy
when-to-use: Defining or reviewing reliability targets for a service, deciding what to measure, computing an error budget, writing or enforcing an error budget policy
keywords: SLI, SLO, SLA, error budget, availability, latency, freshness, durability, error budget policy, request-driven, pipeline, storage
priority: high
related: burn-rate-alerting.md, change-rollout.md, templates/slo-definition.md, templates/error-budget-policy.md
---

# SLI, SLO, SLA and Error Budget

**Load when:** a service has no written reliability target, an alert fires without a defined meaning, or a release/freeze decision needs data. Metric collection and dashboards belong to `devops-observability`; this file is the method.

## Definitions

| Term | Meaning | Test |
|------|---------|------|
| **SLI** | A carefully defined quantitative measure of one aspect of the level of service (latency, error ratio, throughput, availability, durability) | "What number says users are happy?" |
| **SLO** | A target value or range for an SLI over a window, for example 99.9% of requests succeed over 30 days | "What happens if we miss it?" - an internal decision, no contract |
| **SLA** | An explicit or implicit contract with users that includes consequences (rebate, penalty) for missing the SLOs it contains | If there is an explicit consequence, it is an SLA |

The SLA is a business/legal artifact: an SRE or DevOps agent helps define measurable SLIs and avoid triggering consequences, it does not invent the contract. Set the SLO tighter than any SLA.

## The SLI is a ratio of good events to total events

Recommended form (SRE Workbook): `good events / total events`, ranging 0% to 100%. Examples: successful HTTP requests / all requests; gRPC calls that completed in < 100 ms / all calls; stock-check requests that used data fresher than 10 minutes / all stock-check requests. A consistent shape lets alerting, reporting and budget calculation share one input contract (numerator, denominator, threshold).

Separate the two layers when writing one:

- **SLI specification** - what matters to users, independent of measurement ("ratio of home page requests that loaded in < 100 ms").
- **SLI implementation** - the specification plus a measurement point ("... measured from the server log latency column"; "... measured by an external prober"; "... measured by client-side instrumentation"). Each has different quality (accuracy), coverage and cost: a server-side log misses requests that never reach the backend; a prober catches reachability but may miss a subset of users. Name the measurement point and its blind spot in the SLO document.

## Choosing SLIs per service type

Pick at most five SLI types that represent the most critical user journeys; start with one application, define who the users are, list the common tasks, draw the request and data flow. Do not export every metric as an SLI.

| Service type | Typical SLIs | Notes |
|--------------|--------------|-------|
| **Request-driven** (HTTP API, web, RPC) | Availability (successful requests / valid requests), latency (requests faster than a threshold / all), quality (non-degraded responses / all) | Use two latency thresholds, for example 90% < 100 ms and 99% < 400 ms, to capture the typical case and the tail |
| **Pipeline / batch** | Freshness (data newer than X / all data), coverage (records processed / records expected), correctness, end-to-end latency, throughput | Alert on freshness, not on job exit status alone |
| **Storage** | Durability, availability, latency of reads and writes | Durability is verified by restore and integrity checks: see `devops-storage-backup` |
| **All systems** | Correctness (right answer returned) | Often a property of the data, not the infrastructure; track it, but ownership may sit with the application team |

Measure client-side where the server view hides the problem (page becomes usable in the browser versus backend response time). Use percentiles or thresholded ratios, never plain averages, for latency: an average hides a slow tail.

Home-lab / self-hosted examples (the same method on small systems): "successful probes of the reverse proxy / all probes" from a blackbox prober; "PBS backup jobs finished in window / scheduled jobs" as a freshness-style SLI; "Proxmox VM service answers a TCP/HTTP check" per critical VM.

## Writing an SLO

State, in one sentence: SLI specification, target, window, measurement point, validity conditions. Example: "99.9% of valid HTTP requests to `shop.example.com` return non-5xx, measured at the Gateway, rolling 30 days, excluding load tests labeled `synthetic=load`".

Rules from the sources:

1. **100% is the wrong target.** Dependencies, change and cost make it unreachable and unwanted; each additional nine costs more with decreasing user benefit. Make the target "reliable enough, no more than needed" - it is both a floor and a ceiling.
2. **Start from what users care about, then find an indicator**, not from what is easy to measure. A first SLO from current performance is acceptable only with a process to iterate; do not let current performance cap refinement.
3. **Someone owns it** and may trade feature velocity against reliability: the product owner, or the CTO in a small organization.
4. **Adoption prerequisites** for an error-budget approach: stakeholders approved the SLO; the people defending it agree it is achievable under normal conditions; the organization committed to use the budget for decisions, formalized in an error budget policy; a refinement process exists. Without these, an SLO is just a KPI.
5. **Standardize** aggregation interval, region, frequency, included requests, data source across SLIs, and reuse SLI templates.
6. **Review** the SLO on a schedule (quarterly is a sound default; the exact cadence is a team decision, not a source figure) and after every budget-exhausting incident.

Group request types into a few classes with shared targets instead of tuning each endpoint. Workbook example (illustration, not a rule): CRITICAL 99.99% availability; HIGH_FAST 99.9%; HIGH_SLOW 99.9%; LOW 99%; NO_SLO none.

## Error budget arithmetic

`error budget = 1 - SLO`. Worked examples (SRE Workbook and Embracing Risk figures, recomputed):

| SLO | Budget | In 30 days (720 h) | In 4 weeks (672 h) |
|-----|--------|--------------------|--------------------|
| 99% | 1% | 7 h 12 min of full outage | 6 h 43 min |
| 99.9% | 0.1% | 43.2 min | 40.3 min |
| 99.95% | 0.05% | 21.6 min | 20.2 min |
| 99.99% | 0.01% | 4.32 min | 4.03 min |
| 99.999% | 0.001% | 25.9 s | 24.2 s |

Request-based budget: 99.9% over 1,000,000 requests = 1,000 allowed errors; 3,000,000 requests = 3,000 allowed errors; an outage that produced 1,500 errors in that period cost 50% of the budget. Prefer request-based accounting for services with variable traffic: time-based uptime hides partial outages.

Budget is a tool for decisions: if the service is inside its SLO, ship per the release policy; when the budget is gone, effort shifts to reliability. Changes are the main source of outages (about 70% of outages come from changes to a live system, per the SRE book), which is why the budget governs release pace.

## Error budget policy (what to do when budget runs out)

An SLO without a policy has no teeth. Write the policy before the first miss, get the product owner's signature, and keep these parts (structure from the SRE Workbook example policy; thresholds are that example's, tune them):

| Part | Content |
|------|---------|
| Goals / non-goals | Protect users from repeated SLO misses; give an incentive to balance reliability and features. It is not a punishment and not a permanent halt of change |
| SLO miss policy | If the budget for the window is exceeded, halt changes and releases except P0 issues and security fixes until the service is back within SLO (example: four-week window) |
| When reliability work is mandatory | Cause was a code bug or procedural error in the service; a postmortem reveals a hard dependency to soften; miscategorized errors hid budget consumption |
| When feature work may continue | Cause was a company-wide network failure; a dependency owned by another team that has frozen its own releases; budget consumed by out-of-scope users (load tests, penetration testers); miscategorized errors consumed budget with no user impact |
| Outage policy | A single incident that consumes more than 20% of the budget over the window requires a postmortem with at least one P0 action item; a single outage class consuming more than 20% over a quarter requires a P0 item in the next quarterly plan |
| Escalation | Disagreement on budget calculation or required actions goes to a named decision-maker (example: the CTO) |

Template: [templates/error-budget-policy.md](templates/error-budget-policy.md). SLO document: [templates/slo-definition.md](templates/slo-definition.md). Turning the SLO into alerts: [burn-rate-alerting.md](burn-rate-alerting.md).

## Pitfalls

| Trap | Consequence |
|------|-------------|
| SLO set to 100%, or to a number nobody can reach | Permanent budget exhaustion; the policy is ignored |
| SLI measured only where it is easy (server log) | Users suffer while the dashboard is green |
| Average latency as SLI | Tail regressions invisible |
| Too many SLIs | Attention diluted; no one knows which matters |
| Budget includes out-of-scope traffic (load tests, scanners) | False exhaustion; exclusion rules must be written in the SLO document |
| Alert thresholds tuned per service with no common rule | Alerting toil that does not scale: apply one set of parameters to all services |

## Sources (read 2026-11-10)

- https://sre.google/sre-book/service-level-objectives/
- https://sre.google/sre-book/embracing-risk/
- https://sre.google/workbook/implementing-slos/ (first part: reliability targets, SLI form, component types, worked example; the later sections on advanced topics and example SLOs were not read)
- https://sre.google/workbook/error-budget-policy/
- https://sre.google/workbook/alerting-on-slos/ (request-class buckets table)
- https://sre.google/sre-book/introduction/ (70% of outages from change)

## Not verified

- The remainder of the Implementing SLOs chapter (decision making with budgets, SLO review cadence, advanced topics, example SLOs by service type) was not read in full; the quarterly review cadence is a recommendation of this skill, not a source figure.
- The home-lab SLI examples are applications of the method by this skill, not examples from the sources.
- Time tables above are arithmetic from `1 - SLO` and the stated window, not copied from a source table.
