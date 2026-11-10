# Kubernetes Minor Upgrade Checklist

Copy per upgrade. Tick with evidence (command output pasted or file path). One minor at a time. Sources: https://kubernetes.io/releases/version-skew-policy/ , https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/ .

```
Cluster:            ____   Distribution: kubeadm | k3s | Talos      Date: ____   Window: ____
Current -> target:  v1.__.__ -> v1.__.__   (latest patch of target read at https://kubernetes.io/releases/)
```

## 1. Plan

- [ ] Target is exactly one minor above the oldest control-plane component (no skip)
- [ ] Current minor is on its latest patch (upgrade within the minor first if not)
- [ ] Release notes and deprecation/removal list of the target read; manifests using removed APIs found (`talosctl upgrade-k8s --dry-run` lists them on Talos)
- [ ] Skew table checked: kubelets <= apiserver and within three minors; kubectl within one minor; kube-proxy within three
- [ ] Admission webhooks and CRDs/operators support the new minor (vendor pages read)
- [ ] CNI (Cilium), LB (MetalLB/kube-vip), CSI and ingress/Gateway controller versions support the target; their upgrade order noted
- [ ] OS prerequisites: cgroup v2, swap off, kernel supported by Cilium (>= 5.10)
- [ ] Maintenance window announced; rollback = restore from snapshot (data loss window stated)

## 2. Backup

- [ ] etcd snapshot taken, `etcdutl snapshot status` output attached, copy stored off-node (templates/etcd-snapshot-restore.md)
- [ ] `/etc/kubernetes` (kubeadm) or machine configs / `secrets.yaml` (Talos) or k3s config + token backed up
- [ ] Application backups verified (devops-storage-backup)

## 3. Health gate (before touching anything)

- [ ] `kubectl get nodes` all Ready; `kubectl -n kube-system get pods` all Running
- [ ] `kubectl get --raw='/readyz?verbose'` all `[+]`
- [ ] etcd `endpoint health --cluster` green, one leader, DB size below quota
- [ ] `kubeadm certs check-expiration` (kubeadm) shows > 30 days
- [ ] PodDisruptionBudgets leave room to drain (`kubectl get pdb -A`)

## 4. Execute (one node at a time; stop on the first red check)

Control plane:
- [ ] Node 1: upgrade kubeadm package -> `kubeadm upgrade plan` -> `kubeadm upgrade apply v<target>` (k3s: install script with `INSTALL_K3S_VERSION`; Talos: `talosctl upgrade` per node then `upgrade-k8s`)
- [ ] CNI provider upgrade step done if it is not a DaemonSet-only chart
- [ ] Node 1: drain -> kubelet/kubectl packages -> restart kubelet -> uncordon -> Ready, etcd green
- [ ] Node 2 and 3: `kubeadm upgrade node`, then the same drain/kubelet/uncordon sequence, one at a time

Workers (one or a few at a time while capacity remains):
- [ ] drain -> upgrade -> restart kubelet -> uncordon -> Ready

## 5. Verify

- [ ] `kubectl get nodes` shows the target version on every node
- [ ] `kubectl -n kube-system get pods` healthy; CoreDNS rebalanced (`rollout restart deployment coredns` if all on one node)
- [ ] Cilium: `cilium-dbg status` OK, Services reachable; LoadBalancer IPs still announced
- [ ] Certificates renewed (`kubeadm certs check-expiration`)
- [ ] Workload smoke tests pass (devops-kubernetes); alerts quiet for one scrape/evaluation window
- [ ] `/etc/kubernetes/tmp/kubeadm-backup-*` reviewed and cleaned; packages re-held (`apt-mark hold`)
- [ ] Result recorded: versions, duration, anything unexpected (devops-sre-ops change log)
