---
name: kubectl-safe-ops
description: Safe kubectl operation - explicit context and namespace, diff and server dry-run, and the exact effect of destructive verbs
when-to-use: Before ANY mutating kubectl command, and whenever delete, drain, scale to zero, rollout undo or --force is considered
keywords: kubectl, context, namespace, diff, dry-run=server, server-side apply, delete, drain, cordon, scale, rollout undo, force
priority: critical
related: troubleshooting-playbook.md, workloads-scheduling.md, storage-csi.md
---

# Safe kubectl Operation

**Load when:** about to change anything in a cluster. Read-only commands (`get`, `describe`, `logs`, `events`, `top`, `auth can-i`, `diff`) need no go; everything else follows this file.

## Rule 1 - explicit target, every time

```bash
kubectl config get-contexts                  # list; read which is current
CTX=prod-eu; NS=shop
kubectl --context "$CTX" -n "$NS" get deploy # every command carries both
```

Never rely on the current context or the namespace stored in kubeconfig: one `kubectl config use-context` in another terminal turns a staging command into a production one. Name the context and namespace in every proposal to the user.

## Rule 2 - diff, then server dry-run, then apply

```bash
kubectl --context "$CTX" -n "$NS" diff -f k8s/                     # exit 0 = no diff, 1 = differences, >1 = error
kubectl --context "$CTX" -n "$NS" apply --dry-run=server -f k8s/   # admission, validation, PSA, quotas, without persisting
kubectl --context "$CTX" -n "$NS" apply -f k8s/                    # only after showing the diff and getting the go
kubectl --context "$CTX" -n "$NS" rollout status deploy/web --timeout=5m
```

- `--dry-run=server` submits the request to the API server **without persisting** it; `--dry-run=client` only prints what would be sent and misses admission - use server.
- Server-side apply (`apply --server-side`) tracks field ownership; `--force-conflicts` takes fields owned by another manager (often a GitOps controller) - treat it as destructive.
- `kubectl apply --prune` is still **alpha** (kubectl apply page): do not use it; deletions go through an explicit, reviewed `delete` or the GitOps tool.
- On a GitOps-managed object, change Git, not the cluster (devops-gitops-packaging).

## Rule 3 - destructive verbs: propose, then the user's go

The agent writes the exact command with context, namespace and object, states the effect and the blast radius, and runs it only after the user says go. Read-only evidence first (what exists, what depends on it, backups).

| Command | Exact effect (kubectl reference) | Before proposing |
|---------|----------------------------------|------------------|
| `kubectl delete <kind> <name>` | Graceful deletion; dependents removed by the default `--cascade=background`; `--wait=true` waits for finalizers | List dependents; for PVC/PV/namespace see storage-csi.md |
| `kubectl delete ... --force --grace-period=0` | Removes the object from the API immediately, bypassing graceful deletion; does not wait for the pod's processes to stop - they may keep running and, with shared storage, two instances can write at once; immediate deletion may cause inconsistency or data loss | Only for a pod on a node confirmed dead; never on StatefulSet pods without that proof |
| `kubectl delete pods --all` / `-l` | Deletes every match in the namespace | Run the same selector with `get` first and show the list; prefer `--interactive` |
| `kubectl delete namespace` | Deletes everything inside, PVCs included (data gone if reclaim policy is `Delete`) | Inventory with `kubectl api-resources --verbs=list --namespaced -o name` + backups |
| `kubectl drain <node>` | Cordons the node, then evicts (or deletes if eviction is unsupported) every pod except mirror pods; refuses DaemonSet pods without `--ignore-daemonsets`; refuses pods without a controller unless `--force`; `--delete-emptydir-data` destroys emptyDir data; `--disable-eviction` bypasses PodDisruptionBudgets | `kubectl get pdb -A` (ALLOWED DISRUPTIONS > 0), pods on the node, spare capacity; `kubectl uncordon` after |
| `kubectl scale --replicas=0` | Stops every pod of the workload: outage for a Deployment; ordered stop for a StatefulSet | Who calls it; add `--current-replicas=N` so the command fails if the state changed |
| `kubectl rollout undo deploy/<name>` | Rolls the template back to the previous revision (or `--to-revision=N`); config in shared mutable ConfigMaps is not rolled back | `kubectl rollout history` and `--dry-run=server` first; GitOps will re-apply Git unless Git is reverted too |
| `kubectl replace --force` | Deletes and recreates the object - pods restart, generated fields reset | Prefer apply |
| `kubectl debug --copy-to=X --replace` | Creates a copy of the pod and deletes the original | Use without `--replace` |

Proposal format (one block per action):

```
ACTION   kubectl --context prod-eu -n shop scale deploy/web --current-replicas=4 --replicas=0
EFFECT   all 4 pods of web stop; Gateway route shop.example.com returns 503
EVIDENCE rollout history attached; no PDB involved; restore = same command with --replicas=4
WAITING  for your go
```

## Rule 4 - never in a loop without a canary

A shell loop over contexts, namespaces or nodes runs once on one target, gets verified, then continues - and only after the user's go for the whole loop.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| `kubectl apply -f dir/` with a stray `Namespace` file | Applies to the wrong namespace or creates one |
| `kubectl delete -f dir/` on a shared directory | Deletes objects other apps depend on (CRDs, namespaces) |
| `kubectl edit` on a live object | Drift from Git, reverted by GitOps or the next apply |
| Stuck `Terminating` namespace "fixed" by removing finalizers | Orphaned external resources (volumes, LBs, DNS) - find the blocking controller first |

## Verification

After any change: `rollout status`, `get` of the touched objects, events since the change, and the user-facing check (HTTP call through the Gateway). A command that returned 0 is not proof the service works.

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Not verified

- `kubectl replace --force` semantics (page not read today; long-standing behaviour).
- Finalizer-removal consequences are operational experience, not from the pages above.
