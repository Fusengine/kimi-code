# Long-Term Storage (pointers)

**Load when:** one Prometheus no longer meets retention, durability, HA or multi-cluster query needs. This file is deliberately pointer-level: pick an option, then read that project's official docs.

## First decide whether you need it

Prometheus local TSDB is a single-node database ("not clustered or replicated", per its storage page) but with proper sizing holds years of data on one disk. Stay local if: one cluster, retention fits the disk, losing the disk is acceptable or you back up with snapshots. Reach for long-term storage when you need: retention beyond a disk, durability off the node, one query endpoint across clusters/replicas, or multi-tenant isolation.

## Options

| Option | Model | Ingest path | Pick when | Docs |
|--------|-------|-------------|-----------|------|
| **Thanos** (latest tag read: v0.42.5) | Sidecar or Receive next to Prometheus, object storage for blocks, Query layer over all | Sidecar uploads TSDB blocks; Receive accepts remote write | You keep Prometheus as is and add global view + cheap retention in S3/GCS | https://thanos.io/ |
| **Grafana Mimir** (mimir-3.2.4) | Horizontally scalable multi-tenant TSDB, Prometheus-compatible | Remote write to `/api/v1/push` | Many tenants/clusters, big scale, you already run the Grafana stack | https://grafana.com/docs/mimir/latest/ |
| **VictoriaMetrics** (v1.156.0) | Single-node or cluster; `vmagent` for scrape/forward; MetricsQL superset | Remote write or `vmagent` | Resource-efficient drop-in store; simple single-node is often enough | https://docs.victoriametrics.com/ |

Mimir 3.x documents several supported architectures starting with 3.0 and a monolithic mode (`-target`) for evaluation.

## Prometheus-side wiring

- Remote write: `remote_write` with `url`, `name`, `write_relabel_configs` and `queue_config` ([prometheus-config.md](prometheus-config.md)). Start with all series, then filter once you know what dashboards and alerts need.
- Set unique `external_labels` per Prometheus (`cluster`, `replica`): Thanos/Mimir use the replica label for HA deduplication.
- Alerting and recording rules still evaluate on the local Prometheus unless you run the backend's ruler.
- Remote-write 2.0 (`io.prometheus.write.v2.Request`) sends metadata, start timestamps and native histograms by default; confirm the backend supports it before switching `protobuf_message`.
- `chunk_encoding.floats: xor2` can make blocks unreadable by Thanos sidecar uploads or older tools: leave it off when feeding LTS systems that do not support it.
- Grafana Alloy can be the remote-write client instead of Prometheus (`prometheus.remote_write`, Mimir example URL `http://mimir:9009/api/v1/push`, tenant header `X-Scope-OrgID`).

## Capacity and cost levers

Series count (cardinality) drives cost everywhere: control it before you ship data off the node. Downsampling, compaction and retention knobs are product-specific: read the product docs; they are not described here.

Deleting tenants, buckets or object-storage data of a long-term store is irreversible: ACTION / EFFECT / PROOF / WAIT-FOR-GO ([observability-safe-ops.md](observability-safe-ops.md)). Backups of the object store belong to `devops-storage-backup`.

## Sources (read 2026-11-10)

- https://prometheus.io/docs/prometheus/latest/storage/ (single-node limits, Thanos sidecar-compatible block caveat via config reference)
- https://grafana.com/docs/mimir/latest/get-started/about-grafana-mimir-architecture/
- https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/ (navigation: vmagent, Prometheus, Thanos, Mimir pages exist)
- https://raw.githubusercontent.com/grafana/alloy/v1.21.3/docs/sources/reference/components/prometheus/prometheus.remote_write.md (Mimir URL and tenant header example)
- GitHub `/releases/latest` of thanos-io/thanos, grafana/mimir, VictoriaMetrics/VictoriaMetrics

## Not verified

- Thanos component behavior (sidecar, receive, store gateway, compactor) was not read from thanos.io; the table row describes it from general knowledge.
- VictoriaMetrics `vmagent` roles and MetricsQL claims come from site navigation only.
- Mimir ingest URL `/api/v1/push` is confirmed only through the Alloy example, not the Mimir HTTP API page.
- No sizing numbers are given: none were read.
