# Prometheus Server Configuration

**Load when:** writing or reviewing `prometheus.yml`, rule files, retention, remote write, or sizing a Prometheus.

Template: [prometheus.yml](templates/prometheus.yml). Validate with `promtool check config prometheus.yml` and `promtool check rules <file>` (exit 0 = valid, 1 = error); `promtool` ships in the Prometheus archive.

## Release line

Prometheus cuts a minor every 6 weeks; non-LTS minors stop getting fixes after that. **LTS = 3.13** (released 2026-07-01, supported to 2027-07-31); latest is 3.16.0 (2026-11-04). Pick LTS for a server you rarely touch, latest for new features. LTS does not cover experimental feature flags. Check the release notes before every minor upgrade: 3.16.0 for example changes the default `--web.external-url` to https when TLS is on.

## File layout

```
global:            scrape_interval (default 1m), scrape_timeout (10s, <= interval), evaluation_interval (1m),
                   external_labels, sample_limit / label_limit / target_limit (0 = unlimited)
rule_files:        globs of rule files
scrape_config_files: globs of extra scrape-config files (split big configs)
scrape_configs:    one job per kind of target
alerting:          alertmanagers + alert_relabel_configs
remote_write / remote_read, storage (tsdb, exemplars), otlp, tracing
```

Retention, listen address and the data path are **command-line flags**, not file keys.

## Service discovery (pick by where targets live)

| Mechanism | Key | Use for |
|-----------|-----|---------|
| Static | `static_configs` | Few fixed targets |
| File | `file_sd_configs` | Anything automated (Ansible/Terraform writes a file); changes apply without reload ([file-sd-nodes.yml](templates/file-sd-nodes.yml)) |
| Kubernetes | `kubernetes_sd_configs` role `node`, `service`, `pod`, `endpoints`, `endpointslice` | In-cluster; prefer the Operator CRDs ([prometheus-operator-k8s.md](prometheus-operator-k8s.md)) |
| DNS / Consul / EC2 / Docker / Swarm / HTTP / OpenStack | `dns_sd_configs`, `consul_sd_configs`, ... | As the platform dictates |

`endpoints` is documented as superseded by `endpointslice`.

## Relabeling in one page

- `relabel_configs`: runs on the **target** before the scrape. Discovery metadata is in `__meta_*` labels; labels starting `__` are removed afterwards. Use `__tmp` prefix for scratch labels.
- `metric_relabel_configs`: runs on **samples** after the scrape, before ingestion. Does not touch auto-generated series such as `up`. This is the tool to drop expensive series.
- `alert_relabel_configs`: on alerts before they go to Alertmanager. `write_relabel_configs`: before remote write.
- Actions: `replace` (default), `keep`, `drop`, `labelmap`, `labeldrop`, `labelkeep`, `hashmod`, `lowercase`, `uppercase`, `keepequal`, `dropequal`. Regexes are RE2 and **anchored** on both ends.
- Common pattern: `keep` only pods annotated for scraping; `replace` to set `__address__` from an annotation; `labeldrop` of noisy labels (check the series stay unique).

## Guardrails against cardinality blow-ups

- `sample_limit`, `label_limit`, `target_limit` (global or per job): a scrape that exceeds the limit **fails entirely**. This protects the TSDB and surfaces the culprit via `up == 0`.
- `label_name_length_limit`, `label_value_length_limit` and `body_size_limit` exist next to them (all default `0` = off).
- Find the heavy metrics: `topk(10, count by (__name__) ({__name__=~".+"}))` (expensive: run off-peak) and the TSDB status page / `prometheus_tsdb_head_series`.
- Fix at the source first (stop exporting the label), then `metric_relabel_configs`.

## Rules

- Rule files hold `groups:`; each group has `name`, optional `interval`, `limit`, `query_offset`, and `rules` of `record:` or `alert:` kind. Rules in a group run **sequentially**; a group that overruns its interval skips evaluations (`rule_group_iterations_missed_total`).
- Alert fields: `for` (pending time), `keep_firing_for` (damps flapping), `labels`, `annotations` (templated with `$labels`, `$value`, `$externalLabels`). Templates: [rules-alerts.yml](templates/rules-alerts.yml), [rules-recording.yml](templates/rules-recording.yml).
- Reload rules and config: `SIGHUP`, or `POST /-/reload` if started with `--web.enable-lifecycle`. Changes apply only if **all** files are well-formed. A production reload is a proposal ([observability-safe-ops.md](observability-safe-ops.md)).

## Storage and retention

- Retention flags: `--storage.tsdb.retention.time` (default `15d` when neither flag is set) and `--storage.tsdb.retention.size`; whichever triggers first wins. Only persistent blocks are deleted; WAL counts toward the size. Cleanup can lag up to two hours.
- Capacity: `needed_disk = retention_seconds * samples_per_second * bytes_per_sample` (1-2 bytes/sample typical). Reduce series first, scrape interval second.
- Local filesystem only: NFS and EFS are **not supported** (corruption risk).
- Backups: use the snapshot API (needs `--web.enable-admin-api`), or copy blocks while excluding `chunks_head/`, `wal/`, `wbl/`.
- Out-of-order samples: `storage.tsdb.out_of_order_time_window` (config file, default `0s`).
- `chunk_encoding.floats: xor2` gives better compression but older Prometheus versions and downstream LTS tools may not read it: do not enable it if you might downgrade or upload blocks to Thanos.

## Remote write

`remote_write[]` takes `url`, optional `name`, `write_relabel_configs`, `queue_config` (defaults: `capacity` 10000, `max_shards` 50, `min_shards` 1, `max_samples_per_send` 2000, `batch_send_deadline` 5s), `protobuf_message` (default `prometheus.WriteRequest`; `io.prometheus.write.v2.Request` = Remote Write 2.0, check that the receiver supports it first). Filter with `write_relabel_configs` to send only what the long-term store needs. Watch `prometheus_remote_storage_*` metrics for lag. Backends: [long-term-storage.md](long-term-storage.md).

## Native histograms (opt-in)

`scrape_native_histograms` (global or per job) defaults to `false`. When true, the default `scrape_protocols` order puts `PrometheusProto` first. Related: `convert_classic_histograms_to_nhcb`, `always_scrape_classic_histograms`. Query side: [promql-essentials.md](promql-essentials.md). Enable per job, verify the dashboards, then widen.

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/prometheus/prometheus/v3.16.0/docs/configuration/configuration.md
- https://prometheus.io/docs/prometheus/latest/storage/
- https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/ and .../alerting_rules/
- https://prometheus.io/docs/prometheus/latest/management_api/
- https://prometheus.io/docs/introduction/release-cycle/
- https://github.com/prometheus/prometheus/releases/tag/v3.16.0 and raw CHANGELOG.md (3.16.0 entries)

## Not verified

- LTS patch number: the research doc lists 3.13.5; the 3.16.0 changelog read here stops at 3.13.2 for that line, so the current 3.13.x patch was not confirmed.
- The "4x scrape interval" minimum for `rate()` ranges is common guidance, not a statement from the pages read.
- `promtool` and `amtool` are not installed on the authoring host: no template was linted with them.
- Defaults of `--storage.tsdb.retention.size` right-sizing percentages (page truncated before the recommendation).
