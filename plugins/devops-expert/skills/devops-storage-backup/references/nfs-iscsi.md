---
name: nfs-iscsi
description: NFS exports and mounts and iSCSI target/initiator basics, with the data-risk points
when-to-use: Sharing a file tree over NFS, exposing a LUN over iSCSI, or debugging a hung mount
keywords: nfs, exports, exportfs, sec=krb5, iscsi, lun, iqn, initiator, target, multipath, stale file handle
priority: medium
related: storage-selection.md, backup-strategy.md
---

# NFS and iSCSI Basics

**Load when:** a file tree must be shared between hosts, or a remote block device is attached.

## NFS server

`/etc/exports` holds one export per line: a path, then clients each followed immediately by a parenthesised, comma-separated option list (no whitespace between client and options). Apply edits with `exportfs -ra` or restart the NFS server. Clients can be a host, an IP network (`10.0.0.0/22`), a wildcard name, a netgroup or `*` (everyone).

```
# /etc/exports (example)
/srv/share  10.20.0.0/24(rw,sec=sys)  10.30.0.5(ro)
```

| Point | Rule |
|-------|------|
| Security flavour | `sec=` selects `sys` (default, no cryptographic security), `krb5`, `krb5i` (integrity) or `krb5p` (privacy); list preferred flavours first |
| Scope | Export to networks or hosts, never `*` on a routable network |
| Read-only | Backups mount exports `ro` |
| Boundaries | An export covers one local file system; plan one export per dataset |

## NFS client

Use a systemd automount or an `fstab` entry with explicit options (details in `devops-linux`). A hard mount blocks processes when the server disappears; a soft mount can return I/O errors that applications treat as corruption. Decide per workload and document it.

Read-only checks:

```bash
exportfs -v                  # what the server exports, with options
showmount -e SERVER          # exports visible from a client
findmnt -t nfs,nfs4          # active NFS mounts and options
```

## iSCSI model

| Term | Meaning |
|------|---------|
| Target | The storage side that exports LUNs |
| Initiator | The client that attaches them |
| IQN | Unique name of a target or initiator |
| LUN | A numbered block device behind a target |
| Multipath | Two or more network paths to the same LUN; required for redundancy |

Operating rules: dedicated storage VLAN or NICs, CHAP authentication at minimum, never attach the same LUN to two hosts without a cluster-aware file system, and put a file system on the LUN only from one host at a time. Initiator-side tooling is `iscsiadm` (open-iscsi) plus `multipath`; on Linux targets the kernel LIO stack is managed with `targetcli`.

## Data-risk table

| Action | Risk | Guard |
|--------|------|-------|
| Re-exporting a path with `rw` to a wider network | Unexpected writers | Review `exportfs -v` before and after |
| Formatting a LUN (`mkfs`, `wipefs`) | Destroys the data on the LUN | Treat as destructive: `wipefs` format in [backup-destructive-ops.md](backup-destructive-ops.md) |
| Detaching a LUN with a mounted file system | Lost writes, corruption | Unmount, then log out of the session |
| Deleting a target/LUN on the server | All data behind it gone | Verified backup and a go naming the IQN |

## Sources

- https://man7.org/linux/man-pages/man5/exports.5.html (read 2026-11-10, first part: file format, client formats, `exportfs -ra`, `sec=` flavours)

## Not verified

- The remainder of `exports(5)` (options such as `rw`, `ro`, `root_squash`, `no_subtree_check`, `sync`) was not read today beyond truncation; the example uses only `rw`, `ro`, `sec=`.
- `showmount`, `findmnt`, `iscsiadm`, `multipath`, `targetcli` and the iSCSI operating rules are standard tooling and practice, not checked against a manual page today.
- Hard versus soft mount behaviour: general knowledge, `nfs(5)` not read.
