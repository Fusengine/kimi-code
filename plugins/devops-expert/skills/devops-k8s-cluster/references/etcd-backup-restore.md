---
name: etcd-backup-restore
description: etcd for Kubernetes - quorum arithmetic, health checks, snapshots, restore, replacing a failed member, defragmentation
when-to-use: Before any control-plane change, on a schedule for backups, and during quorum loss or etcd member failure
keywords: etcd, etcdctl, etcdutl, snapshot save, snapshot restore, member remove, member add, quorum, defrag, bump-revision, mark-compacted
priority: critical
related: kubeadm-ha-bootstrap.md, node-lifecycle.md, cluster-troubleshooting.md, k3s-cluster.md, talos-cluster.md
---

# etcd Backup and Restore

**Load when:** touching etcd, planning backups, or etcd is unhealthy. k3s and Talos have their own wrappers ([k3s-cluster.md](k3s-cluster.md), [talos-cluster.md](talos-cluster.md)); the raw `etcdctl`/`etcdutl` flow below is for kubeadm (stacked or external). Runbook template: [etcd-snapshot-restore.md](templates/etcd-snapshot-restore.md).

## Quorum arithmetic (state it before every member change)

Quorum = floor(n/2)+1. Tolerated failures = n - quorum.

| Members | Quorum | Can lose |
|---------|--------|----------|
| 1 | 1 | 0 |
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 4 | 3 | 1 (no better than 3) |

Kubernetes recommends an odd count, a static five-member cluster for production at any supported scale, never auto-scaling etcd; 3 to 5 is the only reasonable scaling step. Below quorum the cluster cannot change its state: scheduled pods may keep running but no new pod can be scheduled. Minimum etcd versions for production: 3.4.29+ and 3.5.11+.

## Tools

`etcdctl` talks to a running cluster (snapshot **save**, member list, health). `etcdutl` works on data files (snapshot **status**, snapshot **restore**, defrag offline). `etcdctl snapshot status/restore` are deprecated since 3.5 and removed from 3.6: use `etcdutl`.

## Health (read-only)

kubeadm stacked etcd serves TLS on the control-plane node; certificates live in `/etc/kubernetes/pki/etcd/`.

```bash
export ETCDCTL_API=3
EP=https://127.0.0.1:2379
CA=/etc/kubernetes/pki/etcd/ca.crt ; CRT=/etc/kubernetes/pki/etcd/server.crt ; KEY=/etc/kubernetes/pki/etcd/server.key
sudo etcdctl --endpoints=$EP --cacert=$CA --cert=$CRT --key=$KEY member list -w table
sudo etcdctl --endpoints=$EP --cacert=$CA --cert=$CRT --key=$KEY endpoint health --cluster
sudo etcdctl --endpoints=$EP --cacert=$CA --cert=$CRT --key=$KEY endpoint status --cluster -w table
```

Expect: all members `started`, one leader, equal raft index, DB size well under the quota (default 2 GiB, 8 GiB suggested maximum). Missing `etcdctl` on a kubeadm node: run it from the etcd image or install a release matching the server version.

## Backup

```bash
sudo etcdctl --endpoints=$EP --cacert=$CA --cert=$CRT --key=$KEY snapshot save /var/backups/etcd/snap-$(date +%F-%H%M).db
sudo etcdutl --write-out=table snapshot status /var/backups/etcd/snap-<stamp>.db      # HASH, REVISION, TOTAL KEYS, TOTAL SIZE
```

- Taking a snapshot from a live member does not hurt its performance. A snapshot copied from `member/snap/db` of a stopped member has no integrity hash and may miss data still in the WAL.
- The file holds every Secret and the cluster state: encrypt it, copy it **off the node and off the failure domain** (devops-storage-backup), keep several generations, schedule it (a CronJob on a control-plane node or a systemd timer).
- A backup counts only after a restore rehearsal on spare VMs; log the evidence.

## Restore (destructive - propose, then the user's go)

Official order: stop **all** API servers, restore state on all etcd members, restart API servers (and restart scheduler, controller-manager and kubelets so they drop stale state). Restoring under a running API server is unsupported.

