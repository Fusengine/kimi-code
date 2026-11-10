---
name: console-vm-pfsense
description: OPNsense console and shell inspection, running it as a VM (Proxmox/KVM), and the pfSense difference
when-to-use: Working on the box console, sizing a VM, migrating from pfSense
keywords: console menu, pfctl, virtio, QEMU guest agent, offloading, Proxmox, pfSense
priority: medium
related: safe-opnsense-changes.md, troubleshooting-order.md
---

# Console, VM, pfSense

## Console and shell
- Boot loader menu (press Space during boot): option 8 = Boot Environments (snapshots.html). Console menu: option 12 = firmware upgrade (updates.html). Other option numbers: not verified.
- Read-only inspection verified in docs: `pfctl -s nat` (NAT/reflection rules), `/tmp/rules.debug` (generated ruleset). GUI equivalents: Firewall > Diagnostics (States, Sessions, Statistics).
- `configctl`, `pluginctl`, packet capture (Interfaces > Diagnostics) and log paths were not read today: do not state flags. Mutating `pfctl` commands (`-d`, `-F`) are lock-out class.

## Running as a VM (virtuals.html)
- Minimum 3 GB RAM, 8 GB disk recommended; disable all hardware offloading in Interfaces > Settings.
- KVM: install plugin `os-qemu-guest-agent` (tick "Show community plugins"); both i440FX and Q35 chipsets work. VMware: `os-vmware`, VMXNET3 NIC. Hyper-V: no extra tools, Secure Boot off.
- VM-level snapshots replace ZFS snapshots for recovery (snapshots.html).
- virtio NIC choice and Proxmox-specific settings (firewall flag, VLAN-aware bridge, CPU type): not read here. See `devops-proxmox`.
- CARP with a physical master and VM backup breaks state sync (different interface names): ha-carp.md.

## pfSense difference (short)
OPNsense is a separate FreeBSD-based project with a fixed fortnightly update schedule and its own plugin repository, MVC/API-driven GUI and its own config format. Migration: a pfSense `config.xml` is not restored as an OPNsense backup. Whether an official import tool exists: not verified (the docs how-to URL tried returned 404). Rebuild rules and NAT by hand or via the API/IaC, then compare behavior with the rule order in firewall-nat-interfaces.md.

## Not verified
- `configctl`, `pluginctl`, packet capture and log locations; Proxmox virtio specifics; pfSense import tooling.

## Sources
- https://docs.opnsense.org/manual/virtuals.html (2026-11-10)
- https://docs.opnsense.org/manual/snapshots.html (2026-11-10)
- https://docs.opnsense.org/manual/updates.html (2026-11-10)
- https://docs.opnsense.org/manual/firewall_settings.html (2026-11-10)
