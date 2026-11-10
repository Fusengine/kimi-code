---
name: upgrade-migration
description: Major upgrades of Proxmox VE (8 to 9 with pve8to9), minor 9.x updates, and migrating guests from another hypervisor (ESXi import, OVF, disk import)
when-to-use: Planning or running a PVE major/minor upgrade, a node still on PVE 8, or moving VMs from VMware ESXi / another hypervisor into PVE
keywords: pve8to9, dist-upgrade, Trixie, apt modernize-sources, Ceph Squid, HA rules, interface names, ESXi import, qm import, qm importovf, qm disk import, VirtIO
priority: high
related: install-repositories.md, cluster-quorum.md, ha-crs.md, safe-change-protocol.md
---

# Upgrades and Migration into PVE

**Load when:** a node runs PVE 8 (EOL 2026-08), a 9.x minor update is planned, or guests must move from ESXi/another hypervisor.

## Major upgrade 8 to 9 (in place)

Source: https://pve.proxmox.com/wiki/Upgrade_from_8_to_9

The checklist tool is **`pve8to9`** (shipped in the latest 8.4 packages). It only reports; it fixes nothing. Run `pve8to9 --full` at least once before, and re-run after every fix and after the upgrade.

Prerequisites (all mandatory):

1. Every node on the latest 8.4 (`pveversion` reports at least 8.4.1).
2. Hyper-converged Ceph already on **19.2 Squid** (`ceph --version`) - upgrade Quincy/Reef first.
3. Co-installed PBS: follow the PBS 3 to 4 guide.
4. Out-of-band access (IPMI/iKVM/physical). SSH only: test on an identical non-production box first, and run inside `tmux`/`screen`. Never via the GUI web console.
5. Healthy cluster, valid **tested** backups of all guests, at least 5 GB free on `/` (10 GB better).
6. Third-party storage plugins confirmed compatible with 9.

Sequence per node (one node at a time):

```bash
pve8to9 --full
# migrate guests that must keep running to another node (old -> new always works; new -> old unsupported)
apt update && apt dist-upgrade && pveversion          # latest 8.4
sed -i 's/bookworm/trixie/g' /etc/apt/sources.list
# add the PVE 9 repo as deb822 (pve-enterprise.sources or proxmox.sources), Ceph as ceph.sources (ceph-squid, trixie)
apt update && apt policy                              # only trixie entries, no errors; then delete old .list files
apt dist-upgrade                                      # config prompts: see table below
pve8to9 --full
reboot
```

| Config prompt | Documented choice |
|---------------|-------------------|
| `/etc/issue` | keep (No) |
| `/etc/lvm/lvm.conf` | maintainer's version if not customised |
| `/etc/ssh/sshd_config` | maintainer's version if not customised |
| `/etc/default/grub` | keep if unsure; review kernel cmdline changes |
| `/etc/chrony/chrony.conf` | maintainer's version; move local changes to `conf.d`/`sources.d` |

After the last node: HA groups migrate automatically to HA rules (check `journalctl -eu pve-ha-crm`); optional `apt modernize-sources`. Full checklist: [templates/pre-upgrade-checklist.md](templates/pre-upgrade-checklist.md).

Known issues to pre-empt (same page): NIC renaming with the new kernel (pin names first, see [networking-sdn.md](networking-sdn.md)); LVM/LVM-thin guest volumes with autoactivation (run `/usr/share/pve-manager/migrations/pve-lvm-disable-autoactivation` when `pve8to9` suggests it, strongly recommended on shared LVM); GRUB on LVM in UEFI mode; cgroup v1 removal (old container OSes); `systemd-sysctl` no longer reads `/etc/sysctl.conf`; `/tmp` becomes tmpfs; Ceph "insecure key types" `HEALTH_ERR` after the first MON node reboots (continue the upgrade, migrate keys afterwards); audit log flood (`systemctl disable --now systemd-journald-audit.socket` before upgrading).

Alternative: fresh 9.x install and restore from backups (back up `/etc/pve`, `/etc/network/interfaces`, `/etc/passwd`, `/etc/resolv.conf`, firewall files; restore `storage.cfg` first).

## Minor updates within 9.x

`apt update && apt dist-upgrade` on one node at a time, guests migrated or HA node maintenance enabled, then reboot for a new kernel. Read the target release's "Known Issues & Breaking Changes" on https://pve.proxmox.com/wiki/Roadmap first. 9.2 examples: Windows 11/2022/2025 VMs with `host` CPU and VBS on Intel may freeze - fixed by qemu-server 9.2.0 and machine version `11.0+pve2`; keep HA armed during the upgrade (disarm stall issue).

## Migration from another hypervisor

Source: https://pve.proxmox.com/wiki/Migrate_to_Proxmox_VE

| Method | Downtime | When |
|--------|----------|------|
| ESXi import wizard (ESXi import storage, then Import) | Source powered off; optional live-import | ESXi 6.5-8.0 tested; not vSAN-backed or encrypted disks |
| `qm importovf <vmid> <file>.ovf <storage>` | Full copy | OVF exported with VMware `ovftool` |
| `qm disk import <vmid> <file>.vmdk <storage>` | Full copy | Disk files reachable from the PVE node; disk lands as `unusedN` |
| Attach vmdk on shared NFS, then `qm disk move` | Minimal | Large disks, share visible to both sides |

Rules: remove the old hypervisor's guest tools before migrating; note network config and MAC/DHCP reservations; Windows boots from IDE/SATA first, then switch to VirtIO SCSI after installing drivers; match SeaBIOS vs OVMF to the source boot mode; vTPM state cannot be migrated from VMware (disable FDE keys in vTPM first). Mass imports: at most about four disks importing at once (ESXi API session limit, 8 x 128 MiB read-ahead cache per disk). Target best practice: CPU `host` only if all nodes are identical else `x86-64-v<X>`, VirtIO NIC, VirtIO SCSI single + `discard` + `iothread`, ballooning device, QEMU guest agent.

## Verification

After an upgrade: `pveversion` on every node, `pvecm status` quorate, `ha-manager status` OK, `ceph -s` (HCI), one test guest started and live-migrated. After an import: the guest boots, network up, agent responds (`qm guest cmd <vmid> ping`; `qm agent` is an alias, https://pve.proxmox.com/pve-docs/qm.1.html).

## Not verified

- The PVE 9 to 10 checklist tool name: no PVE 10 exists as of 2026-11-10; by analogy it would be `pve9to10`, but do not use any name until the official upgrade page exists.
- The Ceph key-migration procedure after the "insecure key types" warning: linked from the upgrade page, not read here (Ceph detail lives in `devops-storage-backup`).
