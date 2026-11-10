---
name: network-policy
description: Namespace isolation with NetworkPolicy - default deny, explicit allows, egress control
when-to-use: Isolating a namespace, restricting egress, debugging traffic blocked by a policy
keywords: networkpolicy, default deny, podSelector, namespaceSelector, ipBlock, egress, dns, policyTypes
priority: high
related: services-gateway-api.md, troubleshooting-playbook.md
---

# NetworkPolicy

**Load when:** a namespace needs isolation, egress must be restricted, or traffic is suddenly blocked after a policy change.

## Ground rules (verified at the NetworkPolicy page)

- Policies are enforced by the **network plugin**. Creating one in a cluster whose CNI does not implement it has **no effect** - check the CNI first (devops-k8s-cluster).
- Policies are additive allow-lists. A pod selected by any policy with `Ingress` in `policyTypes` is isolated for ingress; only what some policy allows gets in. Same for `Egress`.
- If `policyTypes` is omitted, `Ingress` is always set and `Egress` only if the policy has egress rules - write `policyTypes` explicitly.
- Every namespace carries the label `kubernetes.io/metadata.name: <name>` - select namespaces by it instead of custom labels that someone may forget.
- `apiVersion: networking.k8s.io/v1`.

## Rollout order (never lock out production at once)

1. Inventory flows: who calls the app, what the app calls (DB, DNS, external APIs, metrics scrape).
2. Write the allow policies first: DNS egress, ingress from the Gateway namespace, egress to the DB, ingress from monitoring.
3. Apply the allows, then the default deny, in one change after `kubectl diff` and server dry-run.
4. Test each flow right after; keep the delete command of the deny policy ready as rollback (run only after the user's go).

## Selector semantics - the classic trap

```yaml
# ONE peer: pods labelled app=gw IN namespaces named infra (AND)
- from:
    - namespaceSelector:
        matchLabels: { kubernetes.io/metadata.name: infra }
      podSelector:
        matchLabels: { app: gw }
# TWO peers: any pod in infra, OR pods app=gw in the policy's own namespace (OR)
- from:
    - namespaceSelector:
        matchLabels: { kubernetes.io/metadata.name: infra }
    - podSelector:
        matchLabels: { app: gw }
```

One dash too many turns an AND into an OR and opens the namespace. Review every `-` in `from`/`to`.

## Egress essentials

- Default-deny egress also blocks DNS: allow UDP and TCP 53 to the cluster DNS pods (label is distribution-specific - `k8s-app: kube-dns` is common; read it with `kubectl -n kube-system get pods --show-labels`).
- `ipBlock` with `except` for external ranges; pod IPs are ephemeral, never put them in `ipBlock`.
- Traffic to the API server from pods (operators, controllers) needs an explicit egress allow; its address comes from `kubectl get endpointslices -n default -l kubernetes.io/service-name=kubernetes`.
- `endPort` allows a port range on one rule.

## What NetworkPolicy does not do

- No L7 (paths, methods), no FQDN rules, no explicit deny rules, no logging - those are CNI-specific extensions (e.g. Cilium policies, devops-k8s-cluster).
- Node-level and host-network pods are generally not covered the same way; behaviour varies by plugin.

→ Template: [networkpolicy-default-deny.yaml](templates/networkpolicy-default-deny.yaml)

## Debugging a blocked flow

```bash
kubectl --context "$CTX" -n "$NS" get networkpolicy
kubectl --context "$CTX" -n "$NS" describe networkpolicy default-deny-all
# which policies select the pod? compare its labels with every podSelector
kubectl --context "$CTX" -n "$NS" get pod "$POD" --show-labels
# test from an ephemeral debug container in the source pod (see troubleshooting-playbook.md)
kubectl --context "$CTX" -n "$NS" debug -it "$POD" --image=busybox:1.37 --target=app -- \
  wget -qO- -T 3 http://db.data.svc.cluster.local:5432 || echo blocked-or-closed
```

## Pitfalls

| Symptom | Cause |
|---------|-------|
| Everything still reachable after default deny | CNI does not enforce NetworkPolicy |
| Name resolution fails after egress deny | DNS egress not allowed |
| Gateway gets 503 after deny | Missing ingress allow from the Gateway's namespace/pods |
| Prometheus targets down | Missing ingress allow from the monitoring namespace |

## Verification

A flow is verified only by a real connection test from the source pod, before and after the change - not by reading the YAML.

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/concepts/services-networking/network-policies/
- https://hub.docker.com/v2/repositories/library/busybox/tags/1.37 (tag exists, updated 2026-10-28)

## Not verified

- The "What NetworkPolicy does not do" list (no L7, FQDN, deny rules, logging; host-network behaviour) is general CNI knowledge, not quoted from the page.
- The exact DNS pod label on a given distribution (`k8s-app: kube-dns` is a convention, read it on the cluster).
