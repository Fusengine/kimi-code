---
name: distribution-choice
description: Choosing how to build the cluster - kubeadm, k3s, Talos, with RKE2 and Cluster API as pointers
when-to-use: Before creating a new cluster or when asked "which Kubernetes distribution"
keywords: kubeadm, k3s, talos, rke2, cluster api, distribution, immutable os, embedded etcd, ha
priority: high
related: kubeadm-ha-bootstrap.md, k3s-cluster.md, talos-cluster.md, version-skew-upgrades.md
---

# Distribution Choice

**Load when:** a cluster is about to be created, rebuilt or migrated. The choice decides who owns the OS, etcd, upgrades and recovery.

## Decision table

| Need | Pick | Why (source) |
|------|------|--------------|
| Upstream behaviour, you manage Linux hosts, exact control of every component | **kubeadm** | Bootstraps control plane as static pods; stacked etcd by default; HA needs an external endpoint you provide |
| Few nodes, edge/homelab, single binary, fastest path to HA | **k3s** | HA = 3+ servers with embedded etcd via `--cluster-init`; config in `/etc/rancher/k3s/config.yaml`; Flannel by default |
| No SSH, immutable OS, API-managed nodes, reproducible machine config | **Talos** | Everything through the Talos API (`talosctl`); A-B image upgrades with rollback |
| Hardened, FIPS/government-style distribution from Rancher | **RKE2** (pointer) | https://docs.rke2.io/ - "Rancher's enterprise-ready next-generation Kubernetes distribution"; not covered here, read its docs before use |
| Many clusters, declarative lifecycle, GitOps-driven | **Cluster API** (pointer) | https://cluster-api.sigs.k8s.io/user/quick-start - needs a management cluster (a "real" cluster with backup/DR for production, at least v1.20.0) plus an infrastructure provider; `clusterctl` or the Cluster API Operator |
| Managed cloud Kubernetes | out of scope | EKS/GKE/AKS |

## Rules of thumb

1. **Pick the distribution before the CNI and the LB** - Talos and k3s ship defaults (Flannel for k3s; Talos installs Flannel unless you delete it) that you must disable to run Cilium ([cni-cilium.md](cni-cilium.md)).
2. **Ownership of the OS** - kubeadm: you patch Linux, container runtime, kubelet (devops-linux). Talos: the OS is part of the cluster and is upgraded with `talosctl upgrade`. k3s: one binary, but the host OS is still yours.
3. **etcd** - kubeadm stacked (default) needs a minimum of three control-plane nodes; external etcd needs three control plane hosts plus three etcd hosts (https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/). k3s embeds etcd with an odd number of servers. Talos runs etcd on the control-plane nodes.
4. **Kubernetes version lag** - k3s and Talos each document a supported Kubernetes range; check Talos' support matrix (https://docs.siderolabs.com/talos/v1.14/getting-started/support-matrix.md) and the k3s release for the minor you want before committing.
5. **Single control-plane node is a lab** - a lost disk is a lost cluster unless snapshots exist ([etcd-backup-restore.md](etcd-backup-restore.md)). Talos' own guide says snapshots matter even more with one control-plane node.
6. **Where the VMs come from** - Proxmox/KVM provisioning is devops-proxmox / devops-virtualization; node configuration at scale is devops-ansible / devops-iac.

## What each choice costs you

| | kubeadm | k3s | Talos |
|-|---------|-----|-------|
| Upgrade unit | per node: packages, `kubeadm upgrade`, kubelet restart | per node: install script or binary swap | `talosctl upgrade` per node (OS) and `talosctl upgrade-k8s` (Kubernetes) |
| API endpoint HA | you build it (VIP/LB) | optional fixed registration address, `--tls-san` | LB or multi-A DNS record, plus KubePrism for in-node access |
| Backup tool | `etcdctl snapshot save` | `k3s etcd-snapshot` (local or S3) | `talosctl etcd snapshot` |
| Node removal | drain, `kubectl delete node`, `kubeadm reset` | drain, delete node, uninstall script | drain, delete node, `talosctl reset` |

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Choosing a distribution by blog post without reading its version-support page | Kubernetes minor you need is not offered yet, or is nearly end of life (1.34 ended 2026-10-27) |
| Mixing distributions in one cluster | No supported upgrade or recovery path |
| Starting with one control-plane node "to be expanded later" on kubeadm | Needs `controlPlaneEndpoint` set at `kubeadm init` to expand cleanly - set it from day one ([kubeadm-ha-bootstrap.md](kubeadm-ha-bootstrap.md)) |

## Verification

State the choice with its reasons, the Kubernetes minor, the number of control-plane nodes (odd), and the answer to "where is the etcd snapshot stored and who tested the restore?".

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/
- https://docs.k3s.io/datastore/ha-embedded , https://docs.k3s.io/networking/basic-network-options
- https://docs.siderolabs.com/talos/v1.14/overview/what-is-talos.md , https://docs.siderolabs.com/talos/v1.14/getting-started/prodnotes.md
- https://docs.rke2.io/ , https://cluster-api.sigs.k8s.io/user/quick-start

## Not verified

- RKE2 install, HA and upgrade procedures (only the one-line description was read).
- Cluster API provider list, current Cluster API version (v1.14.4 from a GitHub tag only) and the Proxmox/OpenStack provider status.
- Talos support-matrix contents (page named, not read).
