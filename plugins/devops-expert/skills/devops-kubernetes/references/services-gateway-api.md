---
name: services-gateway-api
description: Services, traffic entry with Gateway API, and leaving Ingress / Ingress NGINX
when-to-use: Exposing an app, writing a Gateway or HTTPRoute, migrating off Ingress NGINX
keywords: service, clusterip, loadbalancer, headless, gateway api, httproute, referencegrant, ingress, ingress-nginx, ingress2gateway
priority: high
related: network-policy.md, troubleshooting-playbook.md
---

# Services and Gateway API

**Load when:** exposing a workload inside or outside the cluster, or an Ingress / Ingress NGINX setup must be replaced.

## Status on 2026-11-10 (verified)

| Item | Status | Source |
|------|--------|--------|
| Ingress API | Stable since v1.19 and **frozen**: still GA, no new features; the project recommends Gateway | https://kubernetes.io/docs/concepts/services-networking/ingress/ |
| Ingress NGINX | **Retired**: best-effort maintenance until March 2026, then no releases, no bugfixes, no security fixes; existing installs keep running | https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/ |
| `kubernetes/ingress-nginx` repo | Archived (`"archived": true`, last push 2026-03-23) | https://api.github.com/repos/kubernetes/ingress-nginx |
| Gateway API | v1.7.0 released 2026-10-29 | https://github.com/kubernetes-sigs/gateway-api/releases/tag/v1.7.0 |
| ingress2gateway | v1.2.0 (2026-07-07) | https://github.com/kubernetes-sigs/ingress2gateway/releases |

Decision: new exposure = Gateway API. A cluster still on Ingress NGINX carries unpatched CVE risk: plan the migration, do not extend it.

## Services

| Type | Use |
|------|-----|
| `ClusterIP` (default) | In-cluster callers; the backend of every HTTPRoute |
| headless (`clusterIP: None`) | StatefulSet per-pod DNS, client-side discovery |
| `NodePort` | Rarely directly; building block for external LBs |
| `LoadBalancer` | L4 exposure; on bare metal needs an LB implementation (devops-k8s-cluster) |

`spec.trafficDistribution: PreferSameZone` or `PreferSameNode` keeps traffic local when endpoints exist there; `PreferClose` is the deprecated older alias of `PreferSameZone` (Service page).
A Service with no endpoints = selector does not match pod labels, or no pod is Ready.

## Gateway API model

| Resource (`gateway.networking.k8s.io/v1`) | Owner | Role |
|-------------------------------------------|-------|------|
| `GatewayClass` | Controller install | Which implementation |
| `Gateway` | Platform team | Listeners (port, protocol, hostname, TLS), `allowedRoutes` |
| `ListenerSet` | App team | Extra listeners merged onto a shared Gateway (Standard since v1.5) |
| `HTTPRoute` | App team | Host/path/header matching, filters, weighted `backendRefs` |
| `TLSRoute` | App team | SNI routing (Standard since v1.5) |
| `TCPRoute`, `UDPRoute` | App team | L4 routing (Standard and `v1` since v1.6; `v1alpha2` deprecated) |
| `ReferenceGrant` | Owner of the target namespace | Allows a cross-namespace reference (e.g. Gateway → Secret); `v1` since v1.5 |

Standard additions: HTTPRoute CORS filter and client certificate validation (v1.5); HTTPRoute `retry` (`codes`, `attempts`, `backoff`) in Standard since v1.7 - `backoff` behaviour is implementation-specific.
Since v1.6, new experimental resources live in `gateway.networking.x-k8s.io` with an `X` prefix (`XBackend`, `XMesh`); anything in that group is experimental.

## Install the CRDs (pinned tag)

```bash
kubectl --context "$CTX" apply --server-side --dry-run=server \
  -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.7.0/standard-install.yaml
kubectl --context "$CTX" apply --server-side \
  -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.7.0/standard-install.yaml
```

Use `experimental-install.yaml` only on purpose. Many controllers bundle their own CRDs - check before installing a second copy, and check the controller's conformance report for the release you install.

## Routing patterns

- One shared Gateway per environment in an infra namespace; app namespaces attach via `allowedRoutes.namespaces.from: Selector`.
- HTTP listener carries only a `RequestRedirect` route (`scheme: https`, `statusCode: 301`); the HTTPS listener (`tls.mode: Terminate`, `certificateRefs`) carries the app routes.
- `parentRefs[].sectionName` pins a route to one listener.
- Canary: two `backendRefs` with `weight`.

→ Template: [gateway-httproute.yaml](templates/gateway-httproute.yaml)

## Migrating from Ingress NGINX

1. Inventory: `kubectl --context "$CTX" get ingress -A -o yaml > ingress-inventory.yaml`; list every `nginx.ingress.kubernetes.io/*` annotation - each one needs an explicit equivalent or is dropped.
2. Convert with ingress2gateway as a draft, then review by hand (annotations do not all map).
3. Deploy the Gateway controller next to Ingress NGINX; point a test hostname at the new Gateway.
4. Move hostnames one by one (DNS or LB switch), watch errors, keep the old path ready.
5. Remove Ingress objects and the controller only after the user's go ([kubectl-safe-ops.md](kubectl-safe-ops.md)).

## Verification

```bash
kubectl --context "$CTX" get gatewayclass
kubectl --context "$CTX" -n infra get gateway shared -o jsonpath='{.status.conditions}'
kubectl --context "$CTX" -n "$NS" get httproute web -o yaml | grep -A5 'parents:'   # Accepted / ResolvedRefs
kubectl --context "$CTX" -n "$NS" get endpointslices -l kubernetes.io/service-name=web
```

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/concepts/services-networking/ingress/ , https://kubernetes.io/docs/concepts/services-networking/service/
- https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/ , https://kubernetes.io/blog/2026/08/03/gateway-api-v1-6-release/
- https://gateway-api.sigs.k8s.io/guides/getting-started/ (install commands), Context7 `/websites/gateway-api_sigs_k8s_io` (redirect, multiple-ns guides)

## Not verified

- Minimum Kubernetes version for Gateway API v1.7 (the v1.5 post says 1.30 or later; not re-read for v1.7).
- GRPCRoute and BackendTLSPolicy channel/version (not read today).
- Which controllers are conformant with v1.7.0; ingress2gateway's annotation coverage.
- Feature state of `trafficDistribution` values `PreferSameZone`/`PreferSameNode`.
