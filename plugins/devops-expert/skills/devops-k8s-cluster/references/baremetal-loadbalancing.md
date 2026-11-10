---
name: baremetal-loadbalancing
description: Load balancing on bare metal - control-plane VIP (kube-vip, keepalived + HAProxy) and LoadBalancer Service IPs (Cilium LB IPAM + L2 announcements, MetalLB)
when-to-use: A cluster outside a cloud needs a stable API endpoint or Services of type LoadBalancer get no external IP
keywords: kube-vip, metallb, cilium lb ipam, l2 announcements, CiliumLoadBalancerIPPool, CiliumL2AnnouncementPolicy, IPAddressPool, L2Advertisement, strictARP, keepalived, haproxy
priority: high
related: cni-cilium.md, kubeadm-ha-bootstrap.md, cluster-troubleshooting.md
---

# Bare-Metal Load Balancing

**Load when:** `EXTERNAL-IP` stays `<pending>`, or the API endpoint has no HA. Two separate problems, two separate components. Templates: [cilium-lb-ipam-l2.yaml](templates/cilium-lb-ipam-l2.yaml), [metallb-l2.yaml](templates/metallb-l2.yaml). The Service/Gateway objects that consume these IPs are in devops-kubernetes.

## Decision

| Problem | Pick | Notes |
|---------|------|-------|
| API server endpoint (port 6443, before any CNI exists) | **kube-vip static pod** (ARP or BGP) or **keepalived + HAProxy** (same subnet), or a hardware/virtual appliance | Must exist before `kubeadm init`; the address equals `controlPlaneEndpoint` |
| `type: LoadBalancer` Services, Cilium is the CNI with kube-proxy replacement | **Cilium LB IPAM + L2 announcements** (or BGP Control Plane) | One component less; L2 announcements are **beta** |
| `type: LoadBalancer` Services, other CNI or you want a mature standalone | **MetalLB** (L2 or BGP) | v0.16.2; FRR-K8s mode recommended for BGP, native mode for L2-only/simple BGP |
| Both control-plane VIP and Service IPs from one tool | **kube-vip** with `--controlplane --services` | Watches `LoadBalancer` Services and advertises via ARP/BGP |

Never run two controllers that both assign or announce the same Service IPs (for example Cilium L2 announcements and MetalLB over one range); pick one per address range.

## Control-plane VIP

kube-vip as a static pod (https://kube-vip.io/docs/installation/static/): generate the manifest with the kube-vip image, write it to `/etc/kubernetes/manifests/kube-vip.yaml` on the first node **before** `kubeadm init --control-plane-endpoint <VIP>`, then copy it to each additional control-plane node's manifest directory.

```bash
export VIP=192.168.0.40 INTERFACE=ens160 KVVERSION=<release tag>
kube-vip manifest pod --interface $INTERFACE --address $VIP --controlplane --services --arp --leaderElection | sudo tee /etc/kubernetes/manifests/kube-vip.yaml
```

(`kube-vip` is an alias for running the image with host networking, defined on the page for containerd or Docker.) keepalived (VRRP, health script curling `https://localhost:<port>/healthz`) + HAProxy (TCP mode, TLS stays at the apiserver) is the long-established alternative; all hosts must share a subnet.

## Cilium LB IPAM + L2 announcements

```bash
helm upgrade cilium cilium/cilium --version 1.20.4 -n kube-system --reuse-values \
  --set l2announcements.enabled=true --set k8sClientRateLimit.qps=<QPS> --set k8sClientRateLimit.burst=<BURST>
kubectl apply -f cilium-lb-ipam-l2.yaml
kubectl get ippools ; kubectl -n kube-system get lease | grep cilium-l2announce
```

- LB IPAM is always present but dormant until the first `CiliumLoadBalancerIPPool` exists; it only **allocates** IPs. `CiliumL2AnnouncementPolicy` (`cilium.io/v2alpha1`) makes nodes answer ARP/NDP for them (`loadBalancerIPs: true`; both IP types default to false, so a policy without one does nothing).
- Prerequisites: kube-proxy replacement on; the announcing interfaces must be among Cilium's `devices`. Size `k8sClientRateLimit` - announcements raise API traffic (see the sizing section of the page).
- One node per Service answers ARP (a Kubernetes Lease per Service, first come first served): that node carries all north-south traffic for the IP and nodes can be unevenly loaded. Failover moves the Lease.
- **Incompatible with `externalTrafficPolicy: Local`** (IP may be announced on nodes without pods).
- Pools must not overlap (the later one is marked `Conflicting`); disabling a pool stops new allocations only; **editing a pool can reassign Service IPs** (GitHub issue 40358).
- Services need `loadBalancerClass` unset or `io.cilium/l2-announcer` to be announced by a policy. By default every IP in a CIDR is used; `allowFirstLastIPs: "No"` reserves the network/broadcast addresses.

## MetalLB

```bash
# only if kube-proxy runs in IPVS mode: set ipvs.strictARP: true in the kube-proxy ConfigMap (diff first)
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.16.2/config/manifests/metallb-native.yaml
kubectl apply -f metallb-l2.yaml
```

Installs into `metallb-system` (controller Deployment + speaker DaemonSet); it stays idle until `IPAddressPool` and an `L2Advertisement` (or BGP resources) exist, all in that same namespace. An `L2Advertisement` without a pool selector applies to every pool. In L2 mode one node per IP answers ARP; limit candidates with `nodeSelectors`, prefer nodes with `preferredNodeSelectors`, or restrict `interfaces`. The speaker needs elevated privileges: on namespaces enforcing Pod Security Admission, label `metallb-system` accordingly. Check the manifest URL: it deploys from the repo at the named tag, and MetalLB advises a stable release for production.

## Network preconditions

L2 mode needs the client network and the nodes in the same broadcast domain (switch port security, ARP inspection, and some virtual switches suppress gratuitous ARP). BGP needs a peer router configured by devops-networking. On Proxmox/KVM bridges check that MAC/IP spoofing filters do not drop the announced MAC.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Pool range overlaps DHCP or a real host | IP conflict, flapping ARP |
| MetalLB with kube-proxy IPVS and no `strictARP` | Wrong ARP replies |
| `externalTrafficPolicy: Local` + Cilium L2 | Drops on nodes without pods |
| VIP address differs from `controlPlaneEndpoint` | Joins and kubeconfigs fail |
| Cilium L2 policy with both IP types left false | Nothing announced |

## Verification

`kubectl get svc -A | grep LoadBalancer` shows an IP; from a host on the same L2, `arping -I <if> <ip>` or `ip neigh` returns one MAC; `curl` to the IP reaches the backend; power off the announcing node in a rehearsal and measure how long the IP takes to move.

## Sources (read 2026-11-10)

- https://docs.cilium.io/en/stable/network/lb-ipam/ , https://docs.cilium.io/en/stable/network/l2-announcements/
- https://metallb.io/installation/ , https://metallb.io/configuration/ , https://metallb.io/configuration/_advanced_l2_configuration/
- https://kube-vip.io/docs/installation/static/ , https://github.com/kubernetes/kubeadm/blob/main/docs/ha-considerations.md

## Not verified

- kube-vip's current release (use the GitHub release list), its BGP mode, and the 6443 ARP behaviour with Kubernetes versions that changed kubeadm kubeconfigs.
- Cilium BGP Control Plane and MetalLB BGP/FRR-K8s configuration; MetalLB Helm values; MetalLB PSA label names.
- `arping` verification and switch-level ARP behaviour are operational practice.
