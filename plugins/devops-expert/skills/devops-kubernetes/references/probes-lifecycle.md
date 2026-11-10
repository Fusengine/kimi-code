---
name: probes-lifecycle
description: Startup, readiness and liveness probes, native sidecars and graceful shutdown
when-to-use: Adding health checks, fixing restart loops caused by probes, adding a sidecar, tuning shutdown
keywords: startupProbe, readinessProbe, livenessProbe, grpc probe, sidecar, restartPolicy Always, terminationGracePeriodSeconds
priority: high
related: workloads-scheduling.md, troubleshooting-playbook.md
---

# Probes and Pod Lifecycle

**Load when:** writing health checks, a pod restarts without an app error, a rollout never becomes Ready, or adding a sidecar.

## What each probe does

| Probe | On failure | Use for |
|-------|------------|---------|
| `startupProbe` | Container killed after `failureThreshold * periodSeconds`; liveness/readiness wait until it succeeds once | Slow first start (migrations, JIT, cache warm-up) |
| `readinessProbe` | Pod removed from Service endpoints, not restarted; runs for the whole life of the container | "Can I take traffic now?" - dependencies, warm-up, overload |
| `livenessProbe` | Container restarted | Deadlock detection only |

Readiness and liveness do not depend on each other. If readiness must wait, use `initialDelaySeconds` or a `startupProbe`.

## Decision rules

1. **Always readiness** on anything behind a Service.
2. **Liveness only when the process can hang while alive** - and it must check the process itself, never a database or a downstream API. A liveness probe that checks a shared dependency restarts every replica at once when that dependency blips.
3. **startupProbe instead of a big `initialDelaySeconds`** on liveness: the official example gives `failureThreshold: 30` x `periodSeconds: 10` = 300 s to start, then liveness with `failureThreshold: 1` reacts fast.
4. Separate endpoints: `/readyz` (dependencies allowed) and `/livez` (process only).
5. `timeoutSeconds` defaults to 1 s - raise it for endpoints that do real work.

## Handlers

| Handler | Notes |
|---------|-------|
| `httpGet` | 2xx/3xx = success; use a named port |
| `tcpSocket` | Port open only - weak signal |
| `grpc` | Built-in gRPC health checking protocol; the app must implement it |
| `exec` | Runs in the container: costs a process per probe, avoid on high-frequency probes |

```yaml
ports:
  - name: http
    containerPort: 8080
startupProbe:
  httpGet: { path: /livez, port: http }
  failureThreshold: 30
  periodSeconds: 10
livenessProbe:
  httpGet: { path: /livez, port: http }
  periodSeconds: 10
  failureThreshold: 3
readinessProbe:
  httpGet: { path: /readyz, port: http }
  periodSeconds: 5
  timeoutSeconds: 2
```

## Native sidecars (stable since v1.33)

An entry in `initContainers` with `restartPolicy: Always` is a sidecar: it starts before the app containers, keeps running alongside them, supports probes, and does not block Job completion.

```yaml
initContainers:
  - name: log-shipper
    image: registry.example.com/shipper:1.4.2
    restartPolicy: Always
containers:
  - name: app
    image: registry.example.com/app:2.3.0
```

Use it instead of a plain second container whenever start order or Job completion matters (proxies, log shippers, credential refreshers).

## Graceful shutdown

On delete/eviction the kubelet sends SIGTERM, waits `terminationGracePeriodSeconds` (pod field), then SIGKILL. In parallel the pod leaves the Service endpoints - but proxies and Gateways may still route to it for a short moment.

- The app must handle SIGTERM: stop accepting, drain in-flight requests, exit.
- If the image cannot do that, a `preStop` hook (`exec` sleep) gives load balancers time to drop the endpoint before SIGTERM.
- Set `terminationGracePeriodSeconds` longer than the longest request or job step.

## Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| Restarts every few minutes, app log clean | Liveness timeout too short under load | Raise `timeoutSeconds`/`failureThreshold`, or drop liveness |
| All replicas restart together | Liveness checks a shared dependency | Liveness = process only |
| Rollout stuck at 0 available | Readiness path wrong or needs auth | `kubectl describe pod` → probe failure event |
| 502 during deploys | No drain time before SIGTERM | `preStop` delay + app SIGTERM handling |

## Verification

```bash
kubectl --context "$CTX" -n "$NS" describe pod "$POD" | sed -n '/Liveness/,/Environment/p'
kubectl --context "$CTX" -n "$NS" get events --field-selector involvedObject.name="$POD"
kubectl --context "$CTX" -n "$NS" get pod "$POD" -o jsonpath='{.status.containerStatuses[*].restartCount}'
```

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/

## Not verified

- Default values of `periodSeconds`, `failureThreshold`, `successThreshold` (not stated on the task page read; only `timeoutSeconds` = 1 s is).
- The probe page mentions newer options (`protocol: HTTP2` on HTTP probes, TLS mode for gRPC probes); their feature state was not read - do not use them without checking.
- `preStop` `sleep` action (instead of `exec` sleep): feature state not read today.
