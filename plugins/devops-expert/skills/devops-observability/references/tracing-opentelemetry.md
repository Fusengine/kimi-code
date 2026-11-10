# Tracing and OpenTelemetry

**Load when:** instrumenting services, building an OpenTelemetry Collector or Alloy pipeline, choosing sampling, wiring Tempo/Jaeger.

Versions read 2026-11-10: OpenTelemetry Collector releases **v0.165.0** (core v1.71.0; `otelcol`, `otelcol-contrib`, `otelcol-k8s`, `otelcol-otlp` distributions), **Grafana Tempo v3.1.1**, **Jaeger v2.23.0** (latest-tag redirects; dates not read). Templates: [otel-collector.yaml](templates/otel-collector.yaml), [alloy-otlp.alloy](templates/alloy-otlp.alloy).

## Model

A trace is the path of one request; spans have a parent, timing and attributes. Apps use an OpenTelemetry SDK (or auto-instrumentation) and export **OTLP** to a local Collector/Alloy, which processes and forwards to the backend. Default OTLP ports: gRPC **4317**, HTTP **4318**. Always put `trace_id` into log lines so Loki `derivedFields` can link logs to traces ([grafana-as-code.md](grafana-as-code.md)).

## Collector configuration structure

`receivers` / `processors` / `exporters` / `connectors` / `extensions` are **defined** in their sections and only **used** if listed in `service.pipelines.<traces|metrics|logs>` (and `service.extensions`). Processor order in the list is the execution order. A component type can be named `type/name` to have several instances. A processor shared by two pipelines is instantiated once per pipeline.

```bash
otelcol-contrib validate --config=otel-collector.yaml     # also: otelcol-contrib components   (lists what this build contains)
```

Check the distribution before writing config: `otelcol` (core) lacks many contrib components. `tail_sampling`, `probabilistic_sampler` are in `otelcol-contrib` and `otelcol-k8s`.

### Receiver defaults and exposure

