---
name: safe-change-protocol
description: How to work on a live Proxmox VE node or cluster - read-only discovery over SSH, dry run, one go, backup/snapshot, change, verify, rollback; catalogue of destructive commands with their exact effect
when-to-use: Before ANY write on a real PVE host (config, guest, storage, network, cluster), and whenever a destructive or cluster-breaking command is on the table
keywords: discovery, pveversion, pvecm status, pvesm status, qm list, pct list, snapshot, vzdump, rollback, destroy, delnode, expected, corosync.conf, quorum, go
priority: critical
related: cluster-quorum.md, guests-qm-pct.md, storage-model.md, backup-pbs.md
---

# Safe Change Protocol on a Live Node

**Load when:** the agent is about to touch a real Proxmox VE host. Same shape as the SSH discovery, dry run, one go, verify, rollback pipeline used elsewhere in this marketplace (`hermes-deploy`).

## Phase A - read-only discovery (writes nothing)

```bash
ssh <host> 'pveversion; hostname -f; uptime'
ssh <host> 'pvecm status; pvecm nodes'                       # quorate? votes? qdevice?
ssh <host> 'ha-manager status'                               # HA armed? services and their nodes
ssh <host> 'pvesm status'                                    # storages active, free space
ssh <host> 'qm list; pct list'
ssh <host> 'cat /etc/pve/storage.cfg /etc/pve/jobs.cfg'      # storages, backup jobs
ssh <host> 'cat /etc/network/interfaces; ip -br addr'
ssh <host> 'pve-firewall status'
ssh <host> 'apt policy 2>/dev/null | grep -E "proxmox|debian" | sort -u'
ssh <host> 'ceph -s 2>/dev/null || true'                     # only on HCI nodes
```

Stop and report instead of changing anything if: the cluster is not quorate, HA shows a service in `fence`/`error`, a storage is inactive, `ceph -s` is not `HEALTH_OK` (unless the task is to fix exactly that), or the node is on an EOL major (PVE 8, see [install-repositories.md](install-repositories.md)).

## Phase B - dry run (local only)

Write the exact commands, in order, with for each: target node, VMIDs/storage IDs touched, expected effect, how to verify, how to roll back. Show diffs for file edits (`diff -u` of the staged copy vs the live file). Where PVE offers a preview, use it: `pve8to9`, `pve-firewall compile`, `/etc/network/interfaces.new` diff, `pvesh usage <path> -v` for API parameters, staged copy for `corosync.conf`.

## Phase C - the owner's go

One go covers one checklist. Anything added afterwards gets its own dry run. Destructive commands below are **never** executed on the agent's own initiative: they are proposed with their effect, and run only after the user's explicit go naming the object (VMID, node, storage ID).

## Phase D - safety net, then change

```bash
qm snapshot <vmid> pre-<change>          # guest-level change, snapshot-capable storage
vzdump <vmid> --storage <backup-storage> --mode snapshot --protected 1   # anything irreversible
cp -a /etc/pve/<file> /root/<file>.<date>.bak                            # cluster config edits
```

Network edits on the management path: keep a console (IPMI/iKVM) open, or schedule an automatic revert before applying (for example `at now + 5 minutes` restoring the previous interfaces file and running `ifreload -a`), and cancel it only after the new config is verified from a second session.

Apply in checklist order, one node at a time, recording each command and exit status.

## Phase E - verify, or roll back

Re-run the Phase A commands that relate to the change and compare. Any failed check: stop, never stack a second fix on a broken step.

| What broke | Return to the last green state |
|-----------|-------------------------------|
| Guest config/state | `qm rollback <vmid> pre-<change>` / `pct rollback` |
| Guest destroyed or disk lost | `qmrestore <archive> <new-vmid>` / `pct restore`, then swap |
| `/etc/network/interfaces` | restore the `.bak`, `ifreload -a` (console if the node is unreachable) |
| `corosync.conf` | `cp /etc/pve/corosync.conf.bak /etc/pve/corosync.conf` (bump `config_version`); if corosync is down, fix `/etc/corosync/corosync.conf` identically on all nodes |
| Firewall lockout | console: set `enable: 0` in the affected `.fw` file, or `pve-firewall stop` |
| Package upgrade | read the release's known issues; boot the previous kernel from the boot menu; do not downgrade blindly |

## Destructive and cluster-breaking commands

| Command | Exact effect (official docs) | Precondition before proposing |
|---------|------------------------------|-------------------------------|
| `qm destroy <vmid>` | Destroys the VM and all owned volumes, its ACLs and firewall rules; `--purge` also removes it from backup/replication/HA; `--destroy-unreferenced-disks` also deletes unlisted disks with that VMID | Verified backup, VMID+name confirmed, `protection` is 0 |
| `pct destroy <vmid>` | Destroys the CT and its volumes; `--force` even if running; `--purge` as above | Same |
| `pvecm delnode <node>` | Removes the node from the cluster configuration | Node powered off for good, guests moved, replication jobs removed, QDevice removed, Ceph services gone |
| `pvecm expected <n>` | Sets corosync expected votes | Only on an isolated node that is provably the sole writer; risk of split brain |
| `pvesm remove <id>` | Deletes the storage **configuration** only; no data deleted, nothing unmounted | List guests and jobs referencing `<id>` |
| `pvesm free <volid>` | Deletes the volume data | Volume confirmed unused, backup if unsure |
| `zfs destroy ...` | Destroys datasets/snapshots (`-r`/`-R` recursive) | Dry run `zfs destroy -nv` and procedure in `devops-storage-backup` |
| `pveceph osd destroy <id> [--cleanup]` | Removes the OSD; `--cleanup` zaps LVs/partitions | OSD `out`, rebalance finished, `ceph osd ok-to-stop <id>`, enough OSDs for pool `size`/`min_size` |
| editing `/etc/pve/corosync.conf` | Applied immediately on save, cluster-wide | Edit a copy, bump `config_version`, keep `.bak` |
| `ha-manager crm-command disarm-ha` | Releases all watchdogs: no fencing or recovery while disarmed | Maintenance window agreed; re-arm planned |

Sources: https://pve.proxmox.com/pve-docs/qm.1.html , pct.1.html , pvecm.1.html , pvesm.1.html , pveceph.1.html , ha-manager.1.html (9.2.13); https://openzfs.github.io/openzfs-docs/man/master/8/zfs-destroy.8.html (via `docs/research-devops-plugin.md`).

## Report

Host and versions before/after; commands run with exit status; snapshot/backup IDs; verification output per check; rollback command ready; anything not verified.

## Not verified

- The `at`-based automatic network revert is standard Debian practice, not a Proxmox-documented procedure.
