---
name: resources-qos-hpa
description: Requests and limits, QoS classes, in-place resize, pod-level resources and HorizontalPodAutoscaler v2
when-to-use: Sizing containers, OOMKilled or throttled pods, eviction under pressure, setting up autoscaling
keywords: requests, limits, qos, guaranteed, burstable, besteffort, oomkilled, in-place resize, hpa, autoscaling/v2, behavior, tolerance
priority: high
related: workloads-scheduling.md, troubleshooting-playbook.md
---

# Resources, QoS and Autoscaling

**Load when:** choosing requests/limits, a pod is `OOMKilled` or slow, nodes evict pods, or an HPA is needed.

## What the scheduler and kubelet do with the numbers

- **Requests** are what the scheduler reserves; a pod that does not fit any node's free requests stays `Pending`.
- **Memory limit**: exceeding it lets the kernel OOM-kill the container (`Reason: OOMKilled`, exit code 137).
- **CPU limit**: enforced by throttling, never by a kill.
- Limit set without a request → the request is copied from the limit (unless an admission default applies).

## QoS classes (verified at the Pod QoS page)

| Class | Rule | Eviction order under node pressure |
|-------|------|------------------------------------|
| `Guaranteed` | Every container has CPU and memory requests = limits, all > 0 | Last |
| `Burstable` | At least one request or limit, not Guaranteed | Middle |
| `BestEffort` | No requests or limits at all | First |

Under resource-pressure eviction, only pods exceeding their requests are candidates - accurate requests protect a pod.

## Decision rules

1. **Every container gets CPU and memory requests**, set from observed usage (p95 over a representative week, devops-observability), not guesses.
2. **Memory limit always**; equal to the request for latency-critical or stateful apps (predictable, Guaranteed if CPU also matches).
3. **CPU limit is a choice, not a reflex**: it caps bursts through throttling. Set it for noisy batch neighbours or when Guaranteed QoS is required; leave it out for latency-sensitive services whose requests are accurate.
4. Namespace guard rails: a `LimitRange` for defaults and a `ResourceQuota` for totals, so a manifest without resources does not land as BestEffort.
5. JVM, Node.js, Go: make the runtime respect the container limit (heap/GOMEMLIMIT) or the OOM kill comes before GC.

## In-place resize (stable since v1.35)

CPU and memory of a running container can change without recreating the pod, through the pod's `resize` subresource:

```bash
kubectl --context "$CTX" -n "$NS" edit pod "$POD" --subresource resize
```

`resizePolicy` per resource: `NotRequired` (default, apply live) or `RestartContainer` (restart that container). Pod-level resource resize and memory-backed `emptyDir` resize are alpha in v1.37 (feature gates off).
For managed workloads change the Deployment/StatefulSet template in Git - a hand resize of one pod is lost at the next rollout.

## Pod-level resources (beta since v1.34, on by default)

`spec.resources` at pod level sets a shared budget for all containers; useful with sidecars. Check the cluster minor and feature gate before relying on it.

## HorizontalPodAutoscaler (`autoscaling/v2`)

- Needs the **Metrics Server** (installed separately) for CPU/memory, or an adapter for custom/external metrics.
- Utilization targets are a percentage **of the request** - no request, no CPU-based HPA.
- `behavior.scaleDown.stabilizationWindowSeconds: 300` (the documented default for scale-down) avoids flapping; `policies` cap the rate (`Pods` or `Percent` per `periodSeconds`), `selectPolicy` picks `Max`/`Min`/`Disabled`.
- `behavior.scaleUp.tolerance` / `scaleDown.tolerance` (stable since v1.37) override the global 10% tolerance per direction; the global default is a kube-controller-manager flag, not settable through the API.
- `minReplicas: 0` is beta since v1.37 and only for object/external metrics.
- Do not let the HPA and a hard-coded `replicas:` fight: omit `replicas` from the Deployment in Git once an HPA owns it (or the GitOps tool resets it).
- HPA and a VPA in auto mode must not act on the same resource metric.

```bash
kubectl --context "$CTX" -n "$NS" autoscale deploy web --min=2 --max=10 --cpu=70% --dry-run=server -o yaml
```

→ Template: [hpa.yaml](templates/hpa.yaml)

## Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `OOMKilled`, exit 137 | Memory limit below the real peak, or runtime ignores the limit | Raise limit from metrics; configure the runtime |
| Latency spikes, CPU below request on average | CPU throttling by a tight limit | Raise or remove the CPU limit; check `container_cpu_cfs_throttled_periods_total` |
| HPA `<unknown>/70%` | Metrics Server missing or no CPU request | Install metrics-server (cluster work), set requests |
| Pods evicted on a busy node | BestEffort/Burstable over requests under pressure | Accurate requests, memory limit = request |

## Verification

```bash
kubectl --context "$CTX" -n "$NS" top pods --containers
kubectl --context "$CTX" -n "$NS" get pod "$POD" -o jsonpath='{.status.qosClass}'
kubectl --context "$CTX" -n "$NS" describe hpa web    # conditions AbleToScale, ScalingActive
```

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/
- https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

## Not verified

- Rule 3 (CPU limits optional for latency-sensitive services) and rule 5 (runtime memory settings) are operational practice, not from the pages above.
- `--cpu=70%` is the form shown on the HPA page today; older kubectl clients used `--cpu-percent` - check `kubectl autoscale --help` on the client in use.
- The metric name `container_cpu_cfs_throttled_periods_total` (cAdvisor) was not re-read today.