The Collector binds endpoints to `localhost` by default; the OpenTelemetry examples use `0.0.0.0` for convenience. Opening `0.0.0.0` exposes an unauthenticated ingest port: restrict by network policy/firewall, or add auth and TLS ([security best practices](https://github.com/open-telemetry/opentelemetry-collector/blob/main/docs/security-best-practices.md)).

### Processors that belong in almost every pipeline

1. `memory_limiter` first (`check_interval`, and `limit`/`limit_percentage`, `spike_limit[_percentage]`): refuses data before the process is OOM-killed. Alloy: `otelcol.processor.memory_limiter` (`check_interval` required).
2. Context-dependent enrichment (e.g. `k8sattributes`, whose profiles signal is `development` stability; check its status for your signals before relying on it).
3. Sampling, then `batch` last (Alloy docs: batch goes after any processor that drops data).

### Breaking changes you will meet in 0.x releases

- `otlp` exporter was renamed **`otlp_grpc`** and `otlphttp` renamed **`otlp_http`** in v0.144.0 (old names remain deprecated aliases). Current OpenTelemetry docs use `otlp_grpc`. Loki's page still says `otlphttp`: both work today; prefer the new names in new files.
- The **`queue_batch`** processor (introduced v0.158.0 to replace the legacy `batch` processor; promoted to beta for traces, metrics, logs in v0.165.0) uses the same options as exporter `sending_queue`. Exporters also have `sending_queue::batch`; v0.165.0 warns at startup when a pipeline combines the `batch` processor with exporter batching. Do not enable both.
- `prometheusremotewrite` exporter is now **`prometheus_remote_write`** with the URL under `http.endpoint` (old type still an alias). Non-cumulative monotonic, histogram and summary OTLP metrics are dropped by that exporter.
- Read the changelog of every 0.x you jump over: breaking changes land in minors. Pin the image tag; never `latest` in production.

## Sending OTLP to the backends

| Signal | Path | Notes |
|--------|------|-------|
| Metrics | Prometheus OTLP receiver `POST /api/v1/otlp/v1/metrics` (start with `--web.enable-otlp-receiver`) | Cumulative expected; delta needs `--enable-feature=otlp-deltatocumulative` (or `otlp-native-delta-ingestion`, mutually exclusive) |
| Metrics (alt) | `prometheus_remote_write` exporter to Mimir/Prometheus | Cumulative only |
| Logs | Loki native OTLP at `http://loki:3100/otlp` via the HTTP exporter | `allow_structured_metadata: true` required (default on since Loki 3.0) |
| Traces | Tempo OTLP gRPC 4317 / HTTP 4318 | Tempo 3.x config differs from 2.x: read the Tempo configuration page for your version before copying old configs |

Metrics from traces: the `spanmetrics` connector turns spans into RED metrics (status alpha at last read); Tempo's metrics-generator does the same server-side.

## Sampling

- **Head sampling**: decision at the start, e.g. probabilistic 5% by trace ID. Cheap, stateless, but cannot keep "all traces with an error". Collector: `probabilistic_sampler` (`sampling_percentage` required; `mode` `hash_seed` default, `proportional`, `equalizing`; the same `hash_seed` on all collectors of a tier).
- **Tail sampling**: decision after the trace is assembled (errors, latency, attributes, rates). Collector: `tail_sampling` (`decision_wait` default 30s, `num_traces` default 50000, `policies`: `status_code`, `latency`, `probabilistic`, `string_attribute`, `numeric_attribute`, `always_sample`, `and`, `drop`, `not`...). **Stateful**: all spans of one trace must reach the same instance; scaling out requires trace-ID-aware load balancing in front. It breaks context-dependent processors placed after it, so place `k8sattributes` before. Monitor the sampler's own memory.
- Combine: head-sample hard at the edge to protect the pipeline, tail-sample before the backend.
- Sample only when volume justifies it (OpenTelemetry suggests considering it from roughly 1000 traces/s); with little traffic keep 100%.

## Backends

- **Tempo** (Grafana): object-storage-backed trace store, queried by trace ID or TraceQL, integrates with Grafana ([grafana-datasources.yaml](templates/grafana-datasources.yaml): `tracesToLogsV2`, `tracesToMetrics`, `serviceMap`). Tempo 3.x config documents distributor, ingest, block-builder, live-store, metrics-generator, query-frontend, querier and backend scheduler/worker sections. No Tempo server template is shipped here: it could not be validated; start from the official docs for your version.
- **Jaeger** v2 (built on the OpenTelemetry Collector architecture; confirm in its docs) is an alternative UI/backend. Both accept OTLP; do not run both unless you need to migrate.

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/open-telemetry/opentelemetry.io/main/content/en/docs/collector/configuration.md
- https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/main/CHANGELOG.md (v1.71.0/v0.165.0, v0.158.0, v0.144.0 entries)
- https://opentelemetry.io/docs/concepts/sampling/
- https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor , .../probabilisticsamplerprocessor , .../exporter/prometheusremotewriteexporter READMEs
- https://raw.githubusercontent.com/grafana/alloy/v1.21.3/docs/sources/reference/components/otelcol/ (receiver.otlp, processor.batch, processor.memory_limiter, exporter.otlphttp, exporter.prometheus, exporter.loki)
- https://raw.githubusercontent.com/grafana/loki/v3.7.9/docs/sources/shared/otel.md
- https://raw.githubusercontent.com/prometheus/prometheus/v3.16.0/docs/feature_flags.md and querying/api.md (OTLP receiver)
- https://grafana.com/docs/tempo/latest/configuration/ ; GitHub latest-release redirects for tempo and jaeger

## Not verified

- `otelcol-contrib validate` was not run (not installed). `otel-collector.yaml` was only parsed as YAML; the exact YAML key for the `otlp_http` exporter `metrics_endpoint` and `tls.insecure` follows the Alloy equivalents and the collector's HTTP client settings, not a page read for the Collector.
- Jaeger v2 architecture statement is from memory; the Jaeger docs were not fetched.
- Whether `batch` is formally deprecated in favor of `queue_batch` (only "new processor to replace the legacy batchprocessor" and the startup warning were read).
- Tempo 3.x server/Helm install steps and TraceQL syntax were not read.
- `spanmetrics` connector stability was read as `alpha` from a README header that may vary per signal.
- Exact Prometheus flag semantics for delta OTLP ingestion beyond the two flag names.
