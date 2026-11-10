---
name: qemu-img-formats
description: Disk image formats (raw, qcow2, vmdk, vhdx) and qemu-img operations - info, create with backing file, convert, resize, check, commit, rebase, snapshot - with the exact effect of every in-place operation
when-to-use: Inspecting, converting, growing, repairing or flattening a VM disk image, or importing a disk from another hypervisor
keywords: qemu-img, qcow2, raw, vmdk, vhdx, convert, resize, shrink, backing chain, commit, rebase, check, repair, compress, sparse
priority: high
related: libvirt-storage-networks.md, snapshots-migration.md, virt-customize-builder.md, packer-images.md, safe-change-protocol.md
---

# Image Formats and `qemu-img`

**Load when:** any operation on a disk image file. Guests using the image must be shut off for every write operation here (writing an image a running QEMU has open corrupts it; read-only `info` can use `-U/--force-share`).

Reference: https://www.qemu.org/docs/master/tools/qemu-img.html (QEMU docs master, read 2026-11-10; QEMU 11.1.3 is the latest release).

## Format choice

| Format | Use | Notes (man page) |
|--------|-----|------------------|
| `raw` | Maximum simplicity/speed, block devices, LVM/ZFS volumes | "simple and easily exportable"; sparse on filesystems with holes; no snapshots/compression |
| `qcow2` | Default for file-based guests | "most versatile": backing files, internal snapshots, zlib or zstd compression, optional encryption; `compat=1.1` default features |
| `vmdk`, `vhdx`, `vdi` | Interchange with other hypervisors | Convert to qcow2/raw for KVM; keep the original until the guest boots |

## Read-only commands (no go)

```bash
qemu-img info disk.qcow2 --output=json              # format, virtual vs disk size, backing file
qemu-img info --backing-chain disk.qcow2            # every layer, base last
qemu-img check disk.qcow2                           # exit 0 consistent, 2 corrupted, 3 leaks only, 63 unsupported
qemu-img snapshot -l disk.qcow2                     # internal snapshots
```

## Create and convert

```bash
qemu-img create -f qcow2 disk.qcow2 20G
# Thin clone on a base image (backing format flag: check "qemu-img create --help" on the host, see Not verified)
qemu-img create -f qcow2 -b base.qcow2 -F qcow2 clone.qcow2
# Import from VMware, with progress; the source file is only read
qemu-img convert -p -f vmdk -O qcow2 vm.vmdk vm.qcow2
# Smaller qcow2 for distribution (read-only compression: rewritten sectors become uncompressed)
qemu-img convert -p -c -O qcow2 in.qcow2 out.qcow2
```

`convert` always writes a new file (the safe way to change format, sparsify or compact). The destination is created; do not point it at an existing image you care about. `-S SPARSE_SIZE` tunes zero detection (0 disables: fully allocated output).

## In-place operations: effect and gate

Every row below modifies the named file. Format: ACTION / EFFECT / PROOF / WAIT-FOR-GO.

| ACTION | EFFECT | PROOF before proposing |
|--------|--------|------------------------|
| `qemu-img resize disk.qcow2 +10G` | Virtual size grows; guest sees a bigger disk but its partitions/filesystems are unchanged (grow them inside the guest) | Guest off; `info` shows size; copy or snapshot exists |
| `qemu-img resize --shrink disk.qcow2 20G` | Truncates the virtual disk; "failure to [shrink the filesystem and partitions first] will result in data loss" | Filesystem + partition already shrunk inside the guest; full copy verified; `--shrink` is mandatory and means you accept the loss |
| `qemu-img commit disk.qcow2` | Writes the overlay's changes into its backing file, then empties the overlay; the base is modified irreversibly. `-b BASE` commits into a lower layer and invalidates everything between; `-d` skips emptying | `info --backing-chain`; backup of the base; no other overlay depends on that base |
| `qemu-img rebase -b NEW disk.qcow2` | Safe mode merges differing clusters into the image then switches the base (expensive, old base must exist). `-u` (unsafe) only edits the base name/format with no checks: "the guest-visible content ... will be corrupted" if wrong | Content of NEW equals OLD (compare with `qemu-img compare`); use `-u` only after moving a base file |
| `qemu-img check -r leaks\|all disk.qcow2` | Repairs; `-r all` "higher risk of choosing the wrong fix or hiding corruption" | Copy of the image first; run plain `check` before |
| `qemu-img snapshot -a TAG disk.qcow2` | Applies (reverts to) an internal snapshot, discarding later state | Copy; guest off. `-d TAG` deletes the snapshot |
| `qemu-img amend -o ... disk.qcow2` | Changes format options in place (needs `--force` for risky changes) | Copy first |

Always do the destructive in-place operation on a **copy** when the image is the only instance: `cp --reflink=auto disk.qcow2 disk.qcow2.bak` (or the storage layer's snapshot), then operate, then verify with `qemu-img check` and a guest boot.

## Verification

```bash
qemu-img check disk.qcow2 ; echo "exit=$?"       # 0 expected
qemu-img info --backing-chain disk.qcow2         # chain as intended, no missing base
virsh -c qemu:///system start <dom> && virsh -c qemu:///system domstate <dom>   # boots
```

## Pitfalls

- Moving or deleting a backing file breaks every overlay on it ("backing file not found"); fix with `rebase -u` only when you are sure it is the same content.
- Internal qcow2 snapshots and libvirt external snapshots are different mechanisms; mixing them confuses `virsh snapshot-*` (see [snapshots-migration.md](snapshots-migration.md)).
- `resize` on a qcow2 does not reduce its file size; compaction is `convert` to a new file.
- Converting a running guest's disk gives an inconsistent copy.

## Sources

https://www.qemu.org/docs/master/tools/qemu-img.html (commands info, check, create, convert, resize, commit, rebase, snapshot; image format notes) (read 2026-11-10).

## Not verified

- The backing-format flag letter: the page's synopsis lists `-F` for `create`, while another section of the same page shows `-B` for `create` and `rebase`; run `qemu-img create --help` on the target host before scripting.
- `cp --reflink=auto` availability (coreutils feature, depends on filesystem; not from the QEMU page).
- Support matrix for vhdx/vdi on the installed QEMU build (`qemu-img --help` lists formats).
