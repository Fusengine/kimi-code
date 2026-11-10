---
name: capacity-planning
description: Capacity planning method - organic and inorganic demand forecast, load testing to map raw capacity to service capacity, headroom and redundancy, lead time, review cadence, pointers to load testing
when-to-use: Sizing a service or cluster, planning for a launch or growth, deciding when to add nodes or storage, a saturation alert keeps recurring
keywords: capacity planning, demand forecast, organic growth, inorganic growth, headroom, N+1, N+2, load test, lead time, saturation, provisioning
priority: medium
related: production-readiness.md, change-rollout.md, slo-sli-error-budget.md
---

# Capacity Planning

**Load when:** you must answer "will we have enough, and when do we need more". Capacity metrics, dashboards and forecasting queries are in `devops-observability`; storage growth and replication in `devops-storage-backup`; Kubernetes requests/limits/HPA in `devops-kubernetes`; hypervisor sizing in `devops-proxmox`.

## What the sources require

Demand forecasting and capacity planning ensure sufficient capacity and redundancy to serve projected future demand with the required availability (SRE Book, Introduction). Mandatory steps:

1. An accurate **organic demand forecast** that extends beyond the **lead time** needed to acquire capacity (organic growth = natural adoption and usage).
2. An accurate incorporation of **inorganic demand** (feature launches, marketing campaigns, business-driven events).
3. **Regular load testing** to correlate raw capacity (servers, disks) to service capacity.

Provisioning is riskier than shifting load (adding capacity touches configuration files, load balancers and networking, and must be validated), so it is a change and follows [change-rollout.md](change-rollout.md). Provision quickly when needed and only when necessary, because capacity is expensive and it must work when needed. The Google launch checklist adds the pre-launch items: traffic and bandwidth estimates including the launch spike and traffic mix looking six months out, load test and end-to-end test with capacity per site at maximum latency, N+2 redundancy for machines and sites, spare capacity and a growth alert, plus 10x growth scalability bottlenecks ([production-readiness.md](production-readiness.md)).

## Method

1. **Pick the limiting resource per service**: CPU, memory, disk IOPS or capacity, network, connections, file descriptors, licence seats, a downstream quota. Capacity is the first one that saturates at the SLO.
2. **Establish service capacity by load test**: ramp traffic on a production-like system until the SLI starts to degrade (latency threshold or error ratio from the SLO). The traffic level at that point, per unit (per node, per pod), is the unit capacity at SLO. Do not use the point where the system falls over.
3. **Collect demand history**: peak (not average) of the demand metric per day and per week, at least several full cycles; note seasonality (daily, weekly, monthly, yearly).
4. **Forecast organic demand** beyond lead time: a trend over the peaks (linear or compound; choose the simplest model that fits and re-check it against actuals each cycle). Show the forecast with a range, not one number.
5. **Add inorganic demand** from the launch calendar and business owners (ask them, quarterly).
6. **Compute required capacity** = forecast peak / unit capacity at SLO, then add redundancy: enough units to carry the forecast peak after losing the largest failure domain you have promised to survive (a node for N+1, a rack, a site, a hypervisor host, a storage node).
7. **Compare with provisioned capacity and lead time**: the order date = the date the forecast crosses available capacity minus lead time minus validation time.
8. **Record the decision** and the assumptions; review them on a schedule.

### Worked example (illustrative numbers)

Load test: one node sustains 300 requests/s at the latency SLO. Forecast peak today 800 requests/s; organic growth assumed 5% per month, compounding.

| Month | Forecast peak (800 x 1.05^m) | Nodes to carry peak (ceil(peak / 300)) | With N+1 (add one) |
|-------|------------------------------|----------------------------------------|--------------------|
| 0 | 800 | 3 | 4 |
| 3 | 926 | 4 | 5 |
| 6 | 1,072 | 4 | 5 |
| 9 | 1,241 | 5 | 6 |

With 4 nodes provisioned, losing one leaves 900 requests/s of capacity: sufficient today (800) and through month 2 (800 x 1.05^2 = 882, below 900), insufficient at month 3 (forecast 926 exceeds 900). If a node takes 4 weeks to procure and validate, the order must go out about 4 weeks before month 3 (month 3 is about week 13, so about week 9). The 5% growth, the 300 requests/s and the lead time are made up for the example; real values come from measurement.

## Headroom

Headroom is capacity above the forecast peak. The sources give no percentage; define it per resource and failure domain (for example: survive the loss of the largest domain at the forecast peak; keep the user-facing resource below a stated utilization at normal peak). State the rule in the production readiness review and alert on it ("time to exhaustion under 4 weeks" is a ticket; "saturation alert at SLO-relevant level" pages only when users are at risk). Disks and storage are the usual slow-burn exhaustion; alert on predicted time to full, not on a fixed percentage alone.

## Load testing pointers

- Test a production-like system or a fenced production slice; control for caches, data volume and dependencies. Exclude load-test traffic from the SLO by label ([slo-sli-error-budget.md](slo-sli-error-budget.md)).
- Ramp up, hold, and watch the SLI plus saturation signals; record the knee of the curve.
- Re-test after significant releases, infrastructure changes, and on a calendar.
- Tools (not verified here, choose per protocol): k6, wrk, vegeta, locust, fio for storage, iperf3 for network. Verify options at the tool's own documentation before use.

## Sources (read 2026-11-10)

- https://sre.google/sre-book/introduction/ (capacity planning, provisioning, change management)
- https://sre.google/sre-book/launch-checklist/ (volume, load test, redundancy, growth items)

## Not verified

- The SRE Book chapters on load balancing, handling overload and cascading failures, and the Workbook's non-abstract large system design (capacity modelling) were not read.
- Load testing tools are named from general knowledge; none of their documentation was read in this session.
- The headroom rule and the forecast method (peak-based trend, N+k sizing) are this skill's method; the worked example is arithmetic on invented inputs.
