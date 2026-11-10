# etcd Snapshot and Restore Runbook (kubeadm, stacked etcd)

Fill the variables, run Part A freely (read-only plus a snapshot), run Part B only after the user's go. Sources: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/ and https://etcd.io/docs/v3.6/op-guide/recovery/ . k3s and Talos have their own tools (k3s-cluster.md, talos-cluster.md).

```bash
export ETCDCTL_API=3
EP=https://127.0.0.1:2379
CA=/etc/kubernetes/pki/etcd/ca.crt ; CRT=/etc/kubernetes/pki/etcd/server.crt ; KEY=/etc/kubernetes/pki/etcd/server.key
E="sudo etcdctl --endpoints=$EP --cacert=$CA --cert=$CRT --key=$KEY"
SNAP=/var/backups/etcd/snap-$(date +%F-%H%M).db
```

## Part A - snapshot and verify (no go needed)

```bash
$E member list -w table
$E endpoint health --cluster
$E endpoint status --cluster -w table
sudo mkdir -p /var/backups/etcd && $E snapshot save "$SNAP"
sudo etcdutl --write-out=table snapshot status "$SNAP"        # record HASH / REVISION / TOTAL KEYS
sha256sum "$SNAP"                                             # record; copy off-node and encrypt the copy
```

Success = `snapshot status` prints a hash, the file is stored off the control-plane node, a second person can find it.

## Part B - restore (destructive)

Proposal block to present first:

```
ACTION   restore etcd on control-plane nodes <cp1 cp2 cp3> from <snapshot name, hash, revision, taken at>
EFFECT   API servers stop; each member's data directory is rebuilt as a NEW logical cluster; every change after <taken at> is lost;
         controllers re-sync; revisions may go backwards unless --bump-revision/--mark-compacted is used
QUORUM   3 members, quorum 2: the cluster is unavailable from API-server stop until 2 restored members run
PROOF    snapshot hash matches; current state snapshotted too (if etcd still answers); node list and etcd member names recorded
WAIT-FOR-GO
```

Steps after the go (rehearse on spare VMs first):

1. On every control-plane node, stop the API server: move `/etc/kubernetes/manifests/kube-apiserver.yaml` out of the directory (kubelet removes the static pod) and confirm `crictl ps` / process list shows it gone. Stop etcd the same way by moving `etcd.yaml`.
2. Copy the same snapshot to every node. On each node `<name>` is the etcd member name from the old manifest:

```bash
sudo etcdutl snapshot restore "$SNAP" \
  --name <name> \
  --data-dir /var/lib/etcd-restore \
  --initial-cluster <cp1>=https://<ip1>:2380,<cp2>=https://<ip2>:2380,<cp3>=https://<ip3>:2380 \
  --initial-cluster-token <new-token> \
  --initial-advertise-peer-urls https://<this-ip>:2380 \
  --bump-revision 1000000000 --mark-compacted
```

3. Edit the moved `etcd.yaml`: set the `etcd-data` hostPath to `/var/lib/etcd-restore`, and check that the manifest's cluster flags (`--initial-cluster-token`, `--initial-cluster`, `--name`) agree with the ones used at restore (exact manifest edits: see "Not verified"). On kubeadm set `etcd.local.dataDir` in the `kubeadm-config` ConfigMap to the new directory, or the next `kubeadm upgrade` writes the old path.
4. Move `etcd.yaml` back on all three nodes; wait for `member list` to show 3 started members; then move `kube-apiserver.yaml` back. Restart scheduler, controller-manager and kubelets if they hold stale state.
5. Verify: `$E endpoint health --cluster`, `kubectl get nodes`, `kubectl get pods -A`, application smoke tests (devops-kubernetes).

If etcd's client URLs changed, restart API servers with the new `--etcd-servers`.

## Not verified

- Steps 1, 3 and 4 combine two official pages and the static-pod mechanism (kubelet watches the manifest directory); no single official page lists the full stacked-kubeadm multi-node procedure. `crictl` usage and the exact flags etcd needs in the manifest after restore must be checked against your etcd version before a real restore.
- `--bump-revision` is documented in the etcd v3.6/v3.8 recovery pages; v3.7 not read.
