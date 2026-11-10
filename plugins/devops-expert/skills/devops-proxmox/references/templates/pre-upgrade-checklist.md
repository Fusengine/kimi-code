---
name: pre-upgrade-checklist
description: Copy-paste checklist for an in-place Proxmox VE 8.4 to 9.x major upgrade, per cluster and per node, with evidence to record
keywords: pve8to9, checklist, Ceph Squid, trixie, deb822, dist-upgrade, reboot, HA rules, interface pinning
---

# Template: PVE 8 to 9 Upgrade Checklist

## Usage

Fill one copy per cluster, then one "per node" block per node, in order. Every box needs evidence (command output pasted or a log path). Source: https://pve.proxmox.com/wiki/Upgrade_from_8_to_9 ; release notes https://pve.proxmox.com/wiki/Roadmap . PVE 8 reached EOL in 2026-08 (https://pve.proxmox.com/wiki/FAQ).

## Cluster-wide, before the first node

```text
[ ] Owner's go recorded for this window (date, nodes, rollback plan)
[ ] Known issues read: 9.0 known issues + current 9.x known issues (Roadmap)
[ ] Backups: every guest has a recent backup AND one restore per storage type tested
      evidence: job IDs, restore test VMIDs
[ ] Cluster healthy:            pvecm status            -> Quorate: Yes
[ ] HA healthy:                 ha-manager status       -> no error/fence state
[ ] Ceph (HCI) on 19.2 Squid:   ceph --version ; ceph -s -> HEALTH_OK
[ ] Co-installed PBS:           PBS 3 -> 4 guide planned
[ ] Third-party storage plugins / repos confirmed Trixie + PVE 9 compatible
[ ] Out-of-band console tested on every node (IPMI/iKVM); tmux available for SSH-only
[ ] Interface names pinned or naming-scheme fixed (pve-network-interface-pinning generate, reviewed)
[ ] Custom roles reviewed (VM.Monitor removed in 9.0; VM.Replicate added; Sys.Modify for privileged CTs)
[ ] Containers on old distros checked for cgroup v2 support (cgroup v1 removed in 9.0)
[ ] Backup jobs using "maxfiles" migrated to prune-backups (maxfiles dropped in 9.0)
[ ] Third-party backup tools checked (Veeam issue with QEMU machine >= 10.0)
```

## Per node (repeat; one node at a time)

```text
Node: ______   Start: ______

[ ] pve8to9 --full                     -> no FAIL left (WARNs understood)       log: ______
[ ] Guests that must stay up migrated away (old -> new only), or HA:
      ha-manager crm-command node-maintenance enable <node>
[ ] apt update && apt dist-upgrade ; pveversion   -> >= 8.4.1
[ ] free space on /                    df -h /     -> >= 5 GB (10 GB preferred)
[ ] Optional: systemctl disable --now systemd-journald-audit.socket   (avoid audit log flood)
[ ] Plain-Debian installs only: apt remove linux-image-amd64
[ ] Debian repos -> trixie:            sed -i 's/bookworm/trixie/g' /etc/apt/sources.list
[ ] PVE 9 repo added (deb822):         /etc/apt/sources.list.d/pve-enterprise.sources
                                       or /etc/apt/sources.list.d/proxmox.sources
[ ] Ceph repo (HCI):                   /etc/apt/sources.list.d/ceph.sources (ceph-squid, trixie)
[ ] Old .list files for PVE/Ceph removed after: apt update && apt policy  -> only trixie entries
[ ] No backports entries
[ ] apt dist-upgrade                   -> exit 0 ; config prompts answered per wiki table
[ ] pve8to9 --full                     -> re-run, clean
[ ] LVM autoactivation migration run if pve8to9 asks:
      /usr/share/pve-manager/migrations/pve-lvm-disable-autoactivation
[ ] reboot (mandatory, even if the 6.14 opt-in kernel was used on 8)
[ ] After boot: pveversion -> 9.x ; ip -br addr -> management IP up ; pvecm status quorate
[ ] Ceph (HCI): ceph -s ; "insecure key types" HEALTH_ERR may appear after a MON node reboot -> continue, migrate keys after all nodes are on 9
[ ] HA maintenance disabled:          ha-manager crm-command node-maintenance disable <node>
[ ] Browser cache cleared / force reload for the GUI
End: ______   Evidence path: ______
```

## After the last node

```text
[ ] All nodes on the same 9.x package level (pveversion on each)
[ ] HA groups migrated to HA rules:   ha-manager rules list ; journalctl -eu pve-ha-crm
[ ] Optional: apt modernize-sources (answer n first to preview; .list.bak files kept)
[ ] Live migration test between two upgraded nodes
[ ] Backup job ran OK on the new version
[ ] Report: versions before/after, issues met, evidence paths, rollback not needed / used
```

## Rollback

There is no package-level downgrade path documented from 9 to 8. The recovery path for a broken node is the documented "new installation" route: reinstall from the current 9.x ISO (PVE 8 is EOL), rejoin or rebuild the cluster, restore `storage.cfg`, then restore guests from the backups verified in the cluster-wide block. This is why the restore test is mandatory before starting.

## Not verified

- A documented 9 to 8 downgrade: none found on the upgrade page; treat the upgrade as one-way.
