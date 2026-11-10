---
name: devops-observability
description: Use when designing, writing, reviewing or debugging monitoring, logging or tracing - Prometheus (scrape config, service discovery, relabeling, recording and alerting rules, retention, remote write, cardinality), PromQL and histograms, Alertmanager routing/grouping/inhibition/silences, exporters (node, blackbox, cAdvisor, kube-state-metrics), kube-prometheus-stack and Prometheus Operator CRDs (ServiceMonitor, PodMonitor, PrometheusRule), long-term storage choices (Thanos, Mimir, VictoriaMetrics), Grafana provisioning as code, Loki with Grafana Alloy (Promtail is end of life), LogQL, OpenTelemetry Collector pipelines, sampling, Tempo/Jaeger, alert design and observability troubleshooting. Not for SLO and error-budget method or incident response (devops-sre-ops), Kubernetes workloads (devops-kubernetes), host OS tuning (devops-linux) or SaaS vendor products.
versions:
  prometheus: "3.16.0 (2026-11-04); LTS 3.13 (supported to 2027-07-31)"
  alertmanager: "0.35.0 (2026-11-09)"
  grafana: "13.3.0"
  loki: "3.7.9"
  grafana-alloy: "1.21.3 (2026-10-28)"
  opentelemetry-collector: "0.165.0 (core 1.71.0)"
  prometheus-operator: "0.95.1 (2026-11-05); kube-prometheus-stack chart 93.1.1 (main)"
  exporters: "node_exporter 1.12.1, blackbox_exporter 0.29.1, cAdvisor 0.60.6, kube-state-metrics 2.20.0"
references:
  - references/signals-and-method.md
  - references/prometheus-config.md
  - references/promql-essentials.md
  - references/alertmanager.md
  - references/exporters.md
  - references/prometheus-operator-k8s.md
  - references/long-term-storage.md
  - references/grafana-as-code.md
  - references/logs-loki-alloy.md
  - references/logs-other-stacks.md
  - references/tracing-opentelemetry.md
  - references/alert-design.md
  - references/observability-safe-ops.md
  - references/troubleshooting-playbook.md
  - references/templates/prometheus.yml
  - references/templates/file-sd-nodes.yml
  - references/templates/blackbox.yml
  - references/templates/rules-alerts.yml
  - references/templates/rules-recording.yml
  - references/templates/alertmanager.yml
  - references/templates/servicemonitor.yaml
  - references/templates/prometheusrule.yaml
  - references/templates/kube-prometheus-stack-values.yaml
  - references/templates/grafana-datasources.yaml
  - references/templates/grafana-dashboards-provider.yaml
  - references/templates/grafana-alerting-routing.yaml
  - references/templates/loki-config.yaml
  - references/templates/alloy-host.alloy
  - references/templates/alloy-k8s-logs.alloy
  - references/templates/alloy-otlp.alloy
  - references/templates/otel-collector.yaml
  - references/templates/docker-compose-monitoring.yaml
related-skills:
  - devops-sre-ops
  - devops-kubernetes
  - devops-k8s-cluster
  - devops-gitops-packaging
  - devops-docker
  - devops-linux
  - devops-networking
  - devops-storage-backup
  - devops-virtualization
---

<objective>
Covers the three observability signals for an IT/DevOps estate: Prometheus metrics
and rules, Alertmanager routing, exporters, the Kubernetes Operator stack,
Grafana as code, Loki logs collected by Grafana Alloy, OpenTelemetry tracing and
sampling, alert design, and troubleshooting the pipeline itself. Does not cover
SLO/error-budget design and incident response (devops-sre-ops), workload
manifests (devops-kubernetes) or SaaS vendor products.
</objective>

# DevOps Observability

## Agent Workflow (MANDATORY)

Before ANY monitoring config or change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find existing `prometheus.yml`, rule files, Alertmanager/Loki/Alloy/Collector configs, Helm values, dashboards, ServiceMonitors
2. **research-expert** - verify option names for the deployed version at prometheus.io, grafana.com/docs, opentelemetry.io (the OpenTelemetry Collector renames components between 0.x releases)
3. **mcp__context7__query-docs** - Prometheus, Grafana, Loki, OpenTelemetry docs

Then discover read-only (running versions, `promtool check`, `amtool check-config`, `alloy validate`). After writing files, run **sniper**. Live changes follow the agent's Operations Safety Protocol and [observability-safe-ops.md](references/observability-safe-ops.md).

