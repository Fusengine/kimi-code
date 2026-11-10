# Observability Troubleshooting Playbook

**Load when:** a target is down, a metric/log/trace is missing, an alert did not fire or did not notify, or the monitoring stack itself is slow or full. Everything here is read-only; any fix that changes state goes through [observability-safe-ops.md](observability-safe-ops.md).

Order: **find which hop of the pipeline breaks**, then fix that hop. Pipeline: app -> exporter/SDK -> scrape/collector -> storage -> rule/query -> Alertmanager -> receiver -> human.

## 1. A scrape target is down (`up == 0`)

1. Prometheus UI Status -> Targets: read the **error text** of that target.
2. Reproduce from the Prometheus host/pod: `curl -sS -m 10 http://target:port/metrics | head`. Same network path, same TLS/auth.
3. Match the symptom:

| Error / symptom | Likely cause | Check |
|-----------------|--------------|-------|
| connection refused / no route | wrong port, service not listening, firewall, NetworkPolicy | `ss -ltn` on target; for K8s see `devops-kubernetes` network policy |
| `context deadline exceeded` | scrape slower than `scrape_timeout` (default 10s) | `scrape_duration_seconds{job=...}`; raise timeout or fix the exporter |
| x509 / TLS errors | wrong CA/SAN/expired cert | `openssl s_client`, `tlsConfig` / `tls_config` |
| 401 / 403 | missing token/basic auth | job `authorization` / `basic_auth`; RBAC on K8s |
| scrape fails right after a deploy, `sample_limit` | cardinality jump exceeded `sample_limit` / `label_limit` (whole scrape rejected) | `scrape_samples_post_metric_relabeling`; find the new label |
| target absent from the list | relabel `keep/drop`, SD selector mismatch (K8s: ServiceMonitor selector/`release` label, Service port **name**) | [prometheus-operator-k8s.md](prometheus-operator-k8s.md) |

4. Blackbox probe failing: `curl "http://blackbox:9115/probe?target=...&module=...&debug=true"`; check `preferred_ip_protocol` (default `ip6`).

## 2. A metric or series is missing or wrong

- Query it raw (no functions) over a short range. Empty? Then check: `metric_relabel_configs` drop rules, exporter flags that disable the collector (`--no-collector.*`), cAdvisor `--disable_metrics`, kube-state-metrics allowlists (labels are off by default), native-histogram vs classic naming ([promql-essentials.md](promql-essentials.md)).
- Present but graph blank: `rate` range shorter than two scrapes; wrong `by (..., le)`; Grafana datasource `timeInterval` not matching the scrape interval.
- Gap in a recorded series: the rule group missed iterations (`rule_group_iterations_missed_total`): group too slow for its interval.
- Duplicate or doubled values: two collectors for the same host (node_exporter and Alloy unix exporter), or two Prometheus replicas without a replica label deduplication.

## 3. An alert did not fire

1. Run the alert `expr` in the graph at the incident time: does it return data? (`ALERTS{alertname="X"}` shows pending/firing history.)
2. Status -> Rules: is the rule loaded, last evaluation error? Pending longer than `for`?
3. Data missing makes `sum(...) < N` silent: use `absent()`/`up` companions.
4. Rule file not in `rule_files` globs, or a reload that failed (the reload applies only if all files parse): check the reload-success metric and the server log.

## 4. An alert fires but nobody is notified

1. Is it in Alertmanager? UI Alerts, or `amtool alert query --alertmanager.url=...`. Not there: Prometheus `alerting.alertmanagers` wrong, `alert_relabel_configs` dropping it, or Alertmanager unreachable.
2. Which route does it match? `amtool config routes test --config.file=... <labels>`; fix severity/team labels.
3. Muted? Check silences (`amtool silence query`), inhibition rules (`equal` labels), `mute_time_intervals` / `active_time_intervals` (not inherited by child routes), and `group_wait` / `group_interval` (the first notice is delayed by `group_wait`).
4. Delivery: `alertmanager_notifications_failed_total` by `integration`; receiver secret files readable; webhook endpoint answering; `send_resolved` expectations.
5. Cluster: all Prometheus servers must point to all Alertmanager peers.

## 5. Prometheus is slow, big or full

