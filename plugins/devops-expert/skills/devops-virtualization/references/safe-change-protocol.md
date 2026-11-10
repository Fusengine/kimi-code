---
name: safe-change-protocol
description: How to work on a live hypervisor host - read-only discovery, dry run, one go, safety net, change, verify, rollback - and the catalogue of destructive libvirt, qemu-img, libguestfs, Incus, Packer and cloud-init commands with their exact effect
when-to-use: Before ANY write on a KVM, libvirt, Incus or image-build host, and whenever a destroy, undefine, delete, revert, in-place image edit or migration is on the table
keywords: virsh destroy, undefine, remove-all-storage, vol-delete, pool-delete, snapshot-revert, blockcommit, qemu-img resize shrink, incus delete force, lxd-to-incus, packer -force, cloud-init clean, go, rollback
priority: critical
related: libvirt-domains.md, libvirt-storage-networks.md, snapshots-migration.md, qemu-img-formats.md, incus-core.md
---

# Safe Change Protocol (virtualization hosts)

**Load when:** the agent is about to touch a real host. Same shape as the SSH discovery, dry run, one go, verify, rollback pipeline used in `hermes-deploy`; the Proxmox variant lives in `devops-proxmox`.

## Phase A - read-only discovery (writes nothing)

```bash
ssh <host> 'uname -r; lscpu | grep -E "Model name|Virtualization|NUMA node"; grep -c -E "vmx|svm" /proc/cpuinfo'
ssh <host> 'virsh -c qemu:///system version; virsh -c qemu:///system list --all'
ssh <host> 'virsh -c qemu:///system pool-list --all; virsh -c qemu:///system net-list --all'
ssh <host> 'virsh -c qemu:///system domblklist <dom> --details; virsh -c qemu:///system snapshot-list <dom> --tree'
ssh <host> 'qemu-img info --backing-chain <image>'
ssh <host> 'incus list; incus storage list; incus network list; incus profile list'   # Incus hosts
ssh <host> 'df -h; free -h; grep -i huge /proc/meminfo'
```
Stop and report instead of changing anything if: a pool is inactive, a disk path is missing, free space is below the planned growth, the guest holds a managed-save image or snapshots you did not expect, or you cannot name the owner of the guest.

## Phase B - dry run (local only)

Write the exact commands in order with: host, object (domain, volume, instance), expected effect, check, rollback. Show diffs for XML edits (`virsh dumpxml` before, `diff -u` after). Use previews where they exist: `virt-install --print-xml`/`--dry-run`, `virsh snapshot-create-as --print-xml`, `virt-customize -n`, `virt-sysprep -n`, `packer validate`, `cloud-init schema`, `qemu-img check` on a copy.

## Phase C - the owner's go

One go covers one checklist. Destructive commands are never run on the agent's own initiative: proposal format

```
ACTION   virsh -c qemu:///system undefine web01 --nvram
EFFECT   removes the definition of web01 and its UEFI varstore; disks stay on /srv/vm/images (no --remove-all-storage)
PROOF    web01 is shut off (domstate); no snapshots (snapshot-list); backup web01.qcow2 verified; owner of web01 named
WAIT-FOR-GO
```

## Phase D - safety net, then change

`virsh dumpxml <dom> > <dom>.before.xml`; copy or reflink the image; take a snapshot only on storage where it is not the sole copy; for Incus `incus snapshot create`. Network or storage changes on the management path: console access or a timed revert before applying.

## Phase E - verify, or roll back

Re-run the Phase A commands for the changed objects and compare. On failure stop; never stack a second fix on a broken step: restore the XML (`virsh define <dom>.before.xml`), the image copy, the snapshot, or the instance export.

## Destructive catalogue (propose, then the user's go)

