---
name: devops-k8s-cluster
description: Use when building, upgrading, repairing or choosing the Kubernetes cluster itself - kubeadm, k3s or Talos (RKE2 and Cluster API as pointers), HA control plane and API endpoint, etcd health/backup/restore, version skew and upgrade order, node join/drain/replace/remove, certificate expiry, Cilium as CNI (kube-proxy replacement, Gateway API support), bare-metal LoadBalancer IPs (Cilium LB IPAM and L2 announcements, MetalLB, kube-vip) and cluster-level troubleshooting (NotReady nodes, etcd quorum loss, API server down, CNI broken). Not for workloads, Services, Gateway resources, RBAC or day-to-day kubectl (devops-kubernetes), Helm/Kustomize/Argo CD/Flux (devops-gitops-packaging), CSI backend internals (devops-storage-backup) or VM provisioning (devops-proxmox, devops-virtualization).
versions:
  kubernetes: "1.37.2 (supported minors 1.37, 1.36, 1.35)"
  k3s: "v1.37.2+k3s1"
  talos: "v1.14.5"
  cilium: "1.20.4"
  metallb: "v0.16.2"
  etcd: "v3.7.3 (GitHub tag, single source)"
  kubeadm-config-api: "kubeadm.k8s.io/v1beta4"
references:
  - references/distribution-choice.md
  - references/kubeadm-ha-bootstrap.md
  - references/k3s-cluster.md
  - references/talos-cluster.md
  - references/etcd-backup-restore.md
  - references/version-skew-upgrades.md
  - references/node-lifecycle.md
  - references/cni-cilium.md
  - references/baremetal-loadbalancing.md
  - references/cluster-troubleshooting.md
  - references/templates/kubeadm-ha-config.yaml
  - references/templates/k3s-server-config.yaml
  - references/templates/talos-patches.yaml
  - references/templates/cilium-values.yaml
  - references/templates/cilium-lb-ipam-l2.yaml
  - references/templates/metallb-l2.yaml
  - references/templates/etcd-snapshot-restore.md
  - references/templates/cluster-upgrade-checklist.md
related-skills:
  - devops-kubernetes
  - devops-gitops-packaging
  - devops-storage-backup
  - devops-networking
  - devops-linux
  - devops-proxmox
  - devops-virtualization
  - devops-openstack
  - devops-iac
  - devops-ansible
  - devops-observability
  - devops-secrets
  - devops-sre-ops
---

<objective>
Covers the cluster itself: choosing a distribution, bootstrapping an HA control
plane, etcd backup/restore/health, version skew and upgrades, node lifecycle,
certificate expiry, Cilium as the default CNI, bare-metal LoadBalancer IPs and
cluster-level troubleshooting. Does not cover workloads, Services, Gateway
resources, RBAC or kubectl usage (devops-kubernetes), packaging and GitOps
(devops-gitops-packaging), CSI backends (devops-storage-backup) or VM
provisioning (devops-proxmox, devops-virtualization).
</objective>

# DevOps Kubernetes Cluster

## Agent Workflow (MANDATORY)

Before ANY cluster change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - find existing cluster config (kubeadm YAML, k3s `config.yaml`, Talos patches, inventories, Terraform/Ansible that built the nodes)
2. **research-expert** - verify flags and versions at kubernetes.io, docs.k3s.io, docs.siderolabs.com, docs.cilium.io, etcd.io
3. **mcp__context7__query-docs** - `/websites/etcd_io`, `/websites/cilium_io_en_stable`, `/websites/kubernetes_io`

Then inspect read-only first (`kubectl get nodes -o wide`, `kubectl version`, etcd health, certificate expiry). After changes to files, run **sniper**.

## Versions (checked 2026-11-10)

