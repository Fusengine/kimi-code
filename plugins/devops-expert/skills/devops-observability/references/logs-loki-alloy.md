# Logs: Loki and Grafana Alloy

**Load when:** collecting, labeling, querying, retaining or deleting logs; migrating off Promtail.

Versions read 2026-11-10: **Loki 3.7.9** (tag), **Grafana Alloy v1.21.3** (2026-10-28). Templates: [loki-config.yaml](templates/loki-config.yaml), [alloy-host.alloy](templates/alloy-host.alloy), [alloy-k8s-logs.alloy](templates/alloy-k8s-logs.alloy).

## Collector choice: Alloy, not Promtail

**Promtail is end of life as of 2026-03-02** (Loki docs): no support, no updates, all feature work goes to Alloy. Grafana Agent (Static, Flow, Operator) reached EOL on 2025-11-01. Migrate with Alloy's converter: `alloy convert --source-format=promtail <promtail.yaml>` (`-f` short form; also `otelcol`, `prometheus`, `static`), or check a Promtail file with `alloy validate --config.format=promtail <file>` (the `--config.format` values accepted by `validate` are `alloy`, `otelcol`, `prometheus`, `promtail`, `static`). Other supported clients: OpenTelemetry Collector, Fluent Bit, Vector ([logs-other-stacks.md](logs-other-stacks.md)).

## Alloy in 60 seconds

Config is `.alloy` files of components wired by references: `prometheus.exporter.unix.host.targets`, `loki.write.default.receiver`. Validate with `alloy validate <file|dir>` (exit 0 valid; checks syntax, missing components, name clashes, required and unknown properties); format with `alloy fmt`. The UI listens on `--server.http.listen-addr` (default localhost: bind `0.0.0.0:12345` in a container). Data (positions, WAL) lives under `--storage.path`: persist it, otherwise logs are re-read or lost on restart.

Log pipeline components:

| Step | Component | Notes |
|------|-----------|-------|
| Discover files | `local.file_match` or `loki.source.file` with `file_match` block | doublestar globs in `__path__`, `__path_exclude__` |
| Discover pods | `discovery.kubernetes` role `pod` | then `discovery.relabel` to shape labels |
| Read | `loki.source.file`, `loki.source.kubernetes` | the latter tails via the Kubernetes API (needs `__meta_kubernetes_namespace`, `_pod_name`, `_pod_container_name`, `_pod_uid` or the `__pod_*__` equivalents) |
| Transform | `loki.process` with `stage.json`, `stage.regex`, `stage.labels`, `stage.static_labels`, `stage.structured_metadata`, `stage.drop`, `stage.match`, `stage.limit` | stages run in order |
| Send | `loki.write` `endpoint { url = ".../loki/api/v1/push" }` | `batch_size` 1MiB, `batch_wait` 1s, `external_labels`, `max_streams` |

## Label design (the main Loki cost lever)

Labels build the index and define **streams**; chunks are per stream.

- Static, bounded labels only: `cluster`, `namespace`, `app`, `container`, `env`, `job`, `host`. Aim for tens of values per dynamic label.
- Never label request IDs, trace IDs, user IDs, pod names that churn, or `level` on low-volume apps (splits one app into several small streams). Use a line filter instead: `{app="x"} |= "level=error"`, or store the value as **structured metadata** (`stage.structured_metadata`) which does not create streams.
- Guideline from the Loki docs: keep a tenant under about 100,000 active streams.
- Find offenders: `logcli series ... --analyze-labels`. Watch `loki_discarded_samples_total`.
- OTLP ingestion (`/otlp`) maps selected resource attributes to labels and the rest to structured metadata; `k8s.pod.name` and `service.instance.id` are no longer recommended as labels for new users. Tune with `limits_config.otlp_config`. Structured-metadata limits per line: 64KB / 128 entries by default.

## LogQL basics

```logql
{namespace="shop", app="web"} |= "error" != "healthz"                 # stream selector + line filters
{app="web"} | json | status >= 500 and duration > 1s                   # parse then label filter
{app="web"} | logfmt | line_format "{{.method}} {{.path}} {{.status}}"
sum by (app) (rate({namespace="shop"} |= "error" [5m]))                # log rate (entries/s)
count_over_time({app="web"} |= "timeout" [1h])
```

Rules: always start with a stream selector using labels; put cheap line filters (`|=`, `|~`) before parsers (`json`, `logfmt`, `pattern`, `regexp`); `offset` goes inside the range selector: `count_over_time({job="x"}[5m] offset 5m)`. Metric queries: `rate`, `count_over_time`, `bytes_rate`, `bytes_over_time`, `absent_over_time`, with `sum by`, `topk`. Alert from logs with the Loki ruler (`ruler.alertmanager_url`) or a Grafana-managed rule ([grafana-as-code.md](grafana-as-code.md)).

## Retention and deletion

- Retention is done by the **compactor**: `compactor.retention_enabled: true` + `compactor.delete_request_store` (required) + `limits_config.retention_period` (global) or `retention_stream` entries (label matchers only, `period` >= 24h) and per-tenant overrides. Requires a **24h index period** (TSDB schema v13 in the template). Not retroactive for logs already ingested.
- Chunks are swept after `retention_delete_delay` (template: 2h): the window to catch a retention mistake. Run the compactor as a **single instance** with persistent storage for marker files. The docs strongly recommend object-store versioning before enabling retention.
- Log deletion API: `POST /loki/api/v1/delete?query=<selector[ |= "line"]>&start=...&end=...` (204 = accepted; `X-Scope-OrgID` for the tenant). It exists only when `retention_enabled` is true and the tenant `deletion_mode` is not `disabled` (default `filter-and-delete`). Requests have a cancellation period (`delete_request_cancel_period`, default 24h): list with `GET /loki/api/v1/delete`, cancel with `DELETE /loki/api/v1/delete?request_id=...`. Treat every delete and every retention shortening as destructive: [observability-safe-ops.md](observability-safe-ops.md).
- Production index store is **TSDB**; BoltDB Shipper is being removed in Loki 4.0.

## Sources (read 2026-11-10)

- https://grafana.com/docs/loki/latest/send-data/promtail/ and .../setup/migrate/migrate-to-alloy/
- https://raw.githubusercontent.com/grafana/alloy/v1.21.3/docs/sources/reference/ (cli/validate, components loki.*, local.file_match, discovery.*, prometheus.*)
- https://raw.githubusercontent.com/grafana/loki/v3.7.9/docs/sources/ (operations/storage/retention.md, logs-deletion.md, get-started/labels/bp-labels.md, send-data/otel, reference/loki-http-api.md, query/*)
- https://raw.githubusercontent.com/grafana/loki/v3.7.9/cmd/loki/loki-local-config.yaml
- https://github.com/grafana/alloy/releases/tag/v1.21.3 and https://github.com/grafana/loki/releases/tag/v3.7.9

## Not verified

- Which Promtail options the converter cannot translate (the `convert` page confirms `--source-format promtail` exists; its limitations table was not read).
- Whether `loki.source.kubernetes` copies all non-`__` target labels onto log entries (only the required target labels and an example were read).
- The `logcli series --analyze-labels` flag is quoted from the best-practices page; `logcli` itself was not run. Note: the delete API says cancellation is possible only until the request is picked up for processing, while the logs-deletion page mentions `force=true` for requests already processing.
- `limits_config.otlp_config` and structured-metadata defaults come from the OTLP page of v3.7.9; not tested.
- The Loki template was never started; no offline linter was verified. Alloy templates were not run through `alloy validate` (binary not installed).
