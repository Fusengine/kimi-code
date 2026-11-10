---
name: cluster-troubleshooting
description: Cluster-level troubleshooting in fixed order - NotReady nodes, kubelet, API server unreachable, etcd quorum loss, CNI failures, expired certificates
when-to-use: Nodes are NotReady, kubectl cannot reach the cluster, the control plane is flapping, or pods hang in ContainerCreating on several nodes
keywords: NotReady, kubelet, journalctl, readyz, etcd no leader, quorum lost, cni, NetworkUnavailable, certificate expired, static pod
priority: critical
related: etcd-backup-restore.md, cni-cilium.md, node-lifecycle.md, version-skew-upgrades.md, baremetal-loadbalancing.md
---

# Cluster Troubleshooting

**Load when:** the problem is the cluster, not one application (application-level debugging: devops-kubernetes `troubleshooting-playbook.md`). The order is fixed: **scope -> node agent -> control plane -> etcd -> network**. Every step is read-only until a fix is proposed; fixes that touch etcd, certificates or nodes follow the ACTION / EFFECT / QUORUM / PROOF / WAIT-FOR-GO blocks of the sibling files.

## Step 0 - scope the blast radius

```bash
kubectl get nodes -o wide                       # which nodes, which versions, which InternalIP
kubectl get --raw='/readyz?verbose'             # needs a reachable API; [+] ok / [-] failed checks (etcd, informers)
kubectl -n kube-system get pods -o wide
kubectl get events -A --sort-by=.lastTimestamp | tail -n 30
```

Cannot reach the API at all? Distinguish: endpoint/VIP/LB down (`nc -zv <endpoint> 6443`; test each control-plane IP directly), kubeconfig certificate expired, apiserver down, etcd down. Test `curl -k https://<cp-ip>:6443/livez?verbose` on a node: HTTP 200 = alive; the verbose output names failing checks.

## Step 1 - NotReady node

```bash
kubectl describe node <n>                       # Conditions: Ready, MemoryPressure, DiskPressure, PIDPressure, NetworkUnavailable; Taints; Events
kubectl get node <n> -o yaml
```

A node that stops posting status gets `Unknown` conditions and the `node.kubernetes.io/unreachable` taints; its pods are evicted after about five minutes. Then on the node (SSH; Talos: `talosctl -n <ip> service`, `dmesg`, `logs`):

```bash
systemctl status kubelet ; journalctl -xeu kubelet --no-pager | tail -n 100
```

Typical causes: kubelet stopped or crash-looping (swap on, cgroup v1 on Kubernetes 1.37, wrong container runtime socket), runtime not running, disk or memory pressure, clock skew, expired kubelet client certificate (see the kubeadm troubleshooting page, "Kubelet client certificate rotation fails"), lost network to the endpoint.

## Step 2 - control plane (kubeadm)

Control-plane components are static pods whose manifests are in `/etc/kubernetes/manifests/`; the kubelet runs them, so a broken kubelet means a broken control plane. Check logs through the container runtime or `journalctl`; on non-systemd setups the logs are `/var/log/kube-apiserver.log`, `kube-scheduler.log`, `kube-controller-manager.log`. Failure modes (official page): apiserver down -> no changes to pods/services, existing pods keep running; apiserver backing store lost -> it will not become healthy; scheduler/controller-manager down -> same consequences as the apiserver.

`kubeadm certs check-expiration` on every control-plane node: expired certificates make the apiserver or etcd refuse clients ([version-skew-upgrades.md](version-skew-upgrades.md)).

## Step 3 - etcd

```bash
etcdctl ... endpoint health --cluster ; etcdctl ... endpoint status --cluster -w table ; etcdctl ... member list -w table     # certs as in etcd-backup-restore.md
talosctl -n <cp1>,<cp2>,<cp3> etcd status ; talosctl -n <cp> service etcd                                                     # Talos
k3s etcd-snapshot ls ; journalctl -u k3s                                                                                      # k3s
```

| Symptom | Meaning | Next |
|---------|---------|------|
| One member down, 3-member cluster | Still has quorum (2/3); cluster works | Replace the member; snapshot now ([etcd-backup-restore.md](etcd-backup-restore.md)) |
| `no leader`, flapping leader, slow requests | Disk or network starvation causing heartbeat timeouts; resource contention on the node or the VM host | Fix the cause (dedicated fast disk, noisy neighbours); do not restart members in a loop |
| Majority of members permanently lost | Quorum lost: no state change possible | Restore from snapshot after the user's go |
| `NOSPACE` alarm | Quota (2 GiB default) hit; writes stop | Defragment, raise quota, disarm alarm ([talos-cluster.md](talos-cluster.md) shows the Talos commands) |
| Member joined but mismatched cluster ID | Stale data directory from another cluster | Treat as a new member: remove, wipe data dir, add |

If the majority is lost and a restore is the only way: stop, state members/quorum, find the latest snapshot and its hash, propose the restore block. Do not run `--force-new-cluster` as a first move.

## Step 4 - network (CNI)

Signs: nodes `NotReady` with the network plugin not ready, `NetworkUnavailable` condition, many pods `ContainerCreating` with sandbox/network errors, CoreDNS unreachable, Services unreachable but pods reachable.

```bash
kubectl -n kube-system get pods -l k8s-app=cilium -o wide ; kubectl -n kube-system logs ds/cilium --tail=100
kubectl -n kube-system exec ds/cilium -- cilium-dbg status
ls /etc/cni/net.d                              # one CNI config only; stale files from a previous CNI conflict
kubectl get nodes -o wide                      # InternalIP on the right interface
```

Common causes: no CNI installed after `kubeadm init` (expected `NotReady` until installed), kube-proxy removed before Cilium replaced it, wrong `k8sServiceHost/Port`, kernel too old, MTU or overlay port blocked between nodes (firewall), pod CIDR mismatch with `podSubnet`, two CNIs. For external traffic problems on bare metal see [baremetal-loadbalancing.md](baremetal-loadbalancing.md).

## Fix discipline

One change at a time; each change has a before/after read-only check; if a change makes it worse, roll back before stacking another (never the same fix twice). Restarting kubelet or a CNI agent on one node is low risk; touching etcd members, certificates or running `kubeadm reset` is not: propose with the blocks used in the sibling files.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Rebooting all control-plane nodes at once | Quorum lost until a majority is back |
| Deleting the Node object of a flapping node | Hides the symptom, loses events; fix kubelet first |
| Restoring etcd to "fix" a networking problem | Data loss for no reason |
| Treating `NotReady` after a fresh init as an error | It is expected until the CNI runs |
| Debugging pods before checking nodes and control plane | Wasted time |

## Verification

All nodes `Ready`, `/readyz?verbose` all `[+]`, etcd one leader and equal raft index, a new test Pod gets an IP and resolves a Service name, and the original symptom no longer occurs after a full reconcile interval.

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/tasks/debug/debug-cluster/
- https://kubernetes.io/docs/reference/using-api/health-checks/
- https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/ (`systemctl status kubelet`, `journalctl -xeu kubelet`)
- https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/ , https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/

## Not verified

- `crictl` usage for inspecting control-plane containers and the kubeadm troubleshooting page (linked from the certificates page, not read).
- Causes listed for kubelet failures (swap, cgroup v1, runtime socket) combine documented requirements with operational experience; confirm against the kubelet log.
- `curl -k https://<cp-ip>:6443/livez?verbose` works without credentials only when anonymous access to health endpoints is enabled (default RBAC); otherwise use credentials.
- "Mismatched cluster ID" handling is operational practice.
