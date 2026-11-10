---
name: storage-model
description: The Proxmox VE storage model as seen from PVE - storage.cfg, plugin types, content types, volume IDs, LVM-thin, ZFS, Ceph RBD/CephFS, NFS, pvesm
when-to-use: Choosing or adding a storage, reading storage.cfg, explaining why a snapshot/migration/HA fails on a storage, or removing a storage
keywords: storage.cfg, pvesm, zfspool, lvmthin, rbd, cephfs, nfs, dir, pbs, content, shared, volid, snapshot-as-volume-chain
priority: high
related: backup-pbs.md, ha-crs.md, guests-qm-pct.md
---

# Storage Model (PVE side)

**Load when:** adding or choosing a storage, a feature (snapshot, clone, live migration, HA) fails on one, or a storage entry must change or be removed. ZFS pool design, Ceph cluster internals and PBS datastores belong to skill `devops-storage-backup`.

Source unless noted: https://pve.proxmox.com/pve-docs/pvesm.1.html and https://pve.proxmox.com/pve-docs/pve-admin-guide.html chapter 7 (9.2.13).

## One file, cluster-wide

All storage definitions live in `/etc/pve/storage.cfg`, replicated to every node. A local storage defined there exists on every node but holds different data on each; restrict it with `nodes`. `shared 1` only **declares** that an external mechanism shares the data, it shares nothing.

```text
dir: local
        path /var/lib/vz
        content iso,vztmpl,backup

lvmthin: local-lvm
        thinpool data
        vgname pve
        content rootdir,images

zfspool: local-zfs
        pool rpool/data
        sparse
        content images,rootdir
```

Content types: `images` (VM disks), `rootdir` (CT volumes), `vztmpl`, `iso`, `backup`, `snippets` (hookscripts, cloud-init custom files), `import` (OVA/disk images to import).

## Choosing a type

| Type (plugin) | Level | Shared | Snapshots | Pick it when |
|---------------|-------|--------|-----------|--------------|
| `zfspool` | file+block | no | yes | Local disks, integrity, replication between nodes |
| `lvmthin` | block | no | yes | Default local block store, thin provisioning |
| `lvm` | block | yes on a SAN LUN | volume chain (tech preview) | One big iSCSI/FC LUN shared by all nodes |
| `dir` | file | no | qcow2 | Simple local files |
| `nfs` / `cifs` | file | yes | qcow2 | Existing NAS; no container snapshots |
| `rbd` (Ceph) | block | yes | yes | Recommended shared storage for HA |
| `cephfs` | file | yes | yes | ISO/templates/backups shared across nodes |
| `pbs` | both | yes | n/a | Backups only - see [backup-pbs.md](backup-pbs.md) |
| `btrfs` | file | no | yes | Technology preview |

GlusterFS support was dropped in PVE 9.0 (https://pve.proxmox.com/wiki/Roadmap). Snapshots as volume chains (since 9.0) are a technology preview on LVM-thick, Directory, NFS and CIFS.

## Adding storages

```bash
pvesm scan nfs <server>
pvesm add nfs <id> --server 10.0.0.10 --export /space/iso --path /mnt/pve/<id> --content iso,vztmpl
pvesm add rbd <id> --monhost "10.1.1.20 10.1.1.21 10.1.1.22" --pool <pool> \
  --content images --username pve-rbd --keyring /root/rbd.keyring   # then delete /root/rbd.keyring
pvesm set <id> --nodes pve1,pve2
pvesm status
```

- External Ceph: use a dedicated cephx identity with minimal caps, never `client.admin`; the keyring is stored as `/etc/pve/priv/ceph/<id>.keyring`.
- NFS retries forever by default; `options vers=3,soft` is suggested for read-only content.
- A directory storage on a mount point needs `pvesm set <id> --is_mountpoint 1`, or PVE writes to the root filesystem when the mount is missing (https://pve.proxmox.com/wiki/Migrate_to_Proxmox_VE).

## Volumes and ownership

A volume ID is `<storage>:<name>`, for example `local-lvm:vm-100-disk-0`. Image volumes are owned by a VMID; **destroying the guest destroys every volume it owns**. `pvesm path <volid>` gives the host path; `pvesm list <id> --vmid <vmid>` lists a guest's volumes.

## Destructive operations (propose, then the user's go)

| Command | Exact effect |
|---------|--------------|
| `pvesm remove <id>` | Deletes the storage **configuration** only: "This does not delete any data, and does not disconnect or unmount anything". Guests referencing it can no longer start; backup jobs targeting it fail |
| `pvesm free <volid>` | Deletes the volume and its data |
| `pvesm set <id> --disable 1` | Reversible way to take a storage out of use; prefer it to `remove` |
| `zfs destroy` / Ceph OSD removal | Data destruction at the backend: dry-run and procedure in `devops-storage-backup` (OSD steps: `ceph osd out`, wait for rebalance, `ceph osd ok-to-stop`, `pveceph stop --service osd.<id>`, `pveceph osd destroy <id> [--cleanup]`, https://pve.proxmox.com/pve-docs/pveceph.1.html) |

Before any of them: `grep -n '<id>' /etc/pve/qemu-server/*.conf /etc/pve/lxc/*.conf /etc/pve/jobs.cfg` to list every guest and job that references the storage.

## Verification

`pvesm status` shows the storage `active` on every node it is assigned to; create and delete a test volume (`pvesm alloc <id> <test-vmid> '' 1G`, then `pvesm free`) on a non-production VMID.

## Pitfalls

- Two storage entries pointing at the same backing store (aliasing): two volids for one disk, data corruption risk.
- The same storage used by two PVE clusters: locking does not cross clusters (VMID clashes, corruption).
- Thin pools over-provisioned until full: every guest on it gets I/O errors.
- Internal qcow2 snapshots on large disks over NFS block the VM and can take hours.
