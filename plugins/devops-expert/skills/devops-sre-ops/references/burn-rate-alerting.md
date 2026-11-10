---
name: burn-rate-alerting
description: Multi-window multi-burn-rate SLO alerting - burn rate definition, the recommended windows and factors for a 99.9% SLO, worked arithmetic, low-traffic and extreme-availability adjustments, Prometheus rule structure
when-to-use: Turning an SLO into pages and tickets, auditing noisy or silent SLO alerts, tuning alert windows, deciding page versus ticket
keywords: burn rate, multiwindow, 14.4, error budget consumption, page, ticket, precision, recall, detection time, reset time, Prometheus rules, low traffic
priority: high
related: slo-sli-error-budget.md, on-call-toil.md, templates/burn-rate-alerts.rules.yml
---

# Multi-Window, Multi-Burn-Rate Alerting

**Load when:** an SLO exists and needs alerts, or SLO alerts page too often or too late. Alertmanager routing, inhibition and Grafana belong to `devops-observability`; this file is the alert design.

## Goal: alert on significant events

A significant event consumes a large fraction of the error budget. Judge any alert strategy on four properties (SRE Workbook):

| Property | Meaning |
|----------|---------|
| **Precision** | Share of alerts that were significant events |
| **Recall** | Share of significant events that alerted |
| **Detection time** | Time to notify; long detection burns budget |
| **Reset time** | How long the alert keeps firing after resolution; long reset causes confusion or ignored alerts |

## Why not the simple ways

