---
name: guests-qm-pct
description: VM (qm) and container (pct) lifecycle on Proxmox VE - create, snapshot, clone, migrate, templates and cloud-init, OCI images, protection and destroy semantics
when-to-use: Creating, changing, cloning, snapshotting, migrating or deleting VMs and containers, or building cloud-init templates
keywords: qm, pct, pveam, cloud-init, cicustom, ipconfig0, sshkeys, template, linked clone, snapshot, rollback, destroy, purge, protection, OCI, unprivileged
priority: high
related: storage-model.md, api-access.md, safe-change-protocol.md
---

# Guests: `qm` (VMs) and `pct` (containers)

**Load when:** any VM/CT lifecycle task. Generic KVM/libvirt, Packer image builds and in-guest cloud-init authoring belong to skill `devops-virtualization`.

Sources: https://pve.proxmox.com/pve-docs/qm.1.html , https://pve.proxmox.com/pve-docs/pct.1.html (9.2.13).

## Read-only inventory first

```bash
qm list ; pct list
qm config <vmid> ; pct config <vmid>
qm listsnapshot <vmid> ; pct listsnapshot <vmid>
ha-manager status | grep -E "vm:<vmid>|ct:<vmid>"
grep -n "<vmid>" /etc/pve/jobs.cfg          # backup jobs naming the guest
```

## VM vs container

| Need | Choose |
|------|--------|
| Any OS, own kernel, live migration, PCI passthrough | VM (`qm`) |
| Linux system service, density, fast start | Unprivileged CT (`pct`, `--unprivileged` defaults to 1 on create) |
| Docker workloads | VM; running Docker directly on the PVE host is not recommended (https://pve.proxmox.com/wiki/FAQ) |
| Application from an OCI image | CT from OCI image: **technology preview** (since 9.1) |

Creating **privileged** containers requires `Sys.Modify` since 9.0; cgroup v1 support was dropped in 9.0 and raw cgroup v1 entries are deprecated in 9.2 (https://pve.proxmox.com/wiki/Roadmap). Templates: `pveam update`, `pveam available --section system`, `pveam download local <template>`; OCI images are uploaded or pulled from a registry in the storage's container template view, then `pct create`.

## Common operations

```bash
qm snapshot <vmid> pre-change --description "before X"   # --vmstate 1 to save RAM
qm rollback <vmid> pre-change                             # discards everything after the snapshot
qm clone <template-vmid> <newid> --name web01             # linked clone from a template by default
qm clone <vmid> <newid> --full 1 --storage <id>           # full copy
qm migrate <vmid> <node> --online 1                       # live; local disks need --targetstorage
qm set <vmid> --protection 1                              # blocks remove VM / remove disk
qm set <vmid> --onboot 1 --tags prod
pct snapshot <vmid> pre-change ; pct rollback <vmid> pre-change
pct set <vmid> --protection 1
```

`qm stop` is "akin to pulling the power plug" and may damage data: prefer `qm shutdown` (guest agent or ACPI). `--skiplock` (root only) bypasses locks; find out why a guest is locked before using it.

## Cloud-init templates

PVE renders cloud-init data into an ISO on a CD-ROM drive (`ideN: <storage>:cloudinit`). Format: `nocloud` for Linux, `configdrive2` for Windows (cloudbase-init). The documented flow, with a complete script, is in [templates/cloud-init-template.md](templates/cloud-init-template.md):

`qm create` -> `qm set --scsi0 <storage>:0,import-from=<image>` -> `qm set --ide2 <storage>:cloudinit` -> `--boot order=scsi0` -> `--serial0 socket --vga serial0` -> `qm template` -> `qm clone` -> `--sshkeys/--ipconfig0` -> start.

| Option | Meaning |
|--------|---------|
| `--ciuser`, `--sshkeys <file>`, `--cipassword` | User, keys (preferred), password (stored encrypted in the cloud-init data; discouraged) |
| `--ipconfig0 ip=10.0.10.123/24,gw=10.0.10.1` or `ip=dhcp` | Per-NIC addressing |
| `--nameserver`, `--searchdomain` | DNS |
| `--ciupgrade` (default 1) | Package upgrade on first boot |
| `--cicustom "user=local:snippets/user.yaml"` | Replace generated parts; the storage needs `snippets` content and must exist on every node the VM can migrate to |

`qm cloudinit dump <vmid> user|network|meta` shows the generated config; `qm cloudinit update <vmid>` regenerates the drive. Dumping the cloud-init password requires `VM.Config.Cloudinit` since 9.2.

## Destructive operations (propose, then the user's go)

| Command | Exact effect |
|---------|--------------|
| `qm destroy <vmid>` | Destroys the VM **and all used/owned volumes**; removes VM-specific permissions and firewall rules |
| `qm destroy <vmid> --purge 1` | Additionally removes the VMID from backup jobs, replication jobs and HA |
| `qm destroy <vmid> --destroy-unreferenced-disks 1` | Also destroys disks **not** in the config but carrying this VMID on any enabled storage |
| `pct destroy <vmid>` | Destroys the container and its volumes; ACLs and firewall entries are always removed |
| `pct destroy <vmid> --force 1` | Destroys even if running |
| `pct destroy <vmid> --purge 1` | Also removes it from backup, replication and HA config |
| `qm rollback` / `pct rollback` | Irreversibly discards state newer than the snapshot |

Gate before any destroy: (1) the VMID and name read back to the user, (2) a backup of that VMID verified restorable (see [backup-pbs.md](backup-pbs.md)), (3) HA, replication and backup-job references listed, (4) `protection` is 0 - if it is 1, someone set it on purpose: ask.

## Verification

`qm status <vmid> --verbose` / `pct status <vmid>`; for cloud-init clones, log in with the key and check `cloud-init status` inside the guest.

## Pitfalls

- Linked clones depend on the template's base disks: "You cannot delete an original template while linked clones exist" (qm.1). Linked clones cannot change target storage.
- Without `--purge`, a destroyed VMID stays in backup jobs and HA, which then error.
- Ubuntu cloud images need `--scsihw virtio-scsi-pci`; some images break with a serial display (revert to default VGA).
- The admin guide example uses `--sshkey`; the documented option name is `--sshkeys`.
