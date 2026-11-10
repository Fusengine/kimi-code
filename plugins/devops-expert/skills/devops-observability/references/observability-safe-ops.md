# Safe Operation of Monitoring Systems

**Load when:** about to change, reload, restart, delete or silence anything on a live Prometheus, Alertmanager, Loki, Grafana or collector. Read-only commands (queries, `promtool check`, `amtool check-config`, `amtool silence query`, `GET` APIs, `kubectl get`) need no go.

Monitoring is the system you use during an incident: a mistake here blinds you exactly when it matters. Follow the agent's Operations Safety Protocol: discover read-only, validate offline, **show the block below, wait for the go**, apply, verify, roll back.

## Proposal format (one block per action)

```
ACTION       <the exact command, with host/context/namespace/tenant>
EFFECT       <what changes, what data is lost, who is affected, reversible or not>
PROOF        <read-only evidence gathered first: validation output, current values, backup/snapshot existence>
WAIT-FOR-GO  waiting for your explicit go on this action only
```

## Catalog

### 1. Reload Prometheus or Alertmanager configuration

```
ACTION       curl -X POST http://prometheus.example:9090/-/reload     (or: kill -HUP <pid>)
EFFECT       Re-reads prometheus.yml and ALL rule files; applied only if every file is well-formed. A valid but wrong
             rule/relabel change takes effect immediately: alerts can start or stop firing, targets can disappear.
             Needs --web.enable-lifecycle for the HTTP form (anyone who can reach the port can reload or POST /-/quit).
PROOF        promtool check config prometheus.yml  -> exit 0;  promtool check rules <files> -> exit 0;
             diff of the change reviewed; the previous config copy kept for rollback.
WAIT-FOR-GO  yes
```

Alertmanager: validate with `amtool check-config alertmanager.yml` and the routing test from [alertmanager.md](alertmanager.md); reload by `SIGHUP`/its reload endpoint. After any reload verify: Status -> Config shows the new hash, `up` targets unchanged, no spike in `prometheus_config_last_reload_successful == 0`.

### 2. Restart a production Prometheus

```
ACTION       systemctl restart prometheus        |  kubectl --context CTX -n monitoring rollout restart sts/prometheus-...
EFFECT       Scraping stops; WAL is replayed on start (minutes to tens of minutes on large heads) and during replay the
             server is not ready: dashboards and alerts are blind. In a single-replica setup there is an alerting gap.
             emptyDir storage = all data lost.
PROOF        storage is a persistent volume; WAL size; a second replica or an external blackbox check covers the gap.
WAIT-FOR-GO  yes
```

### 3. Delete series through the admin API

```
ACTION       curl -X POST -g 'http://prometheus:9090/api/v1/admin/tsdb/delete_series?match[]=<selector>&start=<t>&end=<t>'
             (then, optionally) curl -X POST http://prometheus:9090/api/v1/admin/tsdb/clean_tombstones
EFFECT       Marks the matching samples deleted (tombstones); omitting start AND end deletes all history of the
             matched series. clean_tombstones physically removes them. Not undoable without a backup.
             The admin API is OFF unless --web.enable-admin-api is set (enabling it needs a restart and exposes delete
             and snapshot to anyone who can reach the port).
PROOF        Same selector run as an instant query to list exactly the series; count; a snapshot taken first
             (POST /api/v1/admin/tsdb/snapshot) or blocks copied; time range written down.
WAIT-FOR-GO  yes
```

### 4. Shrink retention or size limit

```
ACTION       change --storage.tsdb.retention.time / --storage.tsdb.retention.size, restart
EFFECT       Data older than the new limit (or oldest blocks beyond the size) is deleted by the next background
             cleanup (up to ~2 hours later). Irreversible. A too-small size limit also deletes recent blocks.
PROOF        du of the data dir; current oldest timestamp (prometheus_tsdb_lowest_timestamp_seconds);
             confirmation that remote storage/backup holds what is about to go.
WAIT-FOR-GO  yes
```

### 5. Loki: shorten retention, delete log entries, remove tenant data

```
ACTION       edit limits_config.retention_period / retention_stream  |  POST /loki/api/v1/delete?query=...&start=...&end=... (X-Scope-OrgID: <tenant>)
EFFECT       Compactor marks matching chunks and a sweeper deletes them after retention_delete_delay (and a delete
             request after delete_request_cancel_period, default 24h). The Loki docs say retention changes are
             "not retroactive" for already-ingested logs; do not rely on that to protect data when shortening: treat
             a shorter period as a deletion. Deleting a whole tenant means a delete request over its full range or
             deleting its objects in the bucket: unrecoverable without object versioning.
PROOF        Query the same selector/time range first (counts); list pending requests with GET /loki/api/v1/delete;
             object-store versioning enabled; the cancel path known (DELETE /loki/api/v1/delete?request_id=...).
WAIT-FOR-GO  yes
```