```
ACTION   etcdutl snapshot restore snap.db --data-dir /var/lib/etcd-restore [--bump-revision 1000000000 --mark-compacted]
         (kubeadm stacked: run on EVERY control-plane node with a fresh --data-dir and the member-specific --name/--initial-* flags,
          then point the etcd static pod's `etcd-data` hostPath at the new directory and update etcd.local.dataDir in the kubeadm-config ConfigMap)
EFFECT   creates a NEW logical cluster from the snapshot: member and cluster IDs are overwritten so old members cannot join;
         all writes after the snapshot are lost; clients may see revisions go backwards
QUORUM   cluster is unavailable from the moment the API servers stop until a majority of restored members run
PROOF    snapshot hash/revision from `etcdutl snapshot status` recorded; current state snapshotted first if etcd still answers; list of API servers to stop
WAIT-FOR-GO
```

- **Revision bump**: for Kubernetes use `--bump-revision <N> --mark-compacted` so informer caches are invalidated (N must exceed the revisions written since the snapshot; the etcd docs suggest 1,000,000,000 for a week-old snapshot at under 1,500 writes/s). Documented in the etcd v3.6/v3.8 recovery pages; check the page for your etcd version.
- `--force-new-cluster` on `etcd` rewrites membership but is "strongly discouraged"; it panics if old members are alive.
- The exact stacked-kubeadm multi-node sequence (moving static pod manifests out of `/etc/kubernetes/manifests`, per-member `--initial-cluster` flags) is assembled from the two official pages; rehearse it first.
- After restore: `kubectl get nodes`, `kubectl get pods -A`, and compare object counts with what you expect; expect controllers to re-sync for a while.

## Replace a failed member

Replace failed members immediately and one by one. Sequence from the Kubernetes etcd page: get the member ID with `member list` from healthy endpoints; stop API servers pointing only at the broken member (or remove it from `--etcd-servers`); stop etcd on the broken node; `etcdctl member remove <id>`; `etcdctl member add <name> --peer-urls=https://<ip>:2380`; start the new member with `ETCD_INITIAL_CLUSTER_STATE=existing`.

```
ACTION   etcdctl member remove <member-id>
EFFECT   the member is dropped from the cluster permanently; quorum shrinks immediately (3 -> 2 members: zero failures tolerated)
QUORUM   state members and quorum before and after; never remove a healthy member of a 3-member cluster, never add a member before removing a dead one when quorum is already at risk
PROOF    member list output with the target ID matching the dead node; fresh snapshot stored off-node
WAIT-FOR-GO
```

On a kubeadm cluster prefer joining a replacement control-plane node (`kubeadm join --control-plane`) and removing the dead node ([node-lifecycle.md](node-lifecycle.md)); `kubeadm reset` removes the local stacked member of that node by itself.

## Maintenance

Defragmentation is expensive and blocks the member while it runs; do it rarely, one member at a time (the Kubernetes docs recommend a tool such as `etcd-defrag` and show a CronJob). `NOSPACE` alarms mean the quota was hit: defrag, then raise `quota-backend-bytes` only to match need. Before an etcd upgrade take a snapshot.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| 4 or 6 members | More cost, same tolerance |
| Backup only on the same disk/node | Lost together with the node |
| Restoring without stopping API servers | Unsupported; stale data stays cached |
| Skipping `--bump-revision` with live controllers | Controllers may see a time-warped history |
| etcd on shared slow disks or noisy VMs | Heartbeat timeouts, leader flapping, "no leader" and a frozen control plane |

## Verification

`endpoint health --cluster` all healthy; `snapshot status` of the newest backup prints a hash; restore rehearsal log exists; nodes `Ready` and workloads reconciled after a real restore.

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- https://etcd.io/docs/v3.6/op-guide/recovery/ , https://etcd.io/docs/v3.6/faq/
- Context7 `/websites/etcd_io` (v3.8 recovery page and cluster-status page for `--bump-revision`, `endpoint health/status`)
- https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-reset/

## Not verified

- The exact certificate files to use with `etcdctl` on every kubeadm version (the Kubernetes page example uses `server.crt/server.key`; `etcd-healthcheck-client` certificates also exist).
- Whether the v3.7.3 line changed restore flags (docs read were v3.6 and v3.8).
- The recommended `--bump-revision` value for your write rate: computed by you, not by a source.
