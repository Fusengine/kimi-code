---
name: talos-cluster
description: Talos Linux clusters - production bootstrap, machine config patches, OS and Kubernetes upgrades, etcd operations and disaster recovery with talosctl
when-to-use: Building or operating a cluster on Talos Linux (no SSH, API-managed nodes)
keywords: talos, talosctl, gen config, apply-config, bootstrap, upgrade-k8s, etcd snapshot, recover-from, machine config, kubeprism
priority: high
related: etcd-backup-restore.md, cni-cilium.md, version-skew-upgrades.md, node-lifecycle.md
---

# Talos Cluster

**Load when:** nodes run Talos (v1.14.5 docs: https://docs.siderolabs.com/talos/v1.14/). There is no SSH: `talosctl` is the only interface, so every command carries `--nodes <ip>` (and `--endpoints` from your `talosconfig`). Patch template: [talos-patches.yaml](templates/talos-patches.yaml).

## Production bootstrap (order matters)

1. Boot three control-plane ISOs (Image Factory https://factory.talos.dev/) and the workers. A node without config is in **maintenance mode**, whose API is unauthenticated by design: anyone who can reach it can apply a config. Keep that network closed or apply config at boot.
2. Kubernetes endpoint = a TCP load balancer on `:6443` or several A/AAAA records, one per control-plane node. It cannot be an HTTP load balancer. If nodes are not directly reachable, TCP port 50000 (Talos API, gRPC + mutual TLS) must be forwarded by a TCP load balancer.
3. Secrets and configs:

```bash
talosctl gen secrets -o secrets.yaml                                   # keep out of Git; it holds every key
talosctl gen config --with-secrets secrets.yaml <cluster> https://<endpoint>:6443
#  -> controlplane.yaml, worker.yaml, talosconfig
talosctl machineconfig patch controlplane.yaml --patch controlplane-patch-1.yaml --output controlplane.yaml
```

   `talosctl` version should match the Talos version on the nodes; otherwise pass `--talos-version v1.14` and check the support matrix for the Kubernetes version.
4. `talosctl get disks --insecure --nodes <ip>` and `talosctl get links --insecure --nodes <ip>` to choose the install disk (prefer `disk.serial`/`disk.wwid` to `/dev/sdX`) and the interface.
5. Apply: `talosctl apply-config --insecure --nodes <ip> --file controlplane.yaml` for each control-plane node, `worker.yaml` for workers.
6. `talosctl config merge ./talosconfig` ; `talosctl config endpoint <cp1> <cp2> <cp3>`.
7. **Bootstrap once, on one node**: `talosctl bootstrap --nodes <cp1>`. The official guide's warning: run it ONCE on a SINGLE control-plane node.
8. `talosctl kubeconfig --nodes <cp1>` then `kubectl get nodes`.

With Cilium: set CNI to none (and disable kube-proxy) in the patch **before** bootstrap; the node then waits at "node not ready" until a CNI runs, and you have about ten minutes to install it ([cni-cilium.md](cni-cilium.md)). KubePrism (port 7445) is the in-node endpoint Cilium uses (`k8sServiceHost: localhost`, `k8sServicePort: 7445`).

## Configuration discipline

Talos 1.14 splits the monolithic `v1alpha1` config into small documents (`KubeAPIServerConfig`, `KubeProxyConfig`, `KubeFlannelCNIConfig`, `DHCPv4Config`, `UnattendedInstallConfig`, ...); old fields still work but a deprecated field and its replacement document cannot both be set. Patches are strategic-merge YAML; from 1.13 do not use RFC 6902 `op/path/value` patches. After `talosctl upgrade-k8s` the live config differs from a stored `controlplane.yaml`: re-applying a stale full file can downgrade components. Store **patches**, regenerate the config, and back up the live config with `talosctl -n <ip> get mc v1alpha1 -o yaml`.

## Upgrades

```bash
talosctl -n <ip> upgrade --image factory.talos.dev/metal-installer/<schematic-id>:v1.14.5   # one node at a time
talosctl -n <cp> upgrade-k8s --to <k8s-version> --dry-run                                  # then without --dry-run
```

- Since Talos 1.14 `ghcr.io/siderolabs/installer` is no longer published: use the Image Factory installer with the **schematic ID of the image the node was installed from** (it carries the system extensions); the empty-schematic ID is for nodes without customizations. A wrong schematic drops extensions.
- A-B images: a failed boot rolls back; manual rollback is `talosctl rollback`. Migration is tested between adjacent minors: go through the latest patch of each intermediate minor.
- OS upgrade does not upgrade Kubernetes; `upgrade-k8s` pre-pulls images, patches control-plane component images, updates kube-proxy and kubelets, re-applies bootstrap manifests with server-side apply and (1.13+) prunes unneeded resources (`--manifests-no-prune` to keep them). It can be restarted after a failure.
- Read the "Before upgrade to v1.14.5" section (a multipath extension config must be migrated first).

## etcd operations

```bash
talosctl -n <cp1>,<cp2>,<cp3> etcd members ; talosctl -n <cp1>,<cp2>,<cp3> etcd status
talosctl -n <cp> etcd alarm list              # NOSPACE at the 2 GiB default quota stops etcd writes
talosctl -n <cp> etcd defrag                  # one node at a time: blocks reads/writes on that member
talosctl -n <cp> etcd snapshot db.snapshot    # schedule it; copy off-node
```

Raise the quota only to match real usage (recommended maximum 8 GiB): `cluster.etcd.extraArgs.quota-backend-bytes`, then reboot and `talosctl etcd alarm disarm`.

## Disaster recovery (quorum lost) - destructive

Pre-check: compare `etcd members` on every healthy node and `talosctl service etcd`; if quorum can be restored, do that instead. No node may be of the deprecated `init` machine type.

```
ACTION   talosctl -n <ip> reset --graceful=false --reboot --system-labels-to-wipe=EPHEMERAL      (only on a control-plane node whose etcd is down)
EFFECT   wipes the EPHEMERAL partition, which holds the etcd data directory; the node reboots with etcd in Preparing state
QUORUM   that member's data is gone; recovery then rebuilds the cluster from the snapshot
PROOF    a snapshot (regular or copied with `talosctl -n <ip> cp /var/lib/etcd/member/snap/db .`) is already stored off-node and its hash noted
WAIT-FOR-GO

ACTION   talosctl -n <ip> bootstrap --recover-from=./db.snapshot   (one control-plane node; add --recover-skip-hash-check for a copied db file)
EFFECT   etcd on that node is rebuilt from the snapshot; the other control-plane nodes join once the endpoint is up; state after the snapshot time is lost
PROOF    all etcd services show Preparing; snapshot hash/revision printed matches the file
WAIT-FOR-GO
```

## Pitfalls

| Trap | Consequence |
|------|-------------|
| `talosctl bootstrap` on several nodes or twice | Violates the official "ONCE on a SINGLE node" warning; consequence not documented, assume etcd inconsistency |
| Wrong schematic in `upgrade --image` | Extensions (drivers, iSCSI, etc.) vanish after reboot |
| Storing full `controlplane.yaml` in Git across Kubernetes upgrades | Re-apply downgrades components |
| Exposing maintenance mode on an open network | Anyone can apply a config |

## Verification

`talosctl etcd status` shows one leader and equal raft indexes; `kubectl get nodes` all `Ready`; a restore rehearsal from the latest snapshot succeeded on a throwaway cluster.

## Sources (read 2026-11-10)

- https://docs.siderolabs.com/talos/v1.14/getting-started/getting-started.md , .../prodnotes.md
- https://docs.siderolabs.com/talos/v1.14/configure-your-talos-cluster/lifecycle-management/upgrading-talos.md
- https://docs.siderolabs.com/kubernetes-guides/advanced-guides/upgrading-kubernetes.md
- https://docs.siderolabs.com/talos/v1.14/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery.md
- https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance.md (v1.12 page; v1.14 equivalent not read)
- https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium.md

## Not verified

- `talosctl reset` default flags (graceful behaviour, which partitions are wiped without `--system-labels-to-wipe`) and node removal from etcd (`talosctl etcd remove-member`): not read; read the CLI reference before proposing them.
- The CEL expression syntax of `diskSelector.match` beyond the documented `disk.dev_path == "..."` form (the `disk.serial` / `disk.wwid` property names are named by the guide; the template uses `disk.serial == "..."`).
- Talos certificate/secret rotation, KubePrism configuration details, `talosctl health`, and the support-matrix contents.