Kubernetes v1.37.2 / v1.36.6 / v1.35.10 are the latest patches; supported minors are 1.37, 1.36, 1.35 (https://kubernetes.io/releases/version-skew-policy/). k3s v1.37.2+k3s1, Talos v1.14.5 (docs.siderolabs.com/talos/v1.14), Cilium 1.20.4, MetalLB v0.16.2. etcd v3.7.3 comes from a GitHub tag only; the Kubernetes etcd page names 3.4.29+ and 3.5.11+ as the minimum for production. Cilium documents Gateway API CRDs v1.6.3 although Gateway API v1.7.0 exists: install the version Cilium documents. Kubernetes 1.37 kubelet defaults to cgroup v2 only (`FailCgroupV1: true`).

## Overview

| Area | Decision in one line |
|------|----------------------|
| **Distribution** | kubeadm = upstream, you own OS and etcd; k3s = single binary, embedded etcd HA; Talos = immutable, API-only, no SSH; RKE2 and Cluster API are pointers ([distribution-choice.md](references/distribution-choice.md)) |
| **Control plane** | 3 stacked nodes minimum behind a TCP endpoint (VIP or load balancer); kubeadm `controlPlaneEndpoint` must equal that address |
| **etcd** | Odd member count; 3 tolerate 1 loss, 5 tolerate 2; snapshot on a schedule, off the node, restore-tested |
| **Upgrades** | One minor at a time, API server first, kubelet may lag up to three minors; drain before a minor kubelet upgrade |
| **CNI** | Cilium by default; install it before joining more nodes; kube-proxy replacement needs `k8sServiceHost` and `k8sServicePort` |
| **Bare-metal LB** | Cilium LB IPAM + L2 announcements if Cilium is the CNI; MetalLB otherwise; kube-vip for the control-plane VIP |
| **Troubleshooting** | kubelet and container runtime first, then etcd, then API server, then CNI ([cluster-troubleshooting.md](references/cluster-troubleshooting.md)) |

## Critical Rules

1. **Version first** - read server, kubelet and etcd versions before any upgrade; never skip a minor ([version-skew-upgrades.md](references/version-skew-upgrades.md))
2. **Backup before touching etcd** - a fresh snapshot, copied off the node, with `etcdutl snapshot status` output attached ([etcd-backup-restore.md](references/etcd-backup-restore.md))
3. **Destructive verbs are proposed, not run** - `kubeadm reset`, `etcdutl snapshot restore`, `etcdctl member remove`, `talosctl reset`, `talosctl bootstrap --recover-from`, `k3s server --cluster-reset`, `kubectl delete node`, `k3s-uninstall.sh`: show ACTION / EFFECT / QUORUM / PROOF and wait for the user's go
4. **Quorum arithmetic before any member change** - state members, quorum and how many can still fail after the action
5. **One control-plane node at a time** - verify `Ready` and etcd health before the next
6. **Explicit target** - name the node and the kubeconfig/context in every command; Talos commands carry `--nodes`
7. **Never invent a flag or config key** - cite the official page; unknown = "not verified"
8. **Secrets stay secret** - kubeadm certificate key, join tokens, etcd snapshots (they hold the CA keys and all Secrets) and Talos `secrets.yaml` are never printed or committed

## Architecture

```
cluster-repo/
├── kubeadm/ClusterConfiguration + InitConfiguration   # or k3s/config.yaml, or talos/patches/
├── cni/cilium-values.yaml                             # pinned chart version
├── lb/pool + announcement policy                      # Cilium LB IPAM/L2 or MetalLB
├── backup/etcd-snapshot job + restore runbook
└── upgrades/checklist per minor
```

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Distribution choice** | [distribution-choice.md](references/distribution-choice.md) | New cluster, kubeadm vs k3s vs Talos, RKE2, Cluster API |
| **kubeadm HA** | [kubeadm-ha-bootstrap.md](references/kubeadm-ha-bootstrap.md) | init/join, stacked vs external etcd, endpoint, tokens |
| **k3s** | [k3s-cluster.md](references/k3s-cluster.md) | Embedded-etcd HA, config file, snapshots, uninstall |
| **Talos** | [talos-cluster.md](references/talos-cluster.md) | Machine config, bootstrap, upgrades, disaster recovery |
| **etcd** | [etcd-backup-restore.md](references/etcd-backup-restore.md) | Health, snapshot, restore, member replacement, defrag |
| **Upgrades and certificates** | [version-skew-upgrades.md](references/version-skew-upgrades.md) | Skew limits, upgrade order, certificate renewal |
| **Node lifecycle** | [node-lifecycle.md](references/node-lifecycle.md) | Join, cordon/drain, replace, remove, reset |
| **CNI** | [cni-cilium.md](references/cni-cilium.md) | Cilium install, kube-proxy replacement, Gateway API support |
| **Bare-metal LB** | [baremetal-loadbalancing.md](references/baremetal-loadbalancing.md) | LoadBalancer IPs, ARP/BGP, control-plane VIP |
| **Troubleshooting** | [cluster-troubleshooting.md](references/cluster-troubleshooting.md) | NotReady node, quorum loss, API server, CNI |

### Templates

| Template | When to Use |
|----------|-------------|
| [kubeadm-ha-config.yaml](references/templates/kubeadm-ha-config.yaml) | `kubeadm init --config` for an HA control plane (v1beta4) |
| [k3s-server-config.yaml](references/templates/k3s-server-config.yaml) | `/etc/rancher/k3s/config.yaml` for an HA server |
| [talos-patches.yaml](references/templates/talos-patches.yaml) | Talos patch: no default CNI, no kube-proxy, install disk |
| [cilium-values.yaml](references/templates/cilium-values.yaml) | Helm values: kube-proxy replacement, L2 announcements, Gateway API |
| [cilium-lb-ipam-l2.yaml](references/templates/cilium-lb-ipam-l2.yaml) | LoadBalancer IP pool and L2 announcement policy |
| [metallb-l2.yaml](references/templates/metallb-l2.yaml) | MetalLB address pool and L2 advertisement |
| [etcd-snapshot-restore.md](references/templates/etcd-snapshot-restore.md) | Snapshot, verify, restore sequence with proposal blocks |
| [cluster-upgrade-checklist.md](references/templates/cluster-upgrade-checklist.md) | Minor-version upgrade checklist |

## Quick Reference

```bash
kubectl get nodes -o wide                              # Ready? versions? InternalIP correct?
kubectl get --raw='/readyz?verbose'                    # API server readiness checks
kubeadm certs check-expiration                         # kubeadm clusters, on a control-plane node
sudo kubeadm upgrade plan                              # read-only: what can be upgraded
ETCDCTL_API=3 etcdctl --endpoints=$EP --cacert=$CA --cert=$CRT --key=$KEY endpoint status -w table
talosctl -n <ip> etcd status                           # Talos clusters
```

## Best Practices

### DO
- Put the control-plane endpoint on a DNS name that resolves to the VIP or load balancer, set once at `kubeadm init`
- Keep etcd on SSD-backed, dedicated or isolated disks; heartbeat timeouts under disk or network starvation cause leader loss
- Pin Cilium, MetalLB and Talos versions and read each release's upgrade notes before bumping
- Rebalance CoreDNS after the control-plane nodes have joined (`kubectl -n kube-system rollout restart deployment coredns`)

### DON'T
- Run an even number of etcd members, or auto-scale etcd
- Remove kube-proxy on a live cluster without a plan: existing Service connections break
- Run `kubeadm reset` on a node whose etcd member you have not accounted for in the quorum arithmetic
- Restore an etcd snapshot while any API server is running
