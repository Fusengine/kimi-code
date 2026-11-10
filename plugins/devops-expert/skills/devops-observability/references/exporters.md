# Exporters

**Load when:** adding host, container, probe or Kubernetes-object metrics, or tuning what an exporter exposes.

Latest tags read on GitHub `/releases/latest` redirects, 2026-11-10: node_exporter v1.12.1, blackbox_exporter v0.29.1, cAdvisor v0.60.6, kube-state-metrics v2.20.0, Pushgateway v1.11.4. Release dates were not read.

## node_exporter (hosts)

- Linux host metrics (CPU, memory, filesystem, network, load, systemd, ...). Enabled-by-default collectors can be switched off with `--no-collector.<name>`; to run only chosen ones: `--collector.disable-defaults --collector.<name> ...`.
- Containerised: needs the host namespaces and a read-only root mount, and `--path.rootfs` pointing at it, otherwise it reports the container, not the host:

```bash
docker run -d --net=host --pid=host -v "/:/host:ro,rslave" quay.io/prometheus/node-exporter:v1.12.1 --path.rootfs=/host
```

- `--collector.systemd` (with `--collector.systemd.unit-include` / `-exclude`) exposes unit states; `logind` is separate.
- **Textfile collector**: `--collector.textfile.directory=DIR` reads `*.prom` files: the way to publish cron/batch results ("last success timestamp") without a Pushgateway. Write files atomically (write temp, then rename).
- Transport security: `--web.config.file=web-config.yml` (TLS and basic auth) per the exporter-toolkit format.
- When Grafana Alloy runs on the host, `prometheus.exporter.unix` embeds the same collectors ([alloy-host.alloy](templates/alloy-host.alloy)): run **one** of node_exporter or Alloy's unix exporter per host.

## blackbox_exporter (outside-in probes)

Probers: `http`, `tcp`, `dns`, `icmp`, `grpc`, `unix`. Modules live in `blackbox.yml` ([template](templates/blackbox.yml)); Prometheus calls `/probe?target=URL&module=NAME`. Use the multi-target relabel pattern in [prometheus.yml](templates/prometheus.yml): `__address__` -> `__param_target`, then `__address__` -> exporter address. Debug one probe by hand with `&debug=true`.

- The module default `preferred_ip_protocol` is `ip6`: set `ip4` explicitly on IPv4-only networks or probes fail with a misleading error.
- Probe timeout must be below the job's `scrape_timeout`.
- HTTP probes accept a `hostname` parameter (Host header and SNI), useful with DNS service discovery.
- Alert on `probe_success == 0` and on certificate expiry (`probe_ssl_earliest_cert_expiry - time()`).

## cAdvisor (containers)

Per-container CPU, memory, network, filesystem for Docker/containerd hosts. Run with `/`, `/var/run`, `/sys` and `/var/lib/docker` mounted read-only; image `ghcr.io/google/cadvisor` (older than v0.53.0: `gcr.io/cadvisor/cadvisor`). On Kubernetes the kubelet already embeds cAdvisor: scrape the kubelet's cAdvisor endpoint (kube-prometheus-stack does) instead of deploying another one.

Cost control flags: `--store_container_labels=false` (do not turn container labels/env into metric labels) with `--whitelisted_container_labels`, `--docker_only=true`, `--disable_metrics=...` (default-disabled set includes `tcp`, `udp`, `process`, `sched`...), `--housekeeping_interval`. Process metrics need `--pid=host --privileged`.

## kube-state-metrics (Kubernetes objects)

Exposes object state from the API (pods, deployments, nodes, PVCs, jobs...), **not** resource usage (that is cAdvisor/kubelet and metrics-server). Defaults enable most resources (`--resources`). Labels and annotations of objects are **not** exposed by default: opt in with `--metric-labels-allowlist=pods=[app,team]` style values; `*` allows everything and has severe performance cost. Limit series with `--metric-allowlist` (exact names or regex) / `--metric-denylist`. kube-prometheus-stack deploys it as a subchart.

## Pushgateway

Only for service-level batch jobs that cannot be scraped. It never forgets pushed series until deleted, so stale metrics keep alerting; prefer the node_exporter textfile collector for host cron jobs. Not covered further.

## Platform exporters (pointers)

Proxmox (`pve-exporter`), Ceph (built-in manager Prometheus module), OpenStack and other platform exporters: see the owning sibling skill (`devops-virtualization`, `devops-openstack`) for deployment; scrape and alert patterns here still apply.

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/prometheus/node_exporter/v1.12.1/README.md
- https://raw.githubusercontent.com/prometheus/blackbox_exporter/v0.29.1/README.md and CONFIGURATION.md
- https://raw.githubusercontent.com/google/cadvisor/v0.60.6/docs/running.md and docs/runtime_options.md
- https://raw.githubusercontent.com/kubernetes/kube-state-metrics/v2.20.0/docs/developer/cli-arguments.md
- GitHub `/releases/latest` of each project (versions)

## Not verified

- Pushgateway behavior (series persist until deleted) and the kubelet-embedded cAdvisor statement are well-known facts, not re-read from official pages today.
- `probe_ssl_earliest_cert_expiry` metric name used in [rules-alerts.yml](templates/rules-alerts.yml) was not located in the exporter source today.
- `node_memory_MemAvailable_bytes`, `node_filesystem_*` metric names in the templates follow node_exporter naming; not re-checked per collector.
- Atomic-write advice for textfile files comes from the exporter README section that was not re-read in full.
- The Ceph manager module and `pve-exporter` were not looked at.
