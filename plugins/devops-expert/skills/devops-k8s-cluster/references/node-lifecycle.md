---
name: node-lifecycle
description: Node lifecycle - joining, maintenance (cordon/drain/uncordon), replacing and removing workers and control-plane nodes, kubeadm reset and its leftovers
when-to-use: Adding, patching, replacing or decommissioning a node, or recovering a node that was reset
keywords: kubeadm join, cordon, drain, uncordon, kubectl delete node, kubeadm reset, node replacement, etcd member, decommission
priority: high
related: etcd-backup-restore.md, kubeadm-ha-bootstrap.md, version-skew-upgrades.md, cluster-troubleshooting.md
---

# Node Lifecycle

**Load when:** a node enters, leaves or is taken out temporarily. Workload-side effects of `drain` (PDBs, emptyDir, eviction) are detailed in devops-kubernetes `kubectl-safe-ops.md`; this file adds the cluster-infrastructure side.

## Lifecycle at a glance

| Step | kubeadm | k3s | Talos |
|------|---------|-----|-------|
| Join worker | `kubeadm join <endpoint> --token ... --discovery-token-ca-cert-hash ...` (new token: `kubeadm token create --print-join-command`) | `curl -sfL https://get.k3s.io \| K3S_TOKEN=... sh -s - agent --server https://<server>:6443` | `talosctl apply-config --insecure --nodes <ip> --file worker.yaml` |
| Join control plane | `kubeadm join ... --control-plane --certificate-key <key>` | `... sh -s - server --server https://<server1>:6443` | `apply-config` with `controlplane.yaml` (bootstrap only on the first node, ever) |
| Maintenance | `kubectl drain <n> --ignore-daemonsets` ... `kubectl uncordon <n>` | same | same, plus `talosctl upgrade`/`reboot` |
| Remove | drain -> `kubectl delete node` -> `kubeadm reset` | drain -> `kubectl delete node` -> `k3s-agent-uninstall.sh` / `k3s-uninstall.sh` | drain -> `kubectl delete node` -> `talosctl reset` |

## Maintenance (reboot, kernel patch, runtime update)

```bash
kubectl cordon <node>                      # no new pods; reversible
kubectl get pdb -A                         # ALLOWED DISRUPTIONS must be > 0 for what runs there
kubectl drain <node> --ignore-daemonsets   # evicts; add --delete-emptydir-data only if the data is disposable
# ... patch / reboot ...
kubectl uncordon <node>
```

Drain is **required** before a minor kubelet upgrade. Do worker nodes one at a time or in batches that leave capacity for the workloads. When a node is unreachable it becomes `NotReady`, taints are added, and pods are evicted after about five minutes ([cluster-troubleshooting.md](cluster-troubleshooting.md)).

## Replace a control-plane node (kubeadm, stacked etcd)

Order: **add first, remove second** so the member count never drops below quorum.

1. Snapshot etcd and record `member list` ([etcd-backup-restore.md](etcd-backup-restore.md)).
2. Provision the new node, install the same package versions, `kubeadm join --control-plane` (re-issue the certificate key if older than two hours).
3. Verify the new member is `started` and the cluster is healthy.
4. Drain the old node, then remove it (below). If the old node is dead and its etcd member remains, remove that member explicitly with the quorum arithmetic stated.
5. Update the load balancer/VIP target list and monitoring.

## Remove a node (propose, then the user's go)

```
ACTION   kubectl --context <ctx> delete node <name>
EFFECT   deletes the Node object; pods bound to it are garbage-collected; it does NOT stop kubelet or remove the host's state;
         if kubelet is still running it re-registers itself
QUORUM   none for workers; for a control-plane node the etcd member is NOT removed by this command
PROOF    node drained, `kubectl get pods -A -o wide --field-selector spec.nodeName=<name>` shows only DaemonSet pods; backups ok
WAIT-FOR-GO

ACTION   sudo kubeadm reset   (on the node; add --dry-run first to see the plan; -f skips the confirmation prompt)
EFFECT   phases preflight, remove-etcd-member, cleanup-node: reverts files created by init/join, and on a control-plane node removes
         that node's local stacked etcd member from the etcd cluster
QUORUM   with the replacement already joined: 4 -> 3 members (1 failure tolerated); without a replacement: 3 -> 2 (zero failures tolerated) - state which case applies
PROOF    node drained and deleted from the API; `etcdctl member list` taken before; replacement control-plane node already joined
WAIT-FOR-GO
```

`kubeadm reset` leaves behind: **external etcd data** (clean it with `etcdctl del "" --prefix` only if you mean to wipe that etcd), **`/etc/cni/net.d`** (a stale CNI config conflicts with a different CNI on reuse; back up then remove), **iptables/nftables/IPVS rules** from kube-proxy (clean with `kube-proxy --cleanup` in the kube-proxy image, or reboot into a fresh image), and **`$HOME/.kube/config`**, whose admin credentials stay valid while the cluster exists - delete it. A control-plane node being reset should have the apiserver shut down gracefully first if `--shutdown-delay-duration` is configured.

k3s: `k3s-uninstall.sh` deletes the local datastore and Local Storage PV data; delete the Node first so the node password secret goes away before a rejoin. Talos: `talosctl reset` semantics are in [talos-cluster.md](talos-cluster.md) (not verified here); wipe-by-label flags are shown in the disaster-recovery procedure.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| `kubectl delete node` instead of drain | Pods lost without graceful termination handling |
| `kubeadm reset` on a control-plane node with no replacement | Quorum shrinks; 2 of 3 left is one failure from outage |
| Re-using a reset host with a different CNI without cleaning `/etc/cni/net.d` | Config conflict |
| Rejoining with a stale token or expired certificate key | Join fails: create a new token / re-upload certs |
| Draining the node that holds the last healthy etcd member's workloads without PDB check | Self-inflicted outage |

## Verification

`kubectl get nodes -o wide` (expected set, versions, InternalIP), `kubectl -n kube-system get pods -o wide` (control-plane pods only on the expected nodes), etcd `member list`/`endpoint health` green, and the load balancer's target list matches.

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-reset/
- https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-token/
- https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/ (drain before minor kubelet upgrade)
- https://kubernetes.io/docs/tasks/debug/debug-cluster/ (NotReady eviction)
- https://docs.k3s.io/installation/uninstall , https://docs.k3s.io/datastore/ha-embedded

## Not verified

- That `kubectl delete node` does not stop the kubelet, that a running kubelet re-registers, and that pods bound to the node are garbage-collected: standard behaviour, not read in a kubectl page today.
- "Add first, remove second" for control-plane replacement is operational practice consistent with the etcd quorum rules, not a quoted procedure.
- `talosctl reset` defaults and Talos node removal from etcd.
