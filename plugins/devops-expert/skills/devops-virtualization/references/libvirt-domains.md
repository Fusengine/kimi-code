---
name: libvirt-domains
description: libvirt on KVM/QEMU - connection URIs and daemons, domain lifecycle with virsh, creating guests with virt-install, domain XML essentials, and what virsh destroy and undefine really do
when-to-use: Creating, inspecting, starting, stopping, editing or deleting a libvirt guest on a plain KVM host
keywords: libvirt, virsh, virt-install, domain XML, qemu:///system, virtqemud, libvirtd, define, undefine, destroy, shutdown, dumpxml, osinfo, import
priority: high
related: libvirt-storage-networks.md, kvm-performance.md, safe-change-protocol.md, cloud-init-nocloud.md
---

# libvirt Domains (guests): `virsh` and `virt-install`

**Load when:** any guest lifecycle task on a KVM host managed by libvirt. Proxmox VE hosts use `qm`/`pct` (skill `devops-proxmox`), not this file.

Versions verified 2026-11-10: libvirt 12.9.0 (released 2026-11-02, https://libvirt.org/news.html), QEMU 11.1.3 (2026-10-28, https://www.qemu.org/download/).

## Connection and daemons

| Item | Fact (source) |
|------|---------------|
| System mode | `qemu:///system` - daemon runs as root, full functionality; a read-write connection is "equivalent to having a root shell" (https://libvirt.org/daemons.html) |
| Session mode | `qemu:///session` - per-user daemon, restricted functionality (https://libvirt.org/uri.html) |
| Remote | `qemu+ssh://root@host/system` (https://libvirt.org/migration.html examples) |
| Daemons | Monolithic `libvirtd` or modular `virt${DRIVER}d` plus `virtproxyd`; both are built, the docs state the monolithic one will be deleted one to two years after the RPC client switches to prefer modular (https://libvirt.org/daemons.html). Check which mode a host runs in the section "Checking whether modular/monolithic mode is in use" of that page |

Always pass the URI explicitly in scripts: `virsh -c qemu:///system list --all`. Without `-c`, a non-root user may land on `qemu:///session` and see an empty inventory.

## Read-only inventory (no go needed)

```bash
virsh -c qemu:///system version ; virsh -c qemu:///system nodeinfo
virsh -c qemu:///system list --all
virsh -c qemu:///system dominfo <dom> ; virsh -c qemu:///system domstate <dom> --reason
virsh -c qemu:///system dumpxml <dom>                  # live XML; add --inactive for the next-boot XML
virsh -c qemu:///system domblklist <dom> --details     # disks, types, sources
virsh -c qemu:///system domiflist <dom>
virsh -c qemu:///system domifaddr <dom> --source agent # IPs; "agent" needs qemu-guest-agent in the guest
virsh -c qemu:///system domstats <dom> --block --cpu-total
virsh -c qemu:///system domcapabilities                # what this host's QEMU can do
```

## Lifecycle

| Goal | Command | Notes |
|------|---------|-------|
| Register a guest (persistent) | `virsh define guest.xml` | Inactive until started; `--validate` is not listed for `define` in the page read - not used here |
| Boot | `virsh start <dom>` | |
| Start at host boot | `virsh autostart <dom>` (`--disable` to undo) | |
| Clean stop | `virsh shutdown <dom> [--mode acpi,agent]` | Coordinates with the guest OS; no guarantee it succeeds |
| Hard power-off | `virsh destroy <dom>` | See below |
| Reboot / hard reset | `virsh reboot <dom>` / `virsh reset <dom>` | |
| Edit definition | `virsh edit <dom>` | Edits the persistent definition; a running guest usually picks changes up at its next start (see Not verified) |
| Save RAM and stop | `virsh managedsave <dom>` | Next `virsh start` resumes from the saved state |
| Rename | `virsh domrename <dom> <new>` | Guest must be inactive |

### `virsh destroy` is a hard power-off, not a deletion

The man page: "the equivalent of ripping the power cord out on a physical machine"; it "does not delete any storage volumes used by the guest, and if the domain is persistent, it can be restarted later" (https://libvirt.org/manpages/virsh.html). Effect: guest OS gets no chance to flush; filesystems can need a repair; the definition and disks stay. Prefer `shutdown`, wait, then `destroy` only if the guest is hung. `--graceful` makes it fail instead of SIGKILL.

## Creating a guest with `virt-install`

Verified options (virt-install man source, https://github.com/virt-manager/virt-manager/blob/main/man/virt-install.rst): `--import` (skip install, boot the first `--disk`), `--osinfo`/`--os-variant`, `--disk path=,size=,backing_store=,backing_format=,format=,bus=,cache=,driver.discard=,driver.io=`, `--network bridge=BR` or `network=NAME`, `--cpu`, `--memorybacking`, `--iothreads`, `--boot uefi`, `--cloud-init`, `--print-xml`, `--dry-run`, `--noautoconsole`, `--check`.

```bash
# Preview only: prints the XML, defines nothing (add --dry-run to also skip storage creation)
virt-install --connect qemu:///system --name web01 --memory 2048 --vcpus 2 \
  --import --disk path=/var/lib/libvirt/images/web01.qcow2,bus=virtio \
  --network bridge=br0,model=virtio --osinfo <short-id> --noautoconsole --print-xml
```

- `--osinfo detect=on` only works for URL/CDROM installs (man page); for `--import` give an explicit short id (the man page points to `osinfo-query os` for the list), otherwise the guest may not get virtio devices.
- Preview first: `--print-xml` outputs the XML without defining (it still creates storage unless `--dry-run`); `--dry-run` creates nothing.
- Use a bridge (`--network bridge=br0`) when the guest must be reachable on the LAN or live-migrated; use `network=default` (NAT) for isolated labs (the man page states exactly this).
- Full cloud-image command: [templates/virt-install-cloud-image.md](templates/virt-install-cloud-image.md).

## Domain XML essentials (https://libvirt.org/formatdomain.html)

`<domain type='kvm'>` with `<name>`, `<memory>`, `<vcpu>`, `<os>` (UEFI via `firmware='efi'` attribute or `virt-install --boot uefi`), `<cpu>`, `<devices>` (`<disk>`, `<interface>`, `<controller>`, `<channel>`, `<memballoon model='virtio'/>`). Tuning elements are in [kvm-performance.md](kvm-performance.md); passthrough in [pci-gpu-passthrough.md](pci-gpu-passthrough.md).

## Destructive operations (propose, then the user's go)

See [safe-change-protocol.md](safe-change-protocol.md): `destroy`, `undefine` (+ `--remove-all-storage`, `--nvram`, `--snapshots-metadata`, `--managed-save`), `snapshot-revert`, `snapshot-delete`, `vol-delete`, `pool-delete`, `blockresize` shrink.

## Verification

```bash
virsh -c qemu:///system domstate <dom>               # running
virsh -c qemu:///system domifaddr <dom> --source agent
virsh -c qemu:///system dumpxml <dom> | grep -E "model type|driver name|bus="   # virtio in use
```

## Pitfalls

- `undefine` on a guest with NVRAM, snapshots metadata or a managed-save image fails unless the matching flag is given (man page) - the failure is protective, do not just add flags.
- Editing `/etc/libvirt/qemu/*.xml` by hand is not picked up reliably; use `virsh edit`/`define`.
- A guest created with `virt-install --import` on a cloud image has a locked login until cloud-init data is attached (see cloud-init-nocloud.md).

## Sources

https://libvirt.org/manpages/virsh.html , https://libvirt.org/formatdomain.html , https://libvirt.org/daemons.html , https://libvirt.org/uri.html , https://libvirt.org/news.html , virt-install man source (URL above), https://www.qemu.org/download/ (all read 2026-11-10).

## Not verified

- Which package and group names grant non-root access (`libvirt` group) per distribution.
- The exact `virt-install --osinfo` short id for a given cloud image (`osinfo-query os` was not run).
- That "virsh edit on a running guest only takes effect at the next boot" holds for every element (general libvirt behaviour; the page read does not state it per element).
- Whether `virsh define --validate` exists (only `net-define --validate` was read).