### 6. Mass silences, expiring all silences

```
ACTION       amtool silence add alertname=~".+" --duration=2h --comment="..."     |   amtool silence expire $(amtool silence query -q)
EFFECT       The first mutes every alert for the duration (real incidents go unnoticed, pagers stay quiet);
             the second removes every silence and releases all muted notifications at once (a flood).
PROOF        amtool silence query output; the exact matchers and the number of alerts currently matched
             (the UI preview or amtool alert query with the same matchers); end time and an author/comment set.
WAIT-FOR-GO  yes (a narrow, time-boxed silence for one alert is ordinary; empty, wildcard or all-alerts matchers are not)
```

### 7. Remove monitoring storage (PVC, volume, bucket)

```
ACTION       kubectl --context CTX -n monitoring delete pvc <name>   |   docker volume rm <name>   |   delete bucket/prefix
EFFECT       Metrics/logs/silences/dashboards held on it are gone. With reclaimPolicy Delete the PV and disk go too.
             Grafana's database (users, annotations) and Alertmanager's silences are state, not config.
PROOF        kubectl get pvc,pv (reclaim policy, bound pod); backup/snapshot verified restorable; list of what the
             volume contains; nothing still mounts it.
WAIT-FOR-GO  yes   (volume handling details: devops-kubernetes storage reference, devops-storage-backup)
```

### 8. Helm install/upgrade/uninstall of kube-prometheus-stack, CRD changes

```
ACTION       helm upgrade kps prometheus-community/kube-prometheus-stack -n monitoring --version <X> -f values.yaml
EFFECT       Rolling restart of Prometheus/Alertmanager/Grafana; CRDs are not upgraded by Helm by default, so a new
             operator against old CRDs can break; changed default rules change what alerts. Uninstall removes
             workloads; whether PVCs survive depends on the chart/storage settings.
PROOF        helm diff / --dry-run=server output; CRD versions listed (kubectl get crd | grep monitoring.coreos.com);
             chart upgrade notes for the major read; values diff against upstream values.
WAIT-FOR-GO  yes
```

### 9. Grafana provisioning with deletion semantics

`deleteDatasources`, `prune: true`, dashboard `disableDeletion: false` and `deleteRules`/`deleteContactPoints` remove objects when files change.

```
ACTION       deploy provisioning files containing delete/prune settings
EFFECT       Datasources/alert resources vanish; dashboards bound to a removed datasource break.
PROOF        list of current objects (API or UI export) compared with the files; Grafana DB backup.
WAIT-FOR-GO  yes
```

### 10. Changing identity labels (`external_labels`, replica label, job names, metric renames)

```
EFFECT       Series become new series (history split), alert grouping and inhibition `equal` labels stop matching,
             HA deduplication in Thanos/Mimir breaks, dashboards and recording rules return empty.
PROOF        grep of every rule/dashboard/route using the label; a plan for the overlap period.
WAIT-FOR-GO  yes
```

## After any applied action

Verify with data, not with the exit code: `up` count per job unchanged, `prometheus_config_last_reload_successful` = 1, Alertmanager receiving the `Watchdog`, Grafana datasource Test OK, Loki `/ready`, a known log line found. If verification fails, roll back to the last good file/snapshot before trying another change.

## Sources (read 2026-11-10)

- https://prometheus.io/docs/prometheus/latest/management_api/ (reload, quit, `--web.enable-lifecycle`)
- https://raw.githubusercontent.com/prometheus/prometheus/v3.16.0/docs/querying/api.md (admin API: snapshot, delete_series, clean_tombstones, `--web.enable-admin-api`)
- https://prometheus.io/docs/prometheus/latest/storage/ (retention flags, cleanup delay, snapshots as backup)
- https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/ (`promtool check rules`, SIGHUP, all-or-nothing apply)
- https://raw.githubusercontent.com/grafana/loki/v3.7.9/docs/sources/operations/storage/retention.md , logs-deletion.md , reference/loki-http-api.md
- https://raw.githubusercontent.com/prometheus/alertmanager/v0.35.0/README.md (`amtool silence` examples)

## Not verified

- `prometheus_config_last_reload_successful` and `prometheus_tsdb_lowest_timestamp_seconds` metric names are from experience; not located in the docs read.
- Alertmanager reload endpoint (`/-/reload`) exists in practice; its page was not fetched. Use `SIGHUP` if unsure.
- Helm uninstall behavior for the chart's PVCs and WAL replay duration claims are not sourced.
- Whether deleting a Loki tenant has a dedicated API in v3.7.9 was not found in the HTTP API page; the described paths are the two read ones.
