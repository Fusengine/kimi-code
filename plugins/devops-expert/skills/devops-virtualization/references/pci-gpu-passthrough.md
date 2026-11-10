---
name: pci-gpu-passthrough
description: PCI and GPU passthrough prerequisites on a KVM host - IOMMU enablement, IOMMU groups, binding to vfio-pci, libvirt hostdev with managed vs unmanaged, UEFI/q35 guests, and the host-lockout risks
when-to-use: Planning or debugging passthrough of a GPU, NIC, HBA or NVMe to a libvirt guest
keywords: IOMMU, VT-d, AMD-Vi, intel_iommu, amd_iommu, iommu=pt, vfio-pci, IOMMU group, ACS, hostdev, managed, nodedev-detach, nodedev-reattach, OVMF, q35, kvm hidden
priority: medium
related: kvm-performance.md, libvirt-domains.md, safe-change-protocol.md
---

# PCI / GPU Passthrough (KVM + VFIO)

**Load when:** a physical PCI device must belong to one guest. On Proxmox VE use its own PCI mapping tooling (`devops-proxmox`). Host kernel and boot-loader editing is shared with `devops-linux`.

## Prerequisites (check in this order, read-only)

1. **Firmware**: IOMMU enabled (Intel VT-d / AMD-Vi) in BIOS/UEFI. Not detectable from this skill's sources: check the platform manual.
2. **Kernel**: Intel: `intel_iommu=on` (documented values on/off/igfx_off/strict); AMD: `amd_iommu=` options exist; `iommu=pt` ("passthrough mode by default", equals `iommu.passthrough=1`) limits IOMMU translation to devices handed to guests (https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html). Boot-loader edit is a host change: dry run, reboot window, console access.
3. **IOMMU groups**: "a group is a set of devices which is isolatable from all other devices"; groups are VFIO's unit of ownership, so every device in a group goes to the same guest or stays unbound (https://www.kernel.org/doc/html/latest/driver-api/vfio.html). Without ACS on the bridge, devices may share a group; a PCIe-to-PCI bridge masks devices behind it.

```bash
dmesg | grep -i -e DMAR -e IOMMU                       # IOMMU initialised?
for g in /sys/kernel/iommu_groups/*; do echo "group ${g##*/}:"; ls "$g/devices"; done
lspci -nnk -s 0000:06:00.0                              # vendor:device ids, current kernel driver
readlink /sys/bus/pci/devices/0000:06:00.0/iommu_group  # the documented sysfs link
```

Stop and report if the target shares a group with the host's boot disk controller, management NIC or a bridge you cannot pass along. Do not suggest ACS-override kernel patches as a default: they weaken the isolation guarantee.

## Bind to VFIO

- **Via libvirt (recommended)**: set `managed='yes'` on the `<hostdev>`; libvirt detaches the device from the host driver at guest start and re-attaches it at exit. With `managed='no'` you run `virsh nodedev-detach <dev>` before start and `virsh nodedev-reattach <dev>` after stop. `virsh nodedev-list --cap pci` lists device names.
- **Manual (kernel doc example)**: `modprobe vfio-pci`, unbind from the host driver via `/sys/bus/pci/devices/<addr>/driver/unbind`, then `echo <vendor> <device> > /sys/bus/pci/drivers/vfio-pci/new_id`. Persisting a vfio-pci binding at boot (module options, initramfs) is distribution-specific: not verified here.

A GPU that is the only display adapter (or used by the console) disappears from the host the moment it is bound: do it from SSH with a second way in, never over a session that depends on that GPU.

## Libvirt XML

```xml
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x06' slot='0x00' function='0x0'/>
  </source>
</hostdev>
```

Pass every function of a multi-function device (a GPU's audio function is a separate address). Optional `<rom bar='on' file='...'/>`, `<boot order='1'/>`. A UEFI guest is the usual choice for modern GPUs: `virt-install --boot uefi` or `<os firmware='efi'>`; machine type `q35` is required for Secure Boot firmware (Packer QEMU docs, same constraint in QEMU). Hiding the hypervisor from a driver that refuses virtualisation: `virt-install --features kvm.hidden.state=on` exists (man page); whether a given vendor driver requires it is vendor policy, not verified.

## Verification

```bash
virsh -c qemu:///system dumpxml <dom> | grep -A4 hostdev
lspci -nnk -s 0000:06:00.0            # on the host while the guest runs: "Kernel driver in use: vfio-pci"
# inside the guest: lspci shows the device; install the vendor driver there
```
After guest stop with `managed='yes'`, the host driver is bound again (check `lspci -k`).

## Pitfalls

- A device that does not reset cleanly (some GPUs) can hang the host or leave the guest unable to restart: test stop/start cycles on a lab host first.
- Passing a device that is in a shared group without the others: libvirt/VFIO refuses; do not work around it.
- Live migration and snapshots with RAM state are not possible with a passed-through device (the device state is not migratable; general VFIO property, not re-verified here).
- Memory locking: hugepages/locked memory settings often accompany passthrough; see [kvm-performance.md](kvm-performance.md).

## Sources

https://www.kernel.org/doc/html/latest/driver-api/vfio.html , https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html , https://libvirt.org/formatdomain.html (hostdev, managed), https://libvirt.org/manpages/virsh.html (nodedev-detach), virt-install man source (read 2026-11-10).

## Not verified

- Firmware menu names, vendor-specific GPU quirks (reset bug, driver restrictions).
- Persistent vfio-pci binding on boot per distribution.
- Whether the specific device supports function-level reset.
- Migration impossibility with hostdev (stated from general knowledge).
