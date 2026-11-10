---
name: troubleshooting-playbook
description: Fixed-order troubleshooting of pods, Services, DNS and nodes - describe, events, logs, exec/debug, node
when-to-use: A pod is Pending, CrashLoopBackOff, not Ready, a Service has no endpoints, DNS fails, or a node misbehaves
keywords: troubleshooting, pending, crashloopbackoff, imagepullbackoff, oomkilled, events, logs --previous, kubectl debug, ephemeral container, dns, endpoints
priority: critical
related: kubectl-safe-ops.md, probes-lifecycle.md, resources-qos-hpa.md, network-policy.md
---

# Troubleshooting Playbook

**Load when:** anything in a workload does not behave. The order is fixed; skip a step only when the previous one already names the cause with evidence. Every step below is read-only except `debug`, which adds an ephemeral container (propose it on production).

```bash
CTX=prod-eu; NS=shop; POD=web-7d9c8b6f5-abcde
```

## Step 1 - describe

```bash
kubectl --context "$CTX" -n "$NS" get pod "$POD" -o wide
kubectl --context "$CTX" -n "$NS" describe pod "$POD"
```

Read: `Status`/`Reason`, each container's `State` and `Last State` (exit code, `OOMKilled`), `Restart Count`, probe definitions, `Conditions` (`PodScheduled`, `Initialized`, `ContainersReady`, `Ready`), node, QoS class.

## Step 2 - events

```bash
kubectl --context "$CTX" -n "$NS" events --for pod/"$POD"
kubectl --context "$CTX" -n "$NS" get events --sort-by=.lastTimestamp | tail -30
```

Events expire (about an hour by default on most clusters) - capture them early. Scheduler, kubelet, probe and volume errors appear here, not in app logs.

## Step 3 - logs

```bash
kubectl --context "$CTX" -n "$NS" logs "$POD" -c app --tail=200
kubectl --context "$CTX" -n "$NS" logs "$POD" -c app --previous --tail=200   # the crashed instance
kubectl --context "$CTX" -n "$NS" logs deploy/web --all-containers --since=15m
```

For CrashLoopBackOff, `--previous` is the one that shows the crash.

## Step 4 - exec / debug

```bash
kubectl --context "$CTX" -n "$NS" exec -it "$POD" -c app -- sh             # if the image has a shell
kubectl --context "$CTX" -n "$NS" debug -it "$POD" --image=busybox:1.37 --target=app   # ephemeral container sharing app's process namespace
kubectl --context "$CTX" -n "$NS" debug "$POD" -it --copy-to=web-debug --container=app -- sh   # copy with a changed command (crashing image)
```

- `--target` attaches to the app's processes for distroless images.
- `--profile` (`general`, `baseline`, `restricted`, `netadmin`, `sysadmin`) sets the debug container's privileges; under PSA `restricted` use `--profile=restricted`.
- A `--copy-to` pod is a new pod: delete it afterwards (propose), never use `--replace` on production.

## Step 5 - node

```bash
kubectl --context "$CTX" describe node "$NODE"     # Conditions: MemoryPressure, DiskPressure, PIDPressure, Ready; Allocated resources
kubectl --context "$CTX" top node "$NODE"
kubectl --context "$CTX" debug node/"$NODE" -it --image=busybox:1.37   # host namespaces, host filesystem at /host
```

Node-level repair (kubelet, container runtime, disk) moves to devops-k8s-cluster and devops-linux.

## Symptom map

| Symptom | First evidence | Usual causes |
|---------|----------------|--------------|
| `Pending` | Events: `FailedScheduling` with the reason | Requests exceed free capacity, taints without tolerations, node affinity, PVC unbound (storage-csi.md), quota |
| `ImagePullBackOff` / `ErrImagePull` | Events: pull error text | Wrong tag/digest, private registry without `imagePullSecrets`, rate limit |
| `CreateContainerConfigError` | Events: missing ConfigMap/Secret/key | config-secrets.md |
| `CrashLoopBackOff` | `logs --previous`, exit code | App error, missing env, permissions under `readOnlyRootFilesystem`/non-root, liveness killing it |
| `OOMKilled`, exit 137 | `Last State` | Memory limit below peak (resources-qos-hpa.md) |
| Running, not Ready | Events: `Readiness probe failed` | Wrong path/port, dependency down, too short timeout (probes-lifecycle.md) |
| `Terminating` forever | `metadata.finalizers`, node status | Node unreachable, finalizer controller gone |
| Service has no endpoints | `get endpointslices -l kubernetes.io/service-name=<svc>` | Selector/label mismatch, no Ready pod, wrong `targetPort` |
| Route returns 404/503 | HTTPRoute `status.parents` conditions | Route not `Accepted` (allowedRoutes), `ResolvedRefs` false (Service/port), NetworkPolicy |

## DNS checks (official dnsutils procedure)

```bash
kubectl --context "$CTX" apply -f https://k8s.io/examples/admin/dns/dnsutils.yaml   # creates pod dnsutils in default ns (propose)
kubectl --context "$CTX" exec -i -t dnsutils -- nslookup kubernetes.default
kubectl --context "$CTX" exec -i -t dnsutils -- nslookup web.shop
kubectl --context "$CTX" exec -i -t dnsutils -- cat /etc/resolv.conf
kubectl --context "$CTX" -n kube-system logs -l k8s-app=kube-dns --tail=50
```

If `kubernetes.default` fails: cluster DNS or NetworkPolicy egress (network-policy.md). If only the app name fails: Service name/namespace, or a missing headless Service.

## Reporting a diagnosis

State the step that produced the evidence, quote the event or log line (secrets redacted), name the cause, then propose the fix with its command per kubectl-safe-ops.md. "Restarted it and it works" is not a diagnosis.

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/ (`kubectl events --for pod/<name>`)
- https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/

## Not verified

- Event retention ("about an hour") is the common kube-apiserver default (`--event-ttl`), not re-read today; it is cluster-configurable.
- The `k8s-app=kube-dns` label is the one used on the official DNS debugging page; a given distribution may label its DNS pods differently.
- The meaning of the HTTPRoute `Accepted` / `ResolvedRefs` conditions is taken from the Gateway API status model, not re-read today.
