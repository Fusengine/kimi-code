---
name: cluster-quorum
description: Proxmox VE clustering with corosync - create, join, quorum math, QDevice, node removal, corosync.conf edits
when-to-use: Building or changing a PVE cluster, a 2-node setup, losing quorum, removing a node, or touching corosync
keywords: pvecm, corosync, knet, quorum, expected votes, QDevice, corosync-qnetd, delnode, token_coefficient, pmxcfs
priority: high
related: ha-crs.md, safe-change-protocol.md
---

# Cluster, Corosync and Quorum

**Load when:** creating/joining a cluster, designing the cluster network, running a 2-node cluster, a node is "not quorate", a node must leave, or `/etc/pve/corosync.conf` must change.

Source for this file unless noted: https://pve.proxmox.com/pve-docs/pvecm.1.html (docs build 9.2.13).

## Rules that decide the design

| Rule | Consequence |
|------|-------------|
| Each node has 1 vote; state changes need a majority | Losing quorum makes `/etc/pve` read-only: no guest start, no config change |
| HA needs at least 3 votes | 2 nodes = add a QDevice as third vote |
| QDevice is supported for **even** node counts | For odd counts it gives N-1 votes and becomes almost a single point of failure: discouraged |
| Corosync needs low, stable latency, not bandwidth | Dedicated NIC (1 Gbit is enough), plus a second link on a different physical network; up to 8 links (`link0`..`link7`) |
| Ports | UDP 5405-5412 between nodes, TCP 22 (SSH tunnel), synchronized time |
| Joining node | Its `/etc/pve` is overwritten and it must hold **no guests** (VMID conflicts) |

## Create and join

```bash
# first node
pvecm create <clustername> --link0 <corosync-ip> --link1 <second-net-ip>
# each joining node (authenticates against the API, verifies the SHA-256 fingerprint)
pvecm add <ip-of-existing-member> --link0 <local-corosync-ip> --link1 <local-second-ip>
pvecm status      # Quorate: Yes, Expected votes == Total votes
pvecm nodes
```

`--use_ssh` falls back to the legacy SSH join (needs root SSH on the existing node). Since 9.2, new clusters get `token_coefficient: 125` explicitly (default otherwise 650 ms).

## QDevice (2-node or even clusters)

```bash
# external host (any Debian-like box outside the cluster failure domain)
apt install corosync-qnetd
# every cluster node
apt install corosync-qdevice
# one cluster node, all nodes online, root key access to the external host
pvecm qdevice setup <QDEVICE-IP>
pvecm status      # Flags: Quorate Qdevice ; Qdevice column A,V,NMW
```

`NA` (not alive) = TCP 5403 to the qnetd host is blocked. Adding or removing a cluster node requires `pvecm qdevice remove` first, then re-setup once the count is even again.

## Destructive operations (propose, then the user's go)

| Command | Exact effect | Quorum / blast radius |
|---------|--------------|-----------------------|
| `pvecm delnode <node>` | "Removes a node from the cluster configuration" | Run from a remaining node **after** the node is powered off for good; if it boots again with its old config the cluster can break. Reinstall before any rejoin |
| `pvecm expected <n>` | "Tells corosync a new value of expected votes" | `pvecm expected 1` makes a lone node quorate: two partitions doing this = split brain. Only on a node that is provably the only one writing |
| editing `/etc/pve/corosync.conf` | Applied **as soon as the file changes** and propagated to all nodes | A bad save can drop membership cluster-wide |
| `pvecm qdevice remove` | Removes the external vote | A 2-node cluster loses its tie-breaker |

### Node removal sequence (documented)

1. Migrate all guests away; back up local data; remove the node from every replication job (otherwise the job becomes irremovable).
2. Remove the QDevice if configured. If the node runs Ceph: destroy its OSDs one by one and wait for `HEALTH_OK`, then MDS, monitor, manager, and `ceph osd crush remove <node>` (Ceph detail lives in skill `devops-storage-backup`).
3. Power the node off; it must not come back on this network with its current config.
4. From a remaining node: `pvecm delnode <node>`; the message `could not kill node (error = cs_err_not_exist)` is harmless.
5. Verify with `pvecm nodes`; clean `/etc/pve/nodes/<node>`, its key in `/etc/pve/priv/authorized_keys`, and HA rules that still name it.

## Editing corosync.conf safely

```bash
cp /etc/pve/corosync.conf /etc/pve/corosync.conf.new   # edit the copy, never the live file
# edit .new and INCREMENT config_version
cp /etc/pve/corosync.conf /etc/pve/corosync.conf.bak
mv /etc/pve/corosync.conf.new /etc/pve/corosync.conf
systemctl status corosync ; journalctl -b -u corosync
```

Membership changes go through `pvecm`, never by hand. If corosync cannot start any more, fix `/etc/corosync/corosync.conf` (local copy) identically on all nodes.

## Token timeout check (HA clusters)

```bash
corosync-cmapctl | grep -Ew 'runtime.config.totem.token|runtime.config.totem.consensus'
```

token + consensus should stay below 30 s, and must stay below 45 s with HA (watchdog fences at 60 s). Formula: `token = 3000 + (nodes - 2) * token_coefficient`, `consensus = 1.2 * token`. Lower `token_coefficient` in the `totem` section (with a `config_version` bump) when the sum is too high.

## Verification

`pvecm status` shows `Quorate: Yes`, the expected link count per node, and (if used) `Qdevice` in Flags. `journalctl -u corosync` shows no repeated link down/up flapping.

## Pitfalls

- A single corosync link over a bond: documented as problematic in some failure scenarios; prefer two independent links.
- Storage or backup traffic on the corosync link: latency spikes cause fencing with HA.
- Separating a node without reinstall (`pmxcfs -l`, deleting corosync files) is documented as "not recommended"; shared storage must be split first.
