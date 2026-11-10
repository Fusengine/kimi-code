# Prometheus Operator and kube-prometheus-stack

**Load when:** monitoring a Kubernetes cluster, writing ServiceMonitor / PodMonitor / PrometheusRule objects, or installing/upgrading the stack.

Versions read 2026-11-10: Prometheus Operator **v0.95.1** (release 2026-11-05); Helm chart **kube-prometheus-stack 93.1.1** (appVersion v0.95.1, `kubeVersion >=1.25.0-0`, `main` branch Chart.yaml; published-release listing not checked). Workload basics: `devops-kubernetes`; chart/GitOps delivery: `devops-gitops-packaging`.

## CRDs (group `monitoring.coreos.com`)

| Kind | apiVersion | Purpose |
|------|-----------|---------|
| `Prometheus`, `Alertmanager`, `ThanosRuler` | `v1` | The servers the operator runs |
| `ServiceMonitor` | `v1` | Scrape the endpoints behind a **Service** |
| `PodMonitor` | `v1` | Scrape Pods directly (no Service) |
| `Probe` | `v1` | Blackbox probes of static targets or Ingresses |
| `PrometheusRule` | `v1` | Recording and alerting rules (same `groups` shape as a rule file) |
| `ScrapeConfig` | `v1alpha1` | Raw scrape config incl. non-Kubernetes SD (file, DNS, Consul, static...) |
| `AlertmanagerConfig` | `v1alpha1`, `v1beta1` | Namespaced routing/receivers merged into Alertmanager |

## How selection works (the usual "my target is missing")

1. The `Prometheus` object selects monitors with `serviceMonitorSelector`, `podMonitorSelector`, `probeSelector`, `scrapeConfigSelector`, `ruleSelector`, and namespaces with the matching `*NamespaceSelector`.
2. kube-prometheus-stack sets those selectors to the Helm release label unless `prometheus.prometheusSpec.<kind>SelectorNilUsesHelmValues: false` (chart default `true`). So a ServiceMonitor without `release: <helm-release>` is silently ignored. Either label your objects or set the flags to `false` (see [kube-prometheus-stack-values.yaml](templates/kube-prometheus-stack-values.yaml)).
3. A ServiceMonitor `selector` matches **Service** labels; `endpoints[].port` is the **Service port name**. A PodMonitor `podMetricsEndpoints[].port` is the **container port name**. A number-only port needs `targetPort` (ServiceMonitor).
4. `namespaceSelector` defaults to the monitor's own namespace; use `matchNames` or `any: true`.

Templates: [servicemonitor.yaml](templates/servicemonitor.yaml) (ServiceMonitor + PodMonitor), [prometheusrule.yaml](templates/prometheusrule.yaml).

Useful spec fields (v0.95.1 API reference): ServiceMonitor `jobLabel`, `targetLabels`, `podTargetLabels`, `selectorMechanism`, `sampleLimit`, `targetLimit`, `labelLimit`, `keepDroppedTargets`, `scrapeProtocols`, `fallbackScrapeProtocol`, `scrapeClass`, `bodySizeLimit`, `attachMetadata`, `serviceDiscoveryRole`, and native-histogram switches `scrapeNativeHistograms`, `scrapeClassicHistograms`, `convertClassicHistogramsToNHCB`; per endpoint `port`, `targetPort`, `path`, `scheme`, `params`, `interval`, `scrapeTimeout`, `honorLabels`, `relabelings`, `metricRelabelings`, `tlsConfig`, `authorization`, `basicAuth`, `bearerTokenSecret`. Rule groups accept `name`, `labels`, `interval`, `query_offset`, `limit`, `rules`.

## Installing and upgrading kube-prometheus-stack

- Chart sub-charts: kube-state-metrics, prometheus-node-exporter, grafana, prometheus-windows-exporter.
- **Persistence**: chart defaults leave `prometheus.prometheusSpec.storageSpec` and `alertmanager.alertmanagerSpec.storage` as `{}` = emptyDir. Metrics and silences are lost on reschedule: set a `volumeClaimTemplate`.
- Retention: `prometheusSpec.retention` (chart default `10d`), `retentionSize` (default empty); Alertmanager `retention` default `120h`.
- **CRDs are not upgraded by Helm**: `crds.enabled` installs them once; the chart offers `crds.upgradeJob.enabled` (documented as preview, off by default). Read the chart's upgrade notes for each major before `helm upgrade`; chart majors are frequent.
- Control-plane scrapes (`kubeEtcd`, `kubeControllerManager`, `kubeScheduler`, `kubeProxy`) are enabled by default but fail on managed clusters or kubeadm defaults bound to localhost: disable or fix endpoints/ports per cluster (`devops-k8s-cluster`).
- Default rules (`defaultRules.create`) ship many alerts; tune per group, never copy-delete blindly.
- `helm upgrade`, CRD apply, PVC changes and deletions are proposals: [observability-safe-ops.md](observability-safe-ops.md).

## Dashboards as code on Kubernetes

Grafana sidecar (`grafana.sidecar.dashboards.enabled`) loads ConfigMaps labeled `grafana_dashboard: "1"` from all namespaces (`searchNamespace: ALL`). Keep the JSON in Git and ship it as ConfigMaps through GitOps. Details: [grafana-as-code.md](grafana-as-code.md).

## Verify

```bash
kubectl --context "$CTX" get crd | grep monitoring.coreos.com
kubectl --context "$CTX" -n monitoring get prometheus,alertmanager,servicemonitor,podmonitor,prometheusrule
kubectl --context "$CTX" -n monitoring port-forward svc/<prometheus-svc> 9090   # then Status -> Targets / Rules
```

If a target is absent: check selectors (point 1-2), the Service port name, the `release` label, and RBAC of the Prometheus ServiceAccount for the target namespace.

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/v0.95.1/Documentation/api-reference/api.md
- https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/Chart.yaml and values.yaml
- https://github.com/prometheus-operator/prometheus-operator/releases/tag/v0.95.1

## Not verified

- Which chart version is the latest *published* release (only `main` was read).
- Chart default for `kubeEtcd`/`kubeScheduler`... failing on managed clusters is a field-experience statement; the values only show `enabled: true`.
- Default of `namespaceSelector` (own namespace) and the `Probe` target kinds are standard Operator behavior, not re-read in the API reference today.
- `AlertmanagerConfig` v1beta1 field differences from v1alpha1 were not compared.
- RBAC details for cross-namespace scraping were not read.