## Versions (checked 2026-11-10)

Prometheus 3.16.0 is latest; **LTS 3.13** is the conservative choice. Alertmanager 0.35.0 has breaking flag/config changes (event recorder outputs need a `name`). **Promtail reached end of life on 2026-03-02**: collect logs with Grafana Alloy. The OpenTelemetry Collector renamed `otlp` to `otlp_grpc`, `otlphttp` to `otlp_http`, and added a `queue_batch` processor meant to replace `batch`; read its changelog before every 0.x bump.

## Overview

| Need | Decision in one line |
|------|----------------------|
| **What to instrument** | USE for resources, RED for services, golden signals at the edge; plus a blackbox probe of every user-facing URL |
| **Metrics store** | Prometheus (local TSDB, retention by time AND size flags); long-term via remote write to Mimir/Thanos/VictoriaMetrics only when needed |
| **Alerts** | Symptom-based, `for:` + `keep_firing_for`, severity `page`/`ticket`, every alert has `runbook_url`; routing and inhibition in Alertmanager |
| **Kubernetes** | kube-prometheus-stack; ServiceMonitor/PodMonitor/PrometheusRule; check the `release` label selectors and PVCs |
| **Logs** | Loki + Alloy; few static labels, rest in structured metadata; retention by the compactor |
| **Traces** | OpenTelemetry SDK -> Collector/Alloy (OTLP 4317/4318) -> Tempo; tail-sample errors and slow traces |
| **Dashboards/alerts as code** | Grafana provisioning files in Git; metric alerts live in Prometheus, not Grafana |

## Critical Rules

1. **Version first** - read the running versions and the config of the target before writing an option; renames and removals are frequent (OpenTelemetry Collector, Alertmanager, Prometheus 3.x)
2. **Validate offline before any reload** - `promtool check config|rules`, `amtool check-config`, `alloy validate`, `otelcol validate`; reloading production is a proposal in ACTION / EFFECT / PROOF / WAIT-FOR-GO format ([observability-safe-ops.md](references/observability-safe-ops.md))
3. **Cardinality is the budget** - no unbounded label values (user IDs, trace IDs, pod names as Loki labels); use `sample_limit`/`label_limit`, `metric_relabel_configs`, recording rules
4. **Destructive verbs are proposed, not run** - admin-API series deletion, shrinking retention, Loki delete requests, removing PVCs/buckets, mass silences, `helm uninstall`
5. **Persistent storage or it is not monitoring** - emptyDir/no volume loses metrics and silences on restart
6. **Never print secrets** - receivers use `*_file` options; Grafana `secureJsonData`; no tokens in configs or logs
7. **Monitor the monitoring** - Watchdog alert to an external dead man's switch, scrape and notification-failure alerts
8. **Never invent a key or metric name** - cite the page for the version; unknown = "not verified"

## Architecture

```
monitoring/
├── prometheus.yml            # global, scrape_configs, alerting, (remote_write)
├── rules/                    # alerts and recording rules (promtool-checked)
├── alertmanager.yml          # route tree, inhibit_rules, receivers (secrets as files)
├── blackbox.yml              # probe modules
├── alloy/*.alloy             # logs (Loki), host metrics, OTLP gateway
├── otel-collector.yaml       # OpenTelemetry Collector gateway (if used instead of Alloy)
├── loki-config.yaml          # storage, schema, compactor retention
└── grafana/
    ├── provisioning/{datasources,dashboards,alerting}/
    └── dashboards/*.json
```

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Signals and method** | [signals-and-method.md](references/signals-and-method.md) | Deciding what to instrument first |
| **Prometheus config** | [prometheus-config.md](references/prometheus-config.md) | Scrape, SD, relabeling, rules, retention, remote write, cardinality |
| **PromQL** | [promql-essentials.md](references/promql-essentials.md) | Queries, histograms, native histograms, pitfalls |
| **Alertmanager** | [alertmanager.md](references/alertmanager.md) | Routing, grouping, inhibition, silences, receivers |
| **Exporters** | [exporters.md](references/exporters.md) | node, blackbox, cAdvisor, kube-state-metrics |
| **Operator / K8s** | [prometheus-operator-k8s.md](references/prometheus-operator-k8s.md) | CRDs, kube-prometheus-stack, missing targets |
| **Long-term storage** | [long-term-storage.md](references/long-term-storage.md) | Thanos, Mimir, VictoriaMetrics pointers |
| **Grafana** | [grafana-as-code.md](references/grafana-as-code.md) | Provisioning datasources, dashboards, alerting |
| **Loki and Alloy** | [logs-loki-alloy.md](references/logs-loki-alloy.md) | Collection, labels, LogQL, retention, Promtail migration |
| **Other log stacks** | [logs-other-stacks.md](references/logs-other-stacks.md) | OpenSearch/Elastic, Vector, Fluent Bit |
| **Tracing** | [tracing-opentelemetry.md](references/tracing-opentelemetry.md) | Collector pipelines, OTLP, sampling, Tempo/Jaeger |
| **Alert design** | [alert-design.md](references/alert-design.md) | Writing and pruning alerts |
| **Safe ops** | [observability-safe-ops.md](references/observability-safe-ops.md) | Any reload, restart, deletion, silence |
| **Troubleshooting** | [troubleshooting-playbook.md](references/troubleshooting-playbook.md) | Missing data, silent alerts, slow or full stores |

