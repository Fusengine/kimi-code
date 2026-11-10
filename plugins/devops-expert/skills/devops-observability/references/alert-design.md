# Alert Design

**Load when:** writing a new alert, reviewing an alert set, or fixing alert fatigue.

SLO burn-rate alerts, error budgets and the incident process belong to `devops-sre-ops`: this file covers the alert rule itself.

## Rules of thumb (Prometheus alerting practices)

1. **Alert on symptoms tied to user pain**, not on every possible cause. Keep as few alerts as possible; use dashboards to find the cause.
2. **Page only when a human must act now.** If nothing can be done, it is not a page. Everything else is a ticket (next business day) or a dashboard.
3. For serving systems alert on **latency and error rate as high in the stack as possible**; page on latency at one point only; page on user-visible errors, not on every downstream error that causes them.
4. Allow slack for blips: use `for:` and wide enough `rate` ranges; `keep_firing_for:` stops flapping and false resolves.
5. Batch jobs: alert when the job has not **succeeded recently enough** (at least two run periods), never on a single failure.
6. Capacity: alert on predicted exhaustion (`predict_linear`) well before the incident.
7. **Monitor the monitoring**: Prometheus rule failures, Alertmanager notification failures, scrape failures, plus an external blackbox check as fallback.

## Required content of every alert

| Field | Content |
|-------|---------|
| `alert` | CamelCase name describing the symptom (`WebHighErrorRatio`) |
| `expr` | Uses aggregated recorded series where possible; no `irate`; handles missing data on purpose |
| `for` | At least 2-3 evaluation intervals unless the signal is already smoothed |
| `labels.severity` | A small closed set (`page`, `ticket`, `none`); routing and inhibition depend on it |
| `labels.team` / `service` | Routing key |
| `annotations.summary` | One line with the affected instance/service and the value, templated (`{{ $labels.instance }}`, `{{ $value }}`) |
| `annotations.runbook_url` | Link to what to check and how to fix; no runbook = not ready to page |

## Severity model

| Severity | Meaning | Delivery |
|----------|---------|----------|
| `page` | User-facing impact now or imminent; act immediately | On-call pager, any hour |
| `ticket` | Needs action within days; no current user impact | Ticket/chat in business hours (`active_time_intervals`) |
| `none` | Informational, `Watchdog` | Dead man's switch / nowhere |

## Fighting alert fatigue

- Measure: count notifications per alertname per week (`ALERTS`, Alertmanager notification logs). Anything that fired more than a few times with no action gets fixed or deleted.
- Group (`group_by`) and inhibit (node down hides its services) in Alertmanager ([alertmanager.md](alertmanager.md)); do not solve noise with long silences.
- Do not alert on both cause and symptom unless the cause alert adds action value.
- Review alerts after every incident: add the missing symptom alert, delete the ones nobody used.
- Test rules before shipping: `promtool check rules`, unit tests with `promtool test rules`, and `amtool config routes test` for routing.

## Watchdog / dead man's switch

An always-true alert (`expr: vector(1)`) routed to an external service that alerts when it **stops** arriving. It proves the chain Prometheus -> Alertmanager -> network is alive ([rules-alerts.yml](templates/rules-alerts.yml), route in [alertmanager.yml](templates/alertmanager.yml)).

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/prometheus/docs/main/docs/practices/alerting.md
- https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- https://sre.google/sre-book/monitoring-distributed-systems/ (symptoms vs causes chapter)

## Not verified

- `promtool test rules` was not run or read today (named from the Prometheus unit-testing feature, page not fetched).
- Severity vocabulary (`page`/`ticket`/`none`) is this skill's convention, not a Prometheus standard.
- "At least 2-3 evaluation intervals" for `for:` is a rule of thumb.
- The weekly notification-count method is a suggestion; no specific metric from Alertmanager was verified for it.
