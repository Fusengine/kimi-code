# Signals and What to Instrument First

**Load when:** designing monitoring for a new service or host, deciding what to collect, or auditing why an outage was not seen.

## The three signals

| Signal | Answers | Cost shape | Default backend in this skill |
|--------|---------|------------|-------------------------------|
| Metrics | "Is it healthy, how much, how fast, trend?" | Cheap per series, expensive with label cardinality | Prometheus |
| Logs | "What exactly happened in this event?" | Volume (bytes ingested) | Loki (collector: Grafana Alloy) |
| Traces | "Where did this one request spend its time across services?" | Volume; needs sampling | Tempo or Jaeger via OpenTelemetry |

Order of work: metrics first (alerting and trends), logs second (evidence), traces last (only when several services call each other). Correlate with shared labels (`service`, `namespace`) and a `trace_id` in log lines.

## Which method for which target

| Method | Use for | Questions per resource/service |
|--------|---------|--------------------------------|
| USE (Brendan Gregg) | Resources: CPU, memory, disk, NIC, queues, hypervisor | Utilization, Saturation, Errors |
| RED (Tom Wilkie) | Request-driven services: APIs, web, gRPC | Rate, Errors, Duration |
| Four golden signals (Google SRE book) | User-facing systems, when you can measure only four things | Latency, Traffic, Errors, Saturation |

USE is hardware- and resource-oriented; RED was created for microservices, because USE "doesn't really apply to services" (Grafana blog on RED). Golden signals = RED plus saturation.

## Instrument in this order

1. **Is it up** - `up` per scrape target, plus an outside-in blackbox probe of every user-facing URL (HTTP status, TLS expiry). This catches what internal metrics cannot (blackbox_exporter, see [exporters.md](exporters.md)).
2. **The golden signals at the edge** - request rate, 5xx ratio and latency histogram at the reverse proxy / ingress / gateway: one place covers all services behind it.
3. **Saturation of shared resources** - disk fill prediction, memory available, CPU run-queue, connection pools, queue depth, certificate expiry, backup freshness.
4. **Per-service RED** - client libraries with a histogram for request duration; labels limited to `method`, `route` template (never the raw URL), `status_class`.
5. **Business and batch signals** - "last success timestamp" gauges for batch jobs (alert on age, not on a single failure).
6. **Monitor the monitoring** - Prometheus rule-evaluation failures, Alertmanager notification failures, an always-firing `Watchdog` alert routed to an external dead man's switch ([alert-design.md](alert-design.md)).

## Naming and label rules (Prometheus practices)

- Base units in the name (`_seconds`, `_bytes`), counters end in `_total`.
- Never use labels for unbounded values (user IDs, email addresses, raw paths): every distinct value is a new series.
- Recording rule names follow `level:metric:operations`.

SLOs, error budgets and incident handling are not covered here: use `devops-sre-ops`.

## Sources (read 2026-11-10)

- https://sre.google/sre-book/monitoring-distributed-systems/ (four golden signals sentence)
- https://www.brendangregg.com/usemethod.html (USE definition)
- https://grafana.com/blog/the-red-method-how-to-instrument-your-services/ (RED, relation to USE)
- https://prometheus.io/docs/practices/rules/ and the Prometheus naming practices page (label cardinality warning, rule naming)

## Not verified

- The exact wording of "Errors" and "Saturation" definitions on the SRE book page (only the sentence naming the four signals was read).
- The advice "route template, never raw URL" is standard practice derived from the cardinality warning, not a quoted rule.