### Templates

| Template | When to Use |
|----------|-------------|
| [prometheus.yml](references/templates/prometheus.yml) | Server config with SD, relabeling, blackbox, limits |
| [file-sd-nodes.yml](references/templates/file-sd-nodes.yml) | File-based target list |
| [blackbox.yml](references/templates/blackbox.yml) | Probe modules |
| [rules-alerts.yml](references/templates/rules-alerts.yml) | Symptom alerts with runbook links, Watchdog |
| [rules-recording.yml](references/templates/rules-recording.yml) | Recording rules, level:metric:operations |
| [alertmanager.yml](references/templates/alertmanager.yml) | Route tree, inhibition, time intervals, receivers |
| [servicemonitor.yaml](references/templates/servicemonitor.yaml) | ServiceMonitor + PodMonitor |
| [prometheusrule.yaml](references/templates/prometheusrule.yaml) | PrometheusRule |
| [kube-prometheus-stack-values.yaml](references/templates/kube-prometheus-stack-values.yaml) | Helm values: retention, PVC, selectors |
| [grafana-datasources.yaml](references/templates/grafana-datasources.yaml) | Prometheus, Loki, Tempo, Alertmanager datasources |
| [grafana-dashboards-provider.yaml](references/templates/grafana-dashboards-provider.yaml) | Dashboard file provider |
| [grafana-alerting-routing.yaml](references/templates/grafana-alerting-routing.yaml) | Contact point + notification policy |
| [loki-config.yaml](references/templates/loki-config.yaml) | Single-binary Loki with compactor retention |
| [alloy-host.alloy](references/templates/alloy-host.alloy) | Host metrics + log files |
| [alloy-k8s-logs.alloy](references/templates/alloy-k8s-logs.alloy) | Pod logs on Kubernetes |
| [alloy-otlp.alloy](references/templates/alloy-otlp.alloy) | OTLP gateway in Alloy |
| [otel-collector.yaml](references/templates/otel-collector.yaml) | Collector gateway with tail sampling |
| [docker-compose-monitoring.yaml](references/templates/docker-compose-monitoring.yaml) | Single-host stack |

## Quick Reference

```bash
promtool check config prometheus.yml && promtool check rules rules-*.yml
amtool check-config alertmanager.yml
amtool config routes test --config.file=alertmanager.yml --tree severity=page team=sre
alloy validate /etc/alloy/config.alloy
otelcol-contrib validate --config=otel-collector.yaml
curl -s http://prometheus:9090/-/ready ; curl -s http://loki:3100/ready
```

## Best Practices

### DO
- Pin image and chart versions; read the release notes of each jump (Alertmanager 0.35, OpenTelemetry 0.x, kube-prometheus-stack majors)
- Alert on user-visible symptoms; link a runbook; group and inhibit in Alertmanager
- Keep dashboards, rules, datasources and Alloy/Collector configs in Git; deliver via GitOps (devops-gitops-packaging)
- Bind monitoring ports to localhost or an authenticated proxy; use TLS between sites

### DON'T
- Enable `--web.enable-admin-api` or `--web.enable-lifecycle` on an exposed port
- Use `irate` in alerts or label metrics/logs with unbounded values
- Run Promtail or a second host-metrics collector next to Alloy/node_exporter
- Duplicate the same alert in Prometheus and Grafana
