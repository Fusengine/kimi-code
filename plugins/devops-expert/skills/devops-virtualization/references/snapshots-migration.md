---
name: snapshots-migration
description: libvirt snapshots (internal, external disk-only, quiesce), merging with blockcommit, managed save, and live migration with virsh migrate (shared vs non-shared storage, bridge requirement, persistent/undefinesource flags)
when-to-use: Taking a restore point before a change, reverting or deleting snapshots, or moving a running guest between two libvirt hosts
keywords: snapshot-create-as, snapshot-revert, snapshot-delete, disk-only, quiesce, atomic, blockcommit, pivot, managedsave, virsh migrate, live, copy-storage-all, persistent, undefinesource, p2p, tunnelled
priority: high
related: libvirt-domains.md, libvirt-storage-networks.md, qemu-img-formats.md, safe-change-protocol.md
---

# Snapshots and Live Migration (libvirt)

**Load when:** you need a rollback point or a host-to-host move. A snapshot on the same storage is not a backup: it dies with the disk. Backup design is `devops-storage-backup`.

## Snapshots

| Kind | Command | Properties |
|------|---------|------------|
| Disk-only, external | `virsh snapshot-create-as <dom> pre-change --disk-only --atomic --quiesce` | A new overlay file takes the writes; the original becomes a read-only base. `--quiesce` freezes filesystems via the guest agent and "snapshot creation will fail" without one; it requires `--disk-only` |
| Full system | `snapshot-create-as ... --memspec file=<f>,snapshot=external` or `--live` | Includes RAM; `--live` supported only for external full-system snapshots |
| Metadata-only | `--no-metadata` | Data created, libvirt forgets it: cannot revert via virsh |

```bash
virsh -c qemu:///system snapshot-create-as <dom> pre-change "before kernel upgrade" --disk-only --atomic --quiesce
virsh -c qemu:///system snapshot-list <dom> --tree
virsh -c qemu:///system snapshot-info <dom> pre-change
virsh -c qemu:///system domblklist <dom> --details     # sources now point at the overlay files
```

Preview the XML without creating: `--print-xml`. Control file names per disk: `--diskspec vda,snapshot=external,file=/srv/vm/snap/web01-pre.qcow2`; exclude a disk: `--diskspec vdb,snapshot=no`.

### Revert and delete (destructive)

- `snapshot-revert <dom> <snap>` - "a destructive action; any changes in the domain since the last snapshot was taken will be lost". Flags: `--running`/`--paused` (needed for disk snapshots of transient domains), `--force` (needed in the risky cases the man page lists - never add it to silence an error), `--reset-nvram`.
- `snapshot-delete <dom> <snap>` - deletes snapshot and its data contents; `--metadata` deletes only libvirt's record and leaves data for external tools; `--children`/`--children-only` act on descendants. Child snapshot changes are merged into children.
- Libvirt refuses to restore snapshots of inactive QEMU domains while a managed-save state exists, because it "will likely cause extensive filesystem corruption".

### Merge an external snapshot back (end the overlay chain)

```bash
virsh -c qemu:///system blockcommit <dom> vda --active --pivot --verbose --wait
virsh -c qemu:///system domblklist <dom> --details      # source is the base again
virsh -c qemu:///system snapshot-delete <dom> pre-change --metadata   # drop the stale record
```

`blockcommit` commits the top of the chain into the backing image; `--active` commits the active layer, `--pivot` switches the guest to the base afterwards (syntax: `blockcommit domain path ... [--active] [{--pivot | --keep-overlay}]`). Never `rm` an overlay that the guest or another overlay still uses.

## Managed save

`virsh managedsave <dom>` saves RAM and stops the guest; the next `virsh start` resumes from it. Forbidden combos: reverting snapshots while a managed-save image exists; `undefine` needs `--managed-save` to discard it.

## Live migration (https://libvirt.org/migration.html)

| Setup | Command | Requirement |
|-------|---------|-------------|
| Shared storage (same path on both hosts) | `virsh migrate --live --persistent --undefinesource <dom> qemu+ssh://dest/system` | Same storage visible on both hosts; compatible CPU (see below) |
| Non-shared storage | add `--copy-storage-all` (full copy) or `--copy-storage-inc` (shared base image) | "the disk images have to exist on destination host" - pre-create same-size files at the same paths; add `--migrate-disks vda` to limit |
| Offline (definition only) | `virsh migrate --offline --persistent <dom> qemu+ssh://dest/system` | Does not copy storage or NVRAM |
| Separate migration NIC | `virsh migrate <dom> qemu+ssh://dest/system tcp://10.0.0.2/` | 3rd argument is the hypervisor URI |

- `--persistent` keeps the guest defined on the destination; `--undefinesource` removes the definition on the source; `--suspend` leaves it paused on the destination.
- Encryption: native transport can use TLS (`--tls`); tunnelled (`--p2p --tunnelled`) is always encrypted but copies data twice and "may not be available" for non-shared disk, parallel or post-copy migration.
- Firewall: native migration may need a port range open on the destination; tunnelled needs one port.
- CPU: with `<cpu mode='host-passthrough'>` "migration ... is dangerous if the source and destination hosts are not identical in both hardware, QEMU version, microcode version and configuration" (formatdomain). Use `host-model` or a named model across a heterogeneous pool.
- The NIC must be on a host bridge or the same libvirt network on both hosts (virt-install man page: bridge "if live migration will be used").
- Large dirty-page rates: `--postcopy`, `--auto-converge`, `--parallel` exist; start with defaults and measure.

Canary procedure: migrate a test guest first; run `virsh domjobinfo <dom>` from another shell to watch progress; confirm with `virsh list` on both hosts.

## Verification

```bash
virsh -c qemu+ssh://dest/system list           # guest running on destination
virsh -c qemu:///system list --all             # source: gone (undefinesource) or shut off
virsh -c qemu+ssh://dest/system domifaddr <dom> --source agent
```

## Pitfalls

- Snapshots grow the overlay for as long as they exist; long chains slow I/O and complicate backups. Merge after the change is verified.
- External snapshots are not visible to hypervisor-agnostic tools that only look at the base file - a copy of the base is stale.
- A migration that fails midway can leave a paused copy on the destination; check `virsh list --all` on both ends before retrying.

## Sources

https://libvirt.org/manpages/virsh.html (snapshot-*, blockcommit, migrate, managedsave), https://libvirt.org/migration.html , https://libvirt.org/formatdomain.html (CPU mode notes) (read 2026-11-10).

## Not verified

- The exact flags a given distribution's libvirt/QEMU combination supports for external full-system snapshots and `--live`.
- `virsh domjobinfo` output format (command name taken from the virsh man page text, not run).
- Whether `blockcommit --active --pivot` is sufficient for multi-layer chains (the man page describes `base`/`top`; test on a copy).