| Attempt | Failure |
|---------|---------|
| Error rate over a short window >= SLO threshold | Fires on trivial blips; noisy |
| Large window (for example 36 h) | Very poor reset time: fires for 36 h after a 100% outage ends |
| `for:` duration on a short window | A 100% outage alerts after the same delay as a 0.2% one; a metric that dips back into SLO resets the timer, so repeated 5-minute 100% spikes never alert (the book's example burns 35% of the budget unseen). Not recommended |
| One burn-rate alert (1 h window, factor 36) | Low recall: a 35x burn never alerts but exhausts the 30-day budget in 20.5 h; reset 58 min |
| Several burn rates, long windows only | Good recall, but long reset times and several alerts for one event unless suppressed |

The recommended method: **multiwindow, multi-burn-rate**. Each alert needs a long window (is the burn significant?) AND a short window (is it still burning right now?). The short window is about 1/12 of the long window.

## Definitions and formulas

- **Burn rate** = how fast the budget is consumed relative to the SLO. Burn rate 1 = a constant error rate equal to `1 - SLO` for the whole SLO window, consuming exactly 100% of the budget at the end.
- Error rate that corresponds to a burn rate: `error_rate = burn_rate x (1 - SLO)`.
- Budget consumed when the alert fires: `consumed = burn_rate x alert_window / SLO_period`.
- Time to exhaustion at a constant burn: `SLO_period / burn_rate`.
- Time for an alert to fire (error ratio `e` constant): `((1 - SLO) / e) x window x burn_rate`.
- Largest burn rate possible: `1 / (1 - SLO)` (all requests failing).

## Recommended parameters (99.9% SLO, 30-day window)

Source: SRE Workbook, "Recommended parameters for a 99.9% SLO alerting configuration" (Table 5-8), figures re-read from the page:

| Severity | Long window | Short window | Burn rate | Error budget consumed |
|----------|-------------|--------------|-----------|-----------------------|
| Page | 1 hour | 5 minutes | 14.4 | 2% |
| Page | 6 hours | 30 minutes | 6 | 5% |
| Ticket | 3 days | 6 hours | 1 | 10% |

The chapter's rule example additionally shows a ticket alert at factor 3 over 24 h with a 2 h short window (also 10% consumed); the table does not list it. The shipped template includes it as an optional fourth rule.

### Worked arithmetic (SLO 99.9%, budget 0.001, period 30 d = 720 h)

| Row | Consumed = burn x window / period | Error ratio threshold (burn x 0.001) | Time to exhaustion (720 h / burn) | Time to fire at 100% errors |
|-----|-----------------------------------|--------------------------------------|-----------------------------------|-----------------------------|
| 14.4, 1 h | 14.4 x 1 / 720 = 0.02 = **2%** | 0.0144 (1.44%) | 720 / 14.4 = 50 h | (0.001 / 1) x 1 h x 14.4 = 0.0144 h = **about 52 s** |
| 6, 6 h | 6 x 6 / 720 = 0.05 = **5%** | 0.006 (0.6%) | 720 / 6 = 120 h = 5 d | (0.001 / 1) x 6 h x 6 = 0.036 h = **about 2.2 min** |
| 1, 3 d | 1 x 72 / 720 = 0.10 = **10%** | 0.001 (0.1%) | 30 d | (0.001 / 1) x 72 h x 1 = 0.072 h = **about 4.3 min** |
| 3, 24 h (optional) | 3 x 24 / 720 = 0.10 = **10%** | 0.003 (0.3%) | 10 d | (0.001 / 1) x 24 h x 3 = 0.072 h = about 4.3 min |

Short windows: 5 min = 1 h / 12; 30 min = 6 h / 12; 6 h = 3 d (72 h) / 12; 2 h = 24 h / 12. Consistency with the book's other figures: burn 1,000 on a 99.9% SLO = error rate 100% and exhausts the budget in 720 h / 1000 = 0.72 h = 43.2 min (book table: 43 minutes); burn 36 over 1 h = 5% (36 x 1 / 720).

### Rule shape (PromQL, Prometheus recording and alerting rules)

```yaml
# recording rules: one per window, e.g. 5m 30m 1h 2h 6h 1d 3d
- record: job:slo_errors_per_request:ratio_rate1h
  expr: sum by (job) (rate(http_requests_total{code=~"5.."}[1h])) / sum by (job) (rate(http_requests_total[1h]))

# page: both windows above the threshold
- alert: ErrorBudgetBurnPageFast
  expr: |
    job:slo_errors_per_request:ratio_rate1h > (14.4 * 0.001)
    and
    job:slo_errors_per_request:ratio_rate5m > (14.4 * 0.001)
```

Rule file syntax (Prometheus docs): `groups[].name`, `rules[]` with `record`/`expr` or `alert`/`expr`/`for`/`keep_firing_for`/`labels`/`annotations`; check with `promtool check rules FILE` (exit 0 valid, 1 on error); reload by `SIGHUP`. Annotations are the place for the runbook link and summary. The ready file is [templates/burn-rate-alerts.rules.yml](templates/burn-rate-alerts.rules.yml). Alertmanager must prevent one event from sending a page, a second page and a ticket: route by `severity` and inhibit the ticket when the page fires (configuration in `devops-observability`).

A rule group that evaluates slowly skips iterations (`rule_group_iterations_missed_total` increments): use recording rules for the long windows so alert expressions stay cheap, and alert on that missed-iterations metric so the alerting pipeline itself is watched.

## Pages, tickets and ownership

A page is for an event that will exhaust the budget within hours to a few days and needs a human now; a ticket is for a slower burn that can be handled the next working day. Pages and tickets are the only valid ways to ask a human to act. Tune the numbers to the service and baseline load; on busier services, depending on weekend on-call, the 6-hour row may be a ticket instead of a page.

## Low-traffic services

With few requests a single failure looks like a massive burn. Book example: 10 requests per hour, one failure = 10% error ratio. For a 99.9% SLO that is a burn rate of 10% / 0.1% = 100x, which consumes 100 x 1 h / 720 h = 13.9% of the 30-day budget in an hour; the budget allows only 0.001 x 7,200 = 7.2 requests to fail in 30 days. (The book prints "1,000x" for this case; the arithmetic gives 100x, and its 13.9% figure matches 100x.)

Options in the source, usually combined: generate synthetic traffic (blackbox probers, integration tests) - but a problem that hits real users and not the synthetic path is hidden; aggregate related small services that share a failure domain; change the client to retry with exponential backoff and jitter, or add a fallback path so one failure has less user impact; set the SLO to match the real impact of one failed request (lowering it is a product decision) or widen the alert window.

## Extreme availability targets

- **Low target (for example 90%)**: the maximum burn rate is `1 / 0.1 = 10`, so a 14.4 factor can never fire (a 100% outage consumes only 1/72 = 1.4% of the budget in an hour, below the 2% page level). Re-derive the factors from the budget percentage you want to defend.
- **High target (for example 99.999%)**: budget exhausted by a 100% outage in about 26 s, shorter than many scrape intervals plus notification delay. Alerting cannot defend it; design the system so a total outage is improbable (staged rollout to a small percentage first).

## Alerting at scale

Do not give every service its own windows and factors; choose one parameter set and apply it everywhere. Bucket request classes into a handful of SLO classes. Temporary parameter changes are acceptable only during an ongoing outage you are working.

## Decision flow when a burn-rate page fires

1. Read both windows and which severity fired; compute the budget already consumed (burn x window / period).
2. Declare an incident per [incident-response.md](incident-response.md) if user impact is visible or a second team is needed.
3. Check "what changed" ([troubleshooting-method.md](troubleshooting-method.md)); mitigate first (rollback, traffic shift, scale) under the ACTION / EFFECT / PROOF / WAIT-FOR-GO format of [change-rollout.md](change-rollout.md).
4. Record the budget consumed in the postmortem; apply the error budget policy.

## Sources (read 2026-11-10)

- https://sre.google/workbook/alerting-on-slos/ (prose, rule examples and tables 5-4 to 5-8 read, including by parsing the page HTML for the table cells)
- https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Not verified

- `promtool` is not installed on the authoring host, so the rule template was checked only as YAML (PyYAML) and by reading the Prometheus rule syntax; PromQL was not executed against a Prometheus server. Run `promtool check rules` before use.
- Metric and label names in the template (`http_requests_total`, `code`, `job`) are placeholders and must be replaced by the real instrumentation.
- Table 5-8 gives parameters for a 99.9% SLO only; the burn-rate factors for other SLOs are derived here with the same formulas, not taken from the source.
- The book's "1,000x" figure for the low-traffic example conflicts with its own 13.9% figure; this file uses the recomputed 100x.
- Alertmanager inhibition configuration details were not read here (scope of `devops-observability`).