- Series count: `prometheus_tsdb_head_series`; top metrics by series; cardinality fixes first ([prometheus-config.md](prometheus-config.md)).
- Slow dashboards: add recording rules; check `query_log_file` and the global `query_max_*` limits (all default `0` = off).
- Disk: retention time/size flags; WAL and `chunks_head` count in the size; blocks compact up to 10% of retention or 31 days; on-disk size can briefly exceed `retention.size`. NFS/EFS is unsupported: move to local disk.
- Corruption after a crash: back up the data dir, then per the Prometheus docs remove the corrupted block directories or WAL as a last resort (data for that range is lost).
- Memory growth after a deploy: a new high-cardinality label; compare head series before/after.

## 6. Loki / Alloy

- Alloy: component health on the UI (`:12345`), `alloy validate` on the config, positions under `--storage.path` persisted. Nothing arrives: check `loki.write` URL path `/loki/api/v1/push`, `local.file_match` globs and file permissions, `loki.process` `stage.drop` too broad.
- Loki rejects data: `loki_discarded_samples_total` by reason (for structured metadata: `structured_metadata_too_large`, `structured_metadata_too_many`); check stream and label limits and the label design in [logs-loki-alloy.md](logs-loki-alloy.md). Retention not applied: `compactor.retention_enabled`, `delete_request_store`, 24h index period.
- Slow queries: always start with a stream selector, filter lines before parsing, narrow the time range.

## 7. Traces / OpenTelemetry

- No traces: is the app exporting to 4317/4318 on the right host? Collector `health_check` extension (port 13133 in the template) up? Pipeline lists the receiver and the exporter? (`otelcol-contrib validate`).
- Partial traces after enabling tail sampling: spans of one trace reaching different Collector instances; `decision_wait` shorter than the trace duration.
- Exporter errors after an upgrade: renamed components (`otlp_grpc`, `otlp_http`, `prometheus_remote_write`), deprecated aliases removed ([tracing-opentelemetry.md](tracing-opentelemetry.md)).
- Metrics from OTLP missing in Prometheus: cumulative vs delta temporality; `--web.enable-otlp-receiver` set.

## 8. Grafana

- Datasource "Test" fails: URL from the Grafana container's point of view (not localhost), proxy `access`, credentials via `secureJsonData`.
- Provisioned object not appearing: file mounted at the provisioning path, YAML `apiVersion: 1`, Grafana server log at startup; a UI edit on a provisioned dashboard is not saved when `allowUiUpdates: false`.
- Dashboard shows "No data" only on long ranges: retention or `query_max_*` limits; use recording rules.

## Sources (read 2026-11-10)

- https://prometheus.io/docs/prometheus/latest/storage/ and alerting_rules/recording_rules pages
- https://raw.githubusercontent.com/prometheus/prometheus/v3.16.0/docs/configuration/configuration.md (limits, `query_*` globals)
- https://raw.githubusercontent.com/prometheus/blackbox_exporter/v0.29.1/README.md , CONFIGURATION.md
- https://raw.githubusercontent.com/prometheus/alertmanager/v0.35.0/docs/configuration.md and notify/metrics.go (`notifications_failed_total` with `integration` label)
- https://raw.githubusercontent.com/grafana/loki/v3.7.9/docs/sources/send-data/otel/_index.md (discard reasons), operations/storage/retention.md
- https://raw.githubusercontent.com/prometheus/prometheus/v3.16.0/rules/group.go (`rule_group_iterations_missed_total`)

## Not verified

- Metric names `scrape_duration_seconds`, `scrape_samples_post_metric_relabeling`, `prometheus_tsdb_head_series`, `prometheus_config_last_reload_successful` are standard Prometheus self-metrics not individually confirmed in the sources above (`scrape_samples_post_metric_relabeling` appears in the feature-flags page text).
- `amtool alert query` subcommand was not confirmed against v0.35.0.
- Alloy debugging via the `:12345` UI is the default-port convention from the Docker install page; component-level debug pages were not read.
- Collector self-metrics (`otelcol_*`) names for dropped/refused spans were not checked for span signals.
- Grafana 13.3 UI wording ("Test", "Save") for provisioned datasources is quoted from the Tempo page, not tested.
