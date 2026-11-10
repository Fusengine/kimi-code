---
name: workloads-scheduling
description: Choosing and configuring workload controllers, rollouts, disruption budgets and pod placement
when-to-use: Writing a Deployment, StatefulSet, DaemonSet, Job or CronJob, or deciding where pods land
keywords: deployment, statefulset, daemonset, job, cronjob, pdb, rollout, topologySpreadConstraints
priority: high
related: probes-lifecycle.md, storage-csi.md, resources-qos-hpa.md
---

# Workloads and Scheduling

**Load when:** choosing a controller, setting a rollout strategy, protecting availability during node maintenance, or spreading replicas.

## Decision rules

| Need | Controller | Why |
|------|------------|-----|
| Stateless replicas, any pod interchangeable | `apps/v1` Deployment | Rolling updates and `rollout undo` via ReplicaSet history |
| Stable name, ordinal, per-replica volume | `apps/v1` StatefulSet | Pods `web-0..N-1`, one PVC per ordinal from `volumeClaimTemplates` |
| One pod per (selected) node: agents, log shippers | `apps/v1` DaemonSet | Follows nodes; ignores cordon for its own pods |
| Run to completion | `batch/v1` Job | Retries with `backoffLimit`, `podFailurePolicy` |
| Run on a schedule | `batch/v1` CronJob | Creates Jobs; `timeZone`, `concurrencyPolicy` |

A bare Pod is never the answer for a service: nothing recreates it.

## Deployment rollout

- `strategy.rollingUpdate.maxUnavailable: 0` + `maxSurge: 1` keeps capacity during rollout (needs room for one extra pod).
- `minReadySeconds` delays "available" until a pod stayed Ready that long - catches crash-after-start.
- `revisionHistoryLimit` bounds the ReplicaSets kept for `rollout undo`; `0` disables rollback.
- `progressDeadlineSeconds` marks a stuck rollout as failed so `rollout status` exits non-zero.

```bash
kubectl --context "$CTX" -n "$NS" rollout status deploy/web --timeout=5m
kubectl --context "$CTX" -n "$NS" rollout history deploy/web
```

## StatefulSet specifics (verified at the StatefulSet page)

| Field | State | Use |
|-------|-------|-----|
| `serviceName` + headless Service | stable | DNS per pod `web-0.<svc>.<ns>.svc` |
| `minReadySeconds` | stable since v1.25 | Same meaning as Deployment |
| `ordinals.start` | stable since v1.31 | Start numbering at N (migrations) |
| `apps.kubernetes.io/pod-index` label | stable since v1.32 | Select one replica |
| `persistentVolumeClaimRetentionPolicy` (`whenDeleted`, `whenScaled`) | stable since v1.32 | `Retain` keeps PVCs; `Delete` removes them after the pods |
| `updateStrategy.rollingUpdate.maxUnavailable` | beta since v1.37, on by default | Faster rollouts for replicas that tolerate it |
| `updateStrategy.type: Recreate` | alpha since v1.37, off by default | Do not use without the feature gate |

Default to `whenDeleted: Retain` and `whenScaled: Retain` for databases: a mistaken delete or scale-down then keeps the data.
`podManagementPolicy: Parallel` only for apps that do not need ordered start.

## Jobs and CronJobs

- `ttlSecondsAfterFinished` cleans finished Jobs; `activeDeadlineSeconds` caps runtime.
- `podFailurePolicy` lets non-retriable exit codes fail fast instead of burning `backoffLimit`.
- `backoffLimitPerIndex` for Indexed Jobs (stable since v1.33); `successPolicy` to finish early.
- `podReplacementPolicy: Failed` (delayed replacement pods, stable since v1.34) creates a replacement only once the old pod is fully terminated - no overlap.
- CronJob `timeZone` (stable since v1.27) takes an IANA name; `CRON_TZ`/`TZ` inside `schedule` is rejected by the API.
- `concurrencyPolicy`: `Allow` (default), `Forbid` (skip if previous still runs), `Replace` (kill previous). Backups and migrations: `Forbid`.
- `startingDeadlineSeconds` bounds how late a missed run may still start.

→ Template: [cronjob.yaml](templates/cronjob.yaml)

## Availability during disruption

A PodDisruptionBudget (`policy/v1`) limits voluntary evictions (drain, cluster autoscaler), never node crashes.
- Use `maxUnavailable: 1` for most apps; `minAvailable` with a percentage when replicas vary with HPA.
- A PDB that allows zero disruptions blocks `kubectl drain` forever - check `ALLOWED DISRUPTIONS` first.
- `unhealthyPodEvictionPolicy: AlwaysAllow` lets drain evict pods that are already unhealthy instead of blocking on them.

```bash
kubectl --context "$CTX" -n "$NS" get pdb
```

## Placement

| Tool | When |
|------|------|
| `topologySpreadConstraints` on `topology.kubernetes.io/zone` / `kubernetes.io/hostname` | Spread replicas; `whenUnsatisfiable: ScheduleAnyway` unless a hard rule is required |
| `affinity.podAntiAffinity` | Hard "never two on one node" for small replica counts |
| `nodeSelector` / node affinity | Hardware or pool constraints |
| taints + tolerations | Reserve nodes (GPU, ingress) for workloads that tolerate them |
| `priorityClassName` | Let critical pods preempt batch work |

## Pitfalls

- Changing a Deployment `selector` is rejected - create a new Deployment.
- Deleting a StatefulSet does not wait for ordered pod termination; scale to 0 first only when the app needs ordered shutdown, and only after the user's go.
- A DaemonSet without tolerations skips tainted control-plane nodes - usually intended, confirm it.

## Verification

```bash
kubectl --context "$CTX" -n "$NS" get deploy,sts,ds,job,cronjob -o wide
kubectl --context "$CTX" -n "$NS" get pods -o wide   # spread across nodes/zones?
```

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- https://kubernetes.io/docs/concepts/workloads/controllers/job/
- https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Not verified

- Exact feature-state versions for `podFailurePolicy` and `successPolicy` (fields listed on the Job page; per-field version not extracted).
- `maxUnavailable: 0` + `maxSurge: 1`, `progressDeadlineSeconds`, placement table: long-stable Deployment/scheduling fields stated from the API, not re-read today.
- The feature-state version of `unhealthyPodEvictionPolicy` (field confirmed on the PDB page, version not extracted).
