---
name: storage-csi
description: PersistentVolumes, claims, StorageClasses, CSI expansion, snapshots and data-safety rules
when-to-use: Giving a workload persistent storage, resizing a volume, choosing access modes or reclaim policy
keywords: pv, pvc, storageclass, csi, reclaimPolicy, WaitForFirstConsumer, ReadWriteOncePod, volumesnapshot, volumeattributesclass
priority: high
related: workloads-scheduling.md, kubectl-safe-ops.md
---

# Storage: PV, PVC, StorageClass, CSI

**Load when:** a workload needs data that outlives its pods, a PVC is Pending, or a volume must grow.

## Model

- The app asks with a **PVC** (size, access mode, `storageClassName`).
- A **StorageClass** names a CSI provisioner and its parameters; dynamic provisioning creates the **PV**.
- StatefulSets create one PVC per ordinal from `volumeClaimTemplates`.
- Backend choice (Ceph RBD, NFS, local, ZFS, cloud disks) and backups are in devops-storage-backup; installing CSI drivers is cluster work (devops-k8s-cluster).

## Decision rules

| Question | Rule |
|----------|------|
| Reclaim policy | `Delete` (usual default) removes the backing volume with the PVC. Data that must survive a mistaken PVC delete → a StorageClass with `reclaimPolicy: Retain`. `Recycle` is deprecated |
| Binding mode | `volumeBindingMode: WaitForFirstConsumer` for topology-bound storage (zonal or local disks): the volume is created where the pod is scheduled |
| Access mode | `ReadWriteOnce` = one node; `ReadWriteOncePod` = one pod cluster-wide (stable since v1.29, CSI volumes only); `ReadWriteMany` only if the backend supports it (NFS, CephFS) |
| Growth | StorageClass `allowVolumeExpansion: true`; then raise `spec.resources.requests.storage` on the PVC. Shrinking is not supported |
| Default class | Exactly one class annotated `storageclass.kubernetes.io/is-default-class: "true"`; PVCs without a class get it, retroactively too (stable since v1.28) |
| Changing IOPS/throughput live | VolumeAttributesClass (`storage.k8s.io/v1`) if the CSI driver supports modification |

## Expansion (CSI, stable since v1.24)

```bash
kubectl --context "$CTX" -n "$NS" get sc "$(kubectl --context "$CTX" -n "$NS" get pvc data-db-0 -o jsonpath='{.spec.storageClassName}')" \
  -o jsonpath='{.allowVolumeExpansion}'
kubectl --context "$CTX" -n "$NS" get pvc data-db-0 -o yaml > pvc-before.yaml   # evidence
# edit spec.resources.requests.storage in Git, then diff + server dry-run + apply
kubectl --context "$CTX" -n "$NS" get pvc data-db-0 -w   # watch conditions until capacity changes
```

For a StatefulSet, resize each existing PVC directly; changing `volumeClaimTemplates` does not resize PVCs that already exist (and the API may reject the template change - see Not verified).

## Snapshots (stable since v1.20)

`VolumeSnapshot` / `VolumeSnapshotClass` in `snapshot.storage.k8s.io/v1` need the snapshot CRDs, the snapshot controller and a CSI driver that supports snapshots.
A snapshot on the same storage system is not a backup - copy off-system (devops-storage-backup).

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: data-db-0-pre-upgrade
  namespace: shop
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: data-db-0
```

Take one before any risky change to stateful data (schema migration, major upgrade, resize).

## Data-safety rules

1. Never delete a PVC, PV or namespace holding PVCs without: the list of affected PVCs, their reclaim policy, a verified backup, and the user's go ([kubectl-safe-ops.md](kubectl-safe-ops.md)).
2. Before deleting a StatefulSet, read `persistentVolumeClaimRetentionPolicy` - `whenDeleted: Delete` removes the data.
3. To keep a `Delete`-policy volume when its PVC must go: switch the PV's `persistentVolumeReclaimPolicy` to `Retain` first (a mutation - propose it).
4. `emptyDir` is scratch: it dies with the pod and is wiped by `kubectl drain --delete-emptydir-data`.

## PVC Pending - diagnosis

```bash
kubectl --context "$CTX" -n "$NS" describe pvc data-db-0     # Events: provisioning errors
kubectl --context "$CTX" get sc                              # class exists? default?
kubectl --context "$CTX" get csidrivers                      # driver registered?
```

| Event / state | Cause |
|---------------|-------|
| `waiting for first consumer to be created before binding` | Normal with `WaitForFirstConsumer` until a pod uses it |
| `storageclass ... not found` | Typo or class not installed |
| provisioning failed / quota | Backend full, quota, credentials of the CSI driver |
| Pod `Pending` with volume node affinity conflict | Zonal volume in a zone where the pod cannot run |

## Verification

```bash
kubectl --context "$CTX" -n "$NS" get pvc -o wide
kubectl --context "$CTX" get pv -o custom-columns=NAME:.metadata.name,CLAIM:.spec.claimRef.name,POLICY:.spec.persistentVolumeReclaimPolicy,STATUS:.status.phase
```

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- https://kubernetes.io/docs/concepts/storage/storage-classes/
- https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- https://kubernetes.io/docs/concepts/storage/volume-attributes-classes/

## Not verified

- VolumeAttributesClass GA version: the concept page banner says "Stable since v1.36", while the blog index lists "Kubernetes v1.34: VolumeAttributesClass for Volume Modification GA". The two disagree; check `kubectl api-resources | grep volumeattributesclasses` on the target cluster.
- Whether `volumeClaimTemplates` updates are allowed on 1.35-1.37 (the StatefulSet page read today says nothing about it; historically immutable).
- Exact PVC condition names shown during an online expansion (driver-dependent).
- The `csi-snapclass` name is a placeholder - read `kubectl get volumesnapshotclass`.
