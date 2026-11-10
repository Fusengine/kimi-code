# Grafana as Code

**Load when:** provisioning datasources, dashboards or alerting resources from files; deciding where alert rules live.

Version read: Grafana **13.3.0** (GitHub release page; docs from the v13.3.0 tag). Templates: [grafana-datasources.yaml](templates/grafana-datasources.yaml), [grafana-dashboards-provider.yaml](templates/grafana-dashboards-provider.yaml), [grafana-alerting-routing.yaml](templates/grafana-alerting-routing.yaml).

## Principle

Everything that defines behavior lives in Git and is loaded at startup: the UI is for exploring, not for authoring. A provisioned datasource cannot be edited in the UI (Save is replaced by Test).

## Layout

```
/etc/grafana/provisioning/
├── datasources/*.yaml     # apiVersion: 1, datasources: [...]
├── dashboards/*.yaml      # apiVersion: 1, providers: [...]  -> point to JSON files on disk
├── alerting/*.yaml        # contactPoints, policies, muteTimes, groups (alert rules)
└── plugins/*.yaml
```

Config file location of `grafana.ini` for Deb/RPM packages: `/etc/grafana/grafana.ini`. Any setting can be overridden by env var `GF_<SECTION>_<KEY>` (e.g. `GF_SECURITY_ADMIN_USER`).

## Datasources

- Each entry: `name`, `type` (`prometheus`, `loki`, `tempo`, `alertmanager`, ...), `access: proxy`, `url`, a stable `uid`, `jsonData`, `secureJsonData` (encrypted, for passwords/tokens), `editable: false`.
- `deleteDatasources` removes listed ones; `prune: true` removes provisioned datasources that disappeared from the files.
- Set the Prometheus `jsonData.timeInterval` to the real scrape interval, otherwise `$__rate_interval` is computed wrongly.
- Correlation as config: Prometheus `exemplarTraceIdDestinations`, Loki `derivedFields` (regex on the log line -> Tempo trace), Tempo `tracesToLogsV2` / `tracesToMetrics` / `serviceMap`. These make "metric -> trace -> log" a click.
- Environment interpolation `${VAR}` is applied to the files; a literal dollar must be written `$$` (as in the derived-field URL).

## Dashboards

A `providers[]` entry of `type: file` scans `options.path` every `updateIntervalSeconds`. Useful flags: `disableDeletion`, `allowUiUpdates` (false = UI saves do not overwrite the file), `foldersFromFilesStructure`. Files are dashboard JSON (with `uid`, no `id`) or the Kubernetes resource format (`apiVersion: dashboard.grafana.app/v1`, required for dashboards v2 / dynamic dashboards). Review dashboard JSON diffs like code; avoid giant exported panels with hard-coded datasource IDs: reference datasources by `uid`.

On Kubernetes: sidecar ConfigMaps ([prometheus-operator-k8s.md](prometheus-operator-k8s.md)).

## Alerting resources

File provisioning can create, update or delete: alert rule groups (`groups[].rules[]` with `uid` <= 40 chars, `condition`, `data`, `for`, `noDataState`, `execErrState`), contact points (`contactPoints[].receivers[]`), notification policies (`policies`), mute timings (`muteTimes`), templates. Rules reference a datasource by `datasourceUid` and use expression nodes (`__expr__`).

**Where should an alert rule live?** Metric alerts: Prometheus rules (`PrometheusRule` / rule files) + Alertmanager: versioned with the service, evaluated by the server that owns the data, testable with `promtool test rules`. Grafana-managed rules only when the data source is not Prometheus-compatible (logs via Loki, SQL, mixed queries). Do not run the same alert in both places. The Grafana `Alertmanager` datasource with `implementation: prometheus` shows the external Alertmanager's alerts inside Grafana; `handleGrafanaManagedAlerts: true` additionally lets Grafana-managed alerts be sent to that Alertmanager.

Template for the Grafana alert-rule JSON model is intentionally absent: build the first rule in the UI, export it ("Export" in the alerting UI), then commit the exported provisioning file, instead of writing the query model by hand.

## Ops notes

- Grafana's own database holds users, orgs, annotations, and state: back it up (`devops-storage-backup`); provisioned config is reproducible, the DB is not.
- Change of datasource `uid` breaks every dashboard that references it: treat `uid` as an API.
- Restarting or redeploying production Grafana to apply provisioning is a proposal ([observability-safe-ops.md](observability-safe-ops.md)).

## Sources (read 2026-11-10)

- https://raw.githubusercontent.com/grafana/grafana/v13.3.0/docs/sources/administration/provisioning/index.md
- https://raw.githubusercontent.com/grafana/grafana/v13.3.0/docs/sources/alerting/set-up/provision-alerting-resources/file-provisioning/index.md
- https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/ , .../tempo/configure-tempo-data-source/provision/ , .../alertmanager/ , Loki datasource configure page (v13.3.0 tag)
- https://raw.githubusercontent.com/grafana/grafana/v13.3.0/docs/sources/setup-grafana/configure-grafana/_index.md (`GF_` env rule)
- https://github.com/grafana/grafana/releases/tag/v13.3.0

## Not verified

- Behavior of `handleGrafanaManagedAlerts` (only its existence in the Alertmanager datasource example was read).
- `$__rate_interval` dependence on the datasource scrape interval is standard Grafana behavior, not re-read today.
- Whether an "Export" action exists with that exact name in 13.3 alerting UI (the provisioning page mentions obtaining the `data` model through the API).
- `grafana-datasources.yaml` was not loaded into a running Grafana; only YAML parsing was checked.
- Terraform / Grafana operator provisioning paths were not covered.
