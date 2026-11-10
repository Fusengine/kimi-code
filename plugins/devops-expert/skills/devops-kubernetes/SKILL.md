---
name: devops-kubernetes
description: Use when writing, reviewing, applying or debugging workloads on an existing Kubernetes cluster - Deployment, StatefulSet, DaemonSet, Job/CronJob, ConfigMap/Secret usage, Services, Gateway API (HTTPRoute) or a migration away from Ingress/Ingress NGINX, PV/PVC/StorageClass, RBAC and ServiceAccounts, requests/limits, probes, HPA, NetworkPolicy, safe kubectl (diff, server dry-run, delete/drain/scale/rollback) and pod troubleshooting (Pending, CrashLoopBackOff, DNS, no endpoints). Not for installing or upgrading clusters, etcd or CNI choice (devops-k8s-cluster), Helm/Kustomize/Argo CD/Flux (devops-gitops-packaging), secret stores (devops-secrets) or a cluster security audit (security-expert).
versions:
  kubernetes: "1.37.2 (supported minors 1.37, 1.36, 1.35)"
  gateway-api: "1.7.0"
references:
  - references/workloads-scheduling.md
  - references/probes-lifecycle.md
  - references/services-gateway-api.md
  - references/network-policy.md
  - references/storage-csi.md
  - references/config-secrets.md
  - references/rbac-serviceaccounts.md
  - references/resources-qos-hpa.md
  - references/kubectl-safe-ops.md
  - references/troubleshooting-playbook.md
  - references/templates/deployment-production.yaml
  - references/templates/statefulset-pvc.yaml
  - references/templates/cronjob.yaml
  - references/templates/gateway-httproute.yaml
  - references/templates/networkpolicy-default-deny.yaml
  - references/templates/rbac-least-privilege.yaml
  - references/templates/hpa.yaml
related-skills:
  - devops-k8s-cluster
  - devops-gitops-packaging
  - devops-secrets
  - devops-observability
  - devops-storage-backup
  - devops-networking
  - devops-docker
  - devops-sre-ops
---

<objective>
Covers using a running Kubernetes cluster: workload controllers, configuration,
Services and traffic entry through Gateway API, storage claims, RBAC,
resources/QoS/autoscaling, probes, NetworkPolicy, safe kubectl operation and a
fixed troubleshooting order. Does not cover building or upgrading the cluster,
etcd, CNI selection (devops-k8s-cluster), packaging and GitOps controllers
(devops-gitops-packaging), external secret stores (devops-secrets) or a
security audit (security-expert).
</objective>

# DevOps Kubernetes

## Agent Workflow (MANDATORY)

Before ANY manifest or cluster change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find existing manifests, overlays, charts, the target namespace layout
2. **research-expert** - verify the API fields for the cluster's minor at kubernetes.io / gateway-api.sigs.k8s.io
3. **mcp__context7__query-docs** - `/websites/kubernetes_io`, `/websites/gateway-api_sigs_k8s_io`

Then read the cluster read-only (`kubectl version`, `kubectl api-resources`, `kubectl get crd | grep gateway`).
After changes, run **sniper**.

## Versions (checked 2026-11-10)

