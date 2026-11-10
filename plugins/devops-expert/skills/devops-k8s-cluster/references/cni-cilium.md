---
name: cni-cilium
description: Cilium as the default CNI - requirements, install order per distribution, kube-proxy replacement, Gateway API support at the cluster level, validation and upgrade rules
when-to-use: Choosing or installing the CNI, replacing kube-proxy, enabling Cilium's Gateway API controller, or debugging a node stuck NotReady because of the CNI
keywords: cilium, cni, kube-proxy replacement, kubeProxyReplacement, k8sServiceHost, gatewayAPI.enabled, helm, hubble, l7Proxy, flannel
priority: high
related: baremetal-loadbalancing.md, kubeadm-ha-bootstrap.md, k3s-cluster.md, talos-cluster.md, cluster-troubleshooting.md
---

# CNI: Cilium

**Load when:** the cluster needs a CNI or the CNI is suspect. Values template: [cilium-values.yaml](templates/cilium-values.yaml). Gateway/HTTPRoute resources and NetworkPolicy objects belong to devops-kubernetes; here only the cluster-level switches.

## Why Cilium by default

One component gives pod networking, eBPF Service load balancing (kube-proxy replacement), network policy enforcement, LoadBalancer IP management with L2/BGP announcement, and a Gateway API controller. Flannel (k3s default) gives pod networking only.

## Requirements (https://docs.cilium.io/en/stable/operations/system_requirements/)

- AMD64 or AArch64; Linux kernel >= 5.10 (or 4.18 on RHEL 8.10) with the BPF options enabled (standard distribution kernels have them). Debian >= 10, Ubuntu >= 20.04, RHEL >= 8.6, Talos >= 1.5.0 are listed.
- Kernel-level features beyond the base need newer kernels: read the "advanced features" table before enabling a feature.
- `kubelet --node-ip` must be right on multi-homed nodes (`kubectl get nodes -o wide` shows `InternalIP`); kube-proxy replacement may not work otherwise.
- Pod CIDR consistency: the Cilium IPAM setting must match the kubeadm `podSubnet` when you use one.

## Install order

| Distribution | Before the CNI |
|--------------|----------------|
| kubeadm | `kubeadm init` with `proxy.disabled: true` in `ClusterConfiguration` (v1beta4) or `--skip-phases=addon/kube-proxy`; nodes stay `NotReady` until Cilium runs |
| k3s | `flannel-backend: none`, `disable-network-policy: true`, `disable-kube-proxy: true` on **all** servers |
| Talos | patch deletes `KubeFlannelCNIConfig` (v1.14+) and sets `KubeProxyConfig enabled: false`; apply before bootstrap; install Cilium within about ten minutes |

```bash
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium --version 1.20.4 --namespace kube-system -f cilium-values.yaml
kubectl -n kube-system get pods -l k8s-app=cilium
```

With `kubeProxyReplacement: true` and no kube-proxy, the agent cannot use the in-cluster `kubernetes` Service, so `k8sServiceHost`/`k8sServicePort` must name the API server: a control-plane node IP and `6443` in Cilium's example. For an HA control plane use the `controlPlaneEndpoint` (VIP/DNS) so the agent survives the loss of one node. On Talos use `localhost:7445` (KubePrism) and the Talos-specific values (IPAM `kubernetes`, cgroup auto-mount off, drop `SYS_MODULE`) in the template.

## Switching a LIVE cluster off kube-proxy (destructive)

```
ACTION   kubectl -n kube-system delete ds kube-proxy ; kubectl -n kube-system delete cm kube-proxy ; (each node, root) iptables-save | grep -v KUBE | iptables-restore
EFFECT   removing kube-proxy breaks existing Service connections and stops Service traffic until Cilium's replacement is serving;
         the two mechanisms do not share NAT state, so toggling either on a running cluster drops live connections. Deleting the ConfigMap stops kubeadm re-adding it on upgrade
QUORUM   none, but the API Service VIP is affected on nodes without a working replacement
PROOF    Cilium installed with kubeProxyReplacement=true and `cilium-dbg status` reporting it True on every node first; maintenance window announced
WAIT-FOR-GO
```

On a new cluster with no traffic this is not an issue: skip kube-proxy from the start.

## Validate

```bash
kubectl -n kube-system exec ds/cilium -- cilium-dbg status | grep KubeProxyReplacement      # True [...]
kubectl -n kube-system exec ds/cilium -- cilium-dbg service list                            # Service frontends/backends present
kubectl get nodes -o wide ; kubectl -n kube-system get pods -o wide                         # nothing stuck
```

`kubeProxyReplacement: true` makes the agent refuse to start when the kernel lacks support (good: fails loudly). The Helm default is `false` (ClusterIP in-cluster balancing only).

## Gateway API controller (cluster-level)

Prerequisites per the Cilium page: kube-proxy replacement on; `l7Proxy=true` (default); nodes provide iptables and the netfilter modules for the default TPROXY implementation (`bpf.tproxy=true` is beta); an environment that provides `LoadBalancer` Services (see [baremetal-loadbalancing.md](baremetal-loadbalancing.md)) or host-network mode (since Cilium 1.16). Install the Gateway API CRDs **at the version Cilium documents (v1.6.3 for 1.20.4)**, not the newest upstream release (v1.7.0 exists), with `kubectl apply --server-side` and the standard channel unless you need experimental fields. Then:

```bash
helm upgrade cilium cilium/cilium --version 1.20.4 -n kube-system --reuse-values --set kubeProxyReplacement=true --set gatewayAPI.enabled=true
kubectl -n kube-system rollout restart deployment/cilium-operator ; kubectl -n kube-system rollout restart ds/cilium
kubectl get gatewayclass
```

Supported resources include GatewayClass, Gateway, HTTPRoute, GRPCRoute, TLSRoute, BackendTLSPolicy, ReferenceGrant (and TCP/UDP routes, ListenerSet). The Gateway/HTTPRoute manifests live in devops-kubernetes `services-gateway-api.md`.

## Upgrading Cilium

Pin the chart version, read the upgrade guide (https://docs.cilium.io/en/stable/operations/upgrade/) first - it carries breaking changes, e.g. Gateway API CRD and `TLSRoute` notes for 1.20 - upgrade after the control plane, and after `kubeadm upgrade apply` follow the "CNI provider" step.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Installing the newest Gateway API CRDs instead of the documented version | Controller/CRD mismatch |
| `helm upgrade` without `--reuse-values` or the full values file | Settings (KPR, L2 announcements) silently revert |
| Wrong `InternalIP` on a multi-homed node | KPR misroutes |
| Two CNIs (Flannel left on) | Config conflict in `/etc/cni/net.d` |
| Enabling L2 announcements without KPR | Documented prerequisite missing |

## Sources (read 2026-11-10)

- https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/gateway-api/ (+ Context7 `/websites/cilium_io_en_stable`)
- https://docs.cilium.io/en/stable/operations/system_requirements/
- https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium.md
- https://docs.k3s.io/networking/basic-network-options

## Not verified

- The Cilium upgrade guide contents, Hubble setup, encryption (WireGuard/IPsec) and BGP Control Plane.
- Using the VIP/DNS endpoint as `k8sServiceHost` on kubeadm is inferred from the requirement (the page's example uses a control-plane IP).
- Context7 snippets show Gateway API CRD v1.6.1 and Helm 1.20.2 (older indexed copies); the fetched stable page says v1.6.3 and 1.20.4.
