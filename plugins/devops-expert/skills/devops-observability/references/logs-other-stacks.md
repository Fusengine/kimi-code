# Other Log Stacks (pointers)

**Load when:** the user already runs, or must integrate with, OpenSearch/Elastic, or asks for Vector or Fluent Bit instead of Alloy. Default recommendation stays Loki + Alloy ([logs-loki-alloy.md](logs-loki-alloy.md)); this file only helps you route the work.

## When another stack is the right answer

| Situation | Stack | Why |
|-----------|-------|-----|
| Full-text search across log content, security/analytics use, existing Elasticsearch/OpenSearch skills | OpenSearch (+ OpenSearch Dashboards) or Elastic | Inverted index over message content; Loki indexes labels only and scans content at query time |
| Cheap long retention of high-volume operational logs queried mostly by label + time | Loki | Small index, chunks in object storage |
| Existing Fluent Bit / Vector deployment | Keep the agent, change the sink | Do not replace a working collector without a reason |

Index-everything stacks cost more storage and operations effort (shard sizing, lifecycle/retention policies, JVM heap): size them before adopting.

## Collectors and pipelines

- **Grafana Alloy** (default): Loki, Prometheus and OTLP in one binary ([logs-loki-alloy.md](logs-loki-alloy.md)).
- **Fluent Bit** (CNCF graduated project under Fluentd): a telemetry agent for logs, metrics, traces and profiles, with native OTLP ingestion and delivery and Prometheus integration, low resource use. Docs: https://docs.fluentbit.io/manual/ . It can ship to Loki, OpenSearch/Elastic and OTLP endpoints through its output plugins; check the plugin docs for your sink.
- **Vector**: pipeline model of sources, transforms (VRL, the Vector Remap Language) and sinks, with agent and aggregator deployment roles, buffering and end-to-end acknowledgements. Docs: https://vector.dev/docs/ .
- **OpenSearch Data Prepper**: ingestion service for OpenSearch with pipelines, processors (grok, parse JSON, aggregate...) and sinks (OpenSearch, S3, OTLP, Prometheus, ...). Docs: https://docs.opensearch.org/latest/data-prepper/ .
- **Elastic**: Elastic Agent / Beats into Elasticsearch, or OTLP into Elastic Observability. Docs: https://www.elastic.co/docs/solutions/observability/get-started .
- **OpenTelemetry Collector** can be the common gateway for any of them ([tracing-opentelemetry.md](tracing-opentelemetry.md)); Loki accepts OTLP natively at `/otlp`.

## Routing guidance

- Same label discipline applies everywhere: Kubernetes metadata (`namespace`, `app`, `container`) as fields; no unbounded values as index keys.
- Mask secrets and personal data at the collector (transform/redact stage) before any sink; logs are a common leak path.
- Security analytics on logs (SIEM rules, audits): outside this skill; use `fuse-security`.
- Deleting indices, data streams or snapshots in OpenSearch/Elastic is destructive: ACTION / EFFECT / PROOF / WAIT-FOR-GO ([observability-safe-ops.md](observability-safe-ops.md)).

## Sources (read 2026-11-10)

- https://docs.fluentbit.io/manual/about/what-is-fluent-bit
- https://vector.dev/docs/ (navigation and concept headings)
- https://docs.opensearch.org/latest/data-prepper/ (navigation: pipelines, processors, sinks)
- https://www.elastic.co/docs/solutions/observability/get-started (title and scope)

## Not verified

- No version of OpenSearch, Elastic, Vector, Fluent Bit or Data Prepper was checked today: do not quote versions from this file.
- Fluent Bit output plugin names for Loki/OpenSearch/Elastic and Vector sink names were not read.
- The Loki-versus-inverted-index comparison and the cost remark are architectural generalizations from the Loki label documentation, not benchmarks.
- No config templates are provided for these stacks on purpose (nothing could be validated).