Kubernetes v1.37.2 / v1.36.6 / v1.35.10 are the latest patches (GitHub release tags, 2026-10-28; https://kubernetes.io/releases/ still listed 1.37.1); 1.34 reached end of life 2026-10-27. Gateway API v1.7.0 (2026-10-29). Each minor deprecates or graduates fields: read the release blog of the target minor (https://kubernetes.io/blog/) before writing manifests for it.

## Overview

| Area | Decision in one line |
|------|----------------------|
| **Workloads** | Stateless = Deployment; stable identity/storage = StatefulSet; one per node = DaemonSet; run-to-completion = Job/CronJob |
| **Traffic entry** | Gateway API (`gateway.networking.k8s.io/v1`); Ingress API is frozen; Ingress NGINX is retired |
| **Storage** | PVC + StorageClass (`WaitForFirstConsumer`, `allowVolumeExpansion`), `Retain` for data that must survive |
| **Config** | ConfigMap for config, Secret for credentials; Secrets are unencrypted in etcd by default |
| **Access** | One ServiceAccount per workload, namespaced Role, `automountServiceAccountToken: false` unless needed |
| **Capacity** | Requests on every container, memory limit always, HPA `autoscaling/v2` with `behavior` |
| **Isolation** | Default-deny NetworkPolicy per namespace, then explicit allows (needs a CNI that enforces it) |

## Critical Rules

1. **Version first** - read the server minor (`kubectl version`) and the CRDs present before writing a field; a field that is stable in 1.37 may be beta or absent in 1.35
2. **Explicit target on every command** - `--context <ctx> -n <ns>`; never rely on the current context
3. **Diff and server dry-run before apply** - `kubectl diff` then `kubectl apply --dry-run=server`; never `kubectl apply --prune` (alpha)
4. **Destructive verbs are proposed, not run** - `delete`, `drain`, `scale --replicas=0`, `rollout undo`, `--force`: show the exact effect and blast radius, wait for the user's go ([kubectl-safe-ops.md](references/kubectl-safe-ops.md))
5. **Troubleshoot in order** - describe → events → logs → exec/debug → node; no fix before the evidence ([troubleshooting-playbook.md](references/troubleshooting-playbook.md))
6. **Never print a Secret value** - names and keys only; values come from the secret store (devops-secrets)
7. **Never invent an apiVersion or field** - cite the kubernetes.io or gateway-api page; unknown = "not verified"

## Architecture

```
k8s/
├── namespace.yaml            # PSA labels: pod-security.kubernetes.io/enforce: restricted
├── rbac.yaml                 # ServiceAccount + Role + RoleBinding (namespaced)
├── networkpolicy.yaml        # default-deny + explicit allows
├── config.yaml               # ConfigMap (Secrets come from devops-secrets tooling)
├── deployment.yaml           # Deployment + Service + PodDisruptionBudget
├── hpa.yaml                  # autoscaling/v2
└── route.yaml                # HTTPRoute attached to the shared Gateway
```

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Workloads** | [workloads-scheduling.md](references/workloads-scheduling.md) | Choosing a controller, rollout strategy, PDB, spreading |
| **Probes and lifecycle** | [probes-lifecycle.md](references/probes-lifecycle.md) | startup/readiness/liveness, sidecars, graceful shutdown |
| **Services and Gateway API** | [services-gateway-api.md](references/services-gateway-api.md) | Exposing an app, leaving Ingress NGINX |
| **NetworkPolicy** | [network-policy.md](references/network-policy.md) | Namespace isolation, egress control |
| **Storage** | [storage-csi.md](references/storage-csi.md) | PVC sizing, reclaim policy, expansion, access modes |
| **Config and Secrets** | [config-secrets.md](references/config-secrets.md) | Mounting config, rollout on change, Secret handling |
| **RBAC** | [rbac-serviceaccounts.md](references/rbac-serviceaccounts.md) | Least privilege, `auth can-i`, Pod Security Admission |
| **Resources and HPA** | [resources-qos-hpa.md](references/resources-qos-hpa.md) | Requests/limits, QoS, in-place resize, autoscaling |
| **Safe kubectl** | [kubectl-safe-ops.md](references/kubectl-safe-ops.md) | Any mutating command |
| **Troubleshooting** | [troubleshooting-playbook.md](references/troubleshooting-playbook.md) | Pending, CrashLoopBackOff, DNS, no endpoints |

### Templates

| Template | When to Use |
|----------|-------------|
| [deployment-production.yaml](references/templates/deployment-production.yaml) | Stateless app: probes, limits, restricted securityContext, Service, PDB |
| [statefulset-pvc.yaml](references/templates/statefulset-pvc.yaml) | Stateful app with headless Service and per-replica PVC |
| [cronjob.yaml](references/templates/cronjob.yaml) | Scheduled job with time zone, concurrency and history limits |
| [gateway-httproute.yaml](references/templates/gateway-httproute.yaml) | Shared Gateway, HTTPS redirect, app HTTPRoute, ReferenceGrant |
| [networkpolicy-default-deny.yaml](references/templates/networkpolicy-default-deny.yaml) | Default deny + DNS + gateway ingress allows |
| [rbac-least-privilege.yaml](references/templates/rbac-least-privilege.yaml) | ServiceAccount + Role + RoleBinding |
| [hpa.yaml](references/templates/hpa.yaml) | CPU-based HPA with scale-down stabilization |

## Quick Reference

```bash
CTX=prod-eu; NS=shop                                   # always explicit
kubectl --context "$CTX" version                       # server minor
kubectl --context "$CTX" -n "$NS" diff -f k8s/         # exit 0 none, 1 diff, >1 error
kubectl --context "$CTX" -n "$NS" apply --dry-run=server -f k8s/
kubectl --context "$CTX" -n "$NS" apply -f k8s/        # after the user's go
kubectl --context "$CTX" -n "$NS" rollout status deploy/web --timeout=5m
kubectl --context "$CTX" -n "$NS" auth can-i list secrets --as=system:serviceaccount:"$NS":web
```

## Best Practices

### DO
- Pin the Gateway API CRD release you install (`standard-install.yaml` of a named tag) and match the controller's conformance
- Give every Deployment with more than one replica a PodDisruptionBudget
- Use a startupProbe for slow starters instead of a long liveness `initialDelaySeconds`
- Keep manifests in Git, pin images by tag and digest (devops-docker), apply through the pipeline (devops-gitops-packaging)

### DON'T
- Start new work on Ingress NGINX (retired) or new Ingress features (API frozen)
- Use `kubectl edit` or `kubectl patch` on objects owned by GitOps - the controller reverts it
- Put CPU limits by reflex - they throttle; decide per workload ([resources-qos-hpa.md](references/resources-qos-hpa.md))