| Command | Exact effect (official docs) | Precondition |
|---------|------------------------------|--------------|
| `virsh destroy <dom>` | **Hard power-off**, "the equivalent of ripping the power cord out"; deletes nothing; persistent guest can restart. Risk: unflushed data, filesystem repair | `shutdown` tried and waited; guest hung; owner informed |
| `virsh undefine <dom>` | Removes the definition (a running guest becomes transient); fails if NVRAM, snapshot metadata, checkpoints or a managed-save image exist unless the matching flag is given | Shut off; backup; each flag explained: `--nvram` deletes the varstore, `--snapshots-metadata`, `--checkpoints-metadata`, `--managed-save` delete those records |
| `virsh undefine <dom> --remove-all-storage` | Also **deletes every disk volume** libvirt manages for the domain (only the top image of a backing chain; backing stores kept); `--storage vda,/path` deletes chosen volumes; `--wipe-storage` overwrites first; `--delete-storage-volume-snapshots` (rbd only) | Volume list from `domblklist`; verified backup restored once; no other guest uses the volume |
| `virsh vol-delete <vol> --pool <p>` | Deletes the volume data | Not referenced by any domain (`grep` all XML for the path) or backing chain (`qemu-img info --backing-chain`) |
| `virsh vol-wipe`, `vol-resize --shrink` | Overwrites volume / truncates capacity | Data disposable / filesystem shrunk inside guest first |
| `virsh pool-delete <p>` | "Destroy the resources used by a given pool object. This operation is non-recoverable" | `vol-list` empty or all backed up |
| `virsh pool-destroy` / `net-destroy` | Stops the pool / network immediately (data kept); guests on it lose storage / connectivity | Guests listed and stopped or migrated |
| `virsh snapshot-revert <dom> <snap>` | Discards all changes since the snapshot; `--force` bypasses safety checks | Fresh copy of current state; reason the `--force` is needed is understood |
| `virsh snapshot-delete <dom> <snap>` | Deletes the snapshot and its data (`--metadata` only the record) | No child depends on it |
| `virsh blockcommit ... --pivot` | Merges the overlay into the base and switches the guest to it; irreversible | Backup of the base; chain read |
| `virsh migrate` (live) | Moves a running guest; with `--undefinesource` the source definition is removed; non-shared storage copies disks | Destination checked; canary migrated first |
| `qemu-img resize --shrink / commit / rebase -u / check -r / snapshot -a / amend` | In-place image changes, see the table in [qemu-img-formats.md](qemu-img-formats.md) | Copy of the image; guest off |
| `virt-customize`, `virt-sysprep` (no `-n`) | Modify the image in place; guest must be off | Copy; rehearsal with `-n` done |
| `incus delete [--force] <inst>` | Permanently deletes the instance and its snapshots; `--force` also removes a running one | Export/backup; `security.protection.delete` read |
| `incus snapshot restore`, `incus rebuild` | Discards later state / wipes the root disk | Snapshot of current state |
| `lxd-to-incus` | Converts the host's LXD to Incus | See [incus-profiles-lxd-migration.md](incus-profiles-lxd-migration.md) |
| `packer build -force` | Removes artifacts of a previous build (builder-dependent) | Previous artifact is not the only golden image |
| `cloud-init clean --logs --reboot` | Resets cloud-init state; may overwrite SSH keys/passwords | Lab clone only |
| `incus storage create <p> <driver> source=/dev/X`, `pool-build --overwrite` | May initialise the named device | `lsblk -f` shows it empty; device named in the go |

Sources: https://libvirt.org/manpages/virsh.html , https://www.qemu.org/docs/master/tools/qemu-img.html , https://libvirt.org/migration.html , https://linuxcontainers.org/incus/docs/main/howto/instances_manage/ , .../reference/manpages/incus/delete/ , https://libguestfs.org/virt-customize.1.html , https://developer.hashicorp.com/packer/docs/commands/build (read 2026-11-10).

## Report

Host and versions before/after; commands run with exit status; backup/snapshot identifiers; verification output; rollback command ready; anything not verified.

## Not verified

- Behaviour of these commands on distribution-patched libvirt/QEMU builds.
- The `--remove-all-storage` effect on volumes that are not libvirt-managed pool volumes (the man page says only pool volumes can be removed this way).
- That `grep` over `/etc/libvirt/qemu/*.xml` finds every user of a volume (transient guests and other hosts are not covered).
