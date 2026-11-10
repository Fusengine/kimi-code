---
name: k3s-cluster
description: k3s clusters - HA with embedded etcd, config file, agent join, upgrades, etcd snapshots and restore, uninstall
when-to-use: Building or operating a k3s cluster (servers, agents, snapshots, restore, removal)
keywords: k3s, cluster-init, embedded etcd, config.yaml, etcd-snapshot, cluster-reset, flannel-backend, tls-san, k3s-uninstall.sh
priority: high
related: etcd-backup-restore.md, version-skew-upgrades.md, node-lifecycle.md, cni-cilium.md
---

# k3s Cluster

**Load when:** the cluster runs k3s (v1.37.2+k3s1 today). Template: [k3s-server-config.yaml](templates/k3s-server-config.yaml).

## HA with embedded etcd

- Three or more **server** nodes, an **odd** number. Quorum is n/2+1; adding a 4th server raises quorum without adding fault tolerance.
- Optional fixed registration address (VIP, load balancer or DNS) for agents; add it to every server's `tls-san`.

```bash
# first server
curl -sfL https://get.k3s.io | K3S_TOKEN=<secret> sh -s - server --cluster-init --tls-san=<FIXED_IP>
# servers 2 and 3
curl -sfL https://get.k3s.io | K3S_TOKEN=<secret> sh -s - server --server https://<server1>:6443 --tls-san=<FIXED_IP>
# agents
curl -sfL https://get.k3s.io | K3S_TOKEN=<secret> sh -s - agent --server https://<server>:6443
```

Prefer the config file `/etc/rancher/k3s/config.yaml` (drop-ins in `config.yaml.d/*.yaml`): the install script persists env vars and arguments into the service, and **re-running the script without them loses the original values**; the config file is not touched by the script. CLI arguments override the file.

**Flags that must be identical on every server**: `--cluster-dns`, `--cluster-domain`, `--cluster-cidr`, `--service-cidr`, `--disable-helm-controller`, `--disable-kube-proxy`, `--disable-network-policy`, anything passed to `--disable`, `--secrets-encryption`. A mismatch fails with `critical configuration value mismatch`. Flannel options are server-only and must match too.

A single-node SQLite cluster converts to etcd by restarting the server with `--cluster-init`. Embedded etcd on slow disks (SD cards) performs badly.

## Networking

Default CNI is Flannel (`vxlan`; `wireguard-native` encrypts). For Cilium: `flannel-backend: none` and `disable-network-policy: true`, install Cilium before agents are expected `Ready`, and add `disable-kube-proxy: true` for kube-proxy replacement ([cni-cilium.md](cni-cilium.md)). Dual-stack must be chosen at creation.

## Upgrades

Servers first, one at a time, then agents. The Kubernetes skew policy applies and the k3s docs state that the system-upgrade-controller does not protect against unsupported jumps, so never skip a minor ([version-skew-upgrades.md](version-skew-upgrades.md)).

```bash
kubectl drain <node> --ignore-daemonsets        # optional but advised: the script does not drain
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=v1.37.2+k3s1 <EXISTING_K3S_ENV> sh -s - <EXISTING_K3S_ARGS>
kubectl uncordon <node>
```

Channels: `stable` (default), `latest`, or one per minor (`INSTALL_K3S_CHANNEL`). `INSTALL_K3S_SKIP_START=true` downloads without restarting. Pods keep running while k3s restarts.

## Snapshots

Scheduled snapshots exist alongside on-demand ones; default retention is 5, applied per server node for local files and cluster-wide for S3. Confirm the schedule is active with `k3s etcd-snapshot ls`.

```bash
k3s etcd-snapshot save                  # on-demand, name prefix on-demand-<node>-<epoch>
k3s etcd-snapshot ls
k3s etcd-snapshot prune --snapshot-retention 5
kubectl get etcdsnapshotfile            # cluster-wide view of snapshots on all members
```

S3 flags (`--etcd-s3`, `--etcd-s3-endpoint`, `--etcd-s3-bucket`, `--etcd-s3-folder`, `--etcd-s3-retention`, ...) or a Secret of type `etcd.k3s.cattle.io/s3-config-secret` in `kube-system` (not usable during a restore: pass S3 flags on the CLI then). A snapshot contains the CA keys and all Secrets; whoever holds it plus the server token can extract encrypted data. Store it in a bucket with access control and server-side encryption.

## Restore (destructive - propose, then the user's go)

```
ACTION   systemctl stop k3s ; k3s server --cluster-reset --cluster-reset-restore-path=<snapshot>   (on ONE server)
EFFECT   current etcd files move to <data-dir>/server/db/etcd-old-<timestamp>/; the snapshot is extracted; every other etcd member is removed
         from the cluster; membership is reset to this single node; a reset-flag file blocks a second reset
QUORUM   cluster is a one-member etcd until the other servers rejoin; they must start with their old etcd database files removed
PROOF    fresh snapshot of the current state first; snapshot name, size and k3s version recorded; server token saved
WAIT-FOR-GO
```

After "Managed etcd cluster membership has been reset, restart without --cluster-reset flag now", run `systemctl start k3s`. A snapshot from an older k3s that you could not upgrade directly from must not be restored. Restoring to **new hosts** needs the original server token (`/var/lib/rancher/k3s/server/token`) passed with `--token`, and old Node objects must be deleted by hand afterwards.

## Removal

```
ACTION   /usr/local/bin/k3s-uninstall.sh   (server)    or    /usr/local/bin/k3s-agent-uninstall.sh   (agent)
EFFECT   stops K3s and all pods; deletes the local datastore, local-storage PV data, node config and the k3s binaries/scripts
QUORUM   a server uninstall removes one etcd member: state members before/after; never take a 3-server cluster below 2
PROOF    node drained and deleted from the cluster first (removes the node password secret needed for a clean rejoin); snapshot copied off-node
WAIT-FOR-GO
```

## Pitfalls

| Trap | Consequence |
|------|-------------|
| Re-running the install script with different/no arguments | Service args change silently |
| Server flags differ between servers | Join fails or components diverge |
| Snapshots only on the node's disk | Lost with the node; configure S3 or copy off-node |
| Rejoining a node with the same name without deleting the Node | Node password secret mismatch |

## Verification

`kubectl get nodes` shows the servers with roles `control-plane,etcd,master`; `k3s etcd-snapshot ls` shows fresh snapshots; a restore rehearsal on spare VMs succeeded.

## Sources (read 2026-11-10)

- https://docs.k3s.io/datastore/ha-embedded , https://docs.k3s.io/installation/configuration
- https://docs.k3s.io/cli/etcd-snapshot , https://docs.k3s.io/upgrades/manual
- https://docs.k3s.io/installation/uninstall , https://docs.k3s.io/networking/basic-network-options

## Not verified

- The "Multiple Servers" restore tab (page tabs did not render): the per-node steps for the other servers are inferred from the numbered restore description ("restart to rejoin after removing old database files"). Read the tab before executing a multi-server restore.
- The snapshot schedule flag names (the "Creating Snapshots" section was empty in the fetch).
- Certificate rotation for k3s.
