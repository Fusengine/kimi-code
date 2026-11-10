---
name: kubeadm-ha-bootstrap
description: Bootstrapping a highly available kubeadm control plane - API endpoint, init config, joining control-plane and worker nodes, tokens and certificate keys
when-to-use: Creating a kubeadm cluster, adding a control-plane node, or re-issuing join credentials
keywords: kubeadm init, kubeadm join, controlPlaneEndpoint, upload-certs, certificate-key, stacked etcd, external etcd, token create, v1beta4
priority: critical
related: etcd-backup-restore.md, node-lifecycle.md, cni-cilium.md, baremetal-loadbalancing.md
---

# kubeadm HA Bootstrap

**Load when:** a kubeadm control plane is created or extended. Template: [kubeadm-ha-config.yaml](templates/kubeadm-ha-config.yaml).

## Decisions

| Question | Rule |
|----------|------|
| Stacked or external etcd? | Stacked is the kubeadm default and needs at least three control-plane nodes; external needs three control-plane + three etcd hosts and decouples failures (https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/). Default to stacked unless etcd must be isolated |
| Endpoint | A DNS name resolving to a TCP load balancer or VIP in front of all control-plane nodes on `:6443`; the health check is a TCP check. Set it at init as `controlPlaneEndpoint`; the LB address must always match it |
| LB options | keepalived + HAProxy (same subnet), kube-vip static pod, or an external appliance ([baremetal-loadbalancing.md](baremetal-loadbalancing.md)) |
| Config style | A YAML file (`kubeadm.k8s.io/v1beta4`) with `--config`, not a pile of flags; the file can be kept in Git |
| CNI | Decide first; Cilium with kube-proxy replacement means skipping kube-proxy at init ([cni-cilium.md](cni-cilium.md)) |

## Preconditions on every node

- Swap disabled; container runtime installed and its socket known (`nodeRegistration.criSocket`).
- Hosts reach `registry.k8s.io` or the images are preloaded.
- Kubernetes packages from `pkgs.k8s.io` (the `apt.kubernetes.io` / `yum.kubernetes.io` repositories are frozen since 2023-09-13). Hold `kubeadm kubelet kubectl` so they upgrade only deliberately.
- kubelet on Kubernetes 1.37 supports cgroup v2 only by default (`FailCgroupV1: true`): check `stat -fc %T /sys/fs/cgroup` returns `cgroup2fs`.
- If a node has several interfaces, set the node IP explicitly (`nodeRegistration.kubeletExtraArgs` name `node-ip`); Cilium's kube-proxy replacement misbehaves with a wrong `InternalIP`.

## First control-plane node

```bash
nc -zv -w 2 <LB_DNS> 6443      # refused is expected before init; a timeout means the LB cannot reach the node
sudo kubeadm init --config kubeadm-ha-config.yaml --upload-certs
```

- `--config` and `--certificate-key` cannot be mixed: put `certificateKey` in `InitConfiguration` if you want a fixed key (generate with `kubeadm certs certificate-key`).
- `--upload-certs` encrypts the shared control-plane certificates into the `kubeadm-certs` Secret; the Secret and the key expire after two hours, and the key "gives access to cluster sensitive data" - never paste it in a ticket.
- Save the printed `kubeadm join` commands. Re-issue later:

```bash
sudo kubeadm init phase upload-certs --upload-certs     # new certificate key, on an existing control-plane node
kubeadm token create --print-join-command               # new worker join command (default TTL 24h)
```

Install the CNI now. Nothing else works until a CNI runs ([cni-cilium.md](cni-cilium.md)). Watch `kubectl get pod -n kube-system -w`.

## Remaining control-plane nodes

One at a time, waiting for `Ready` and etcd health between nodes:

```bash
sudo kubeadm join <LB_DNS>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash> \
  --control-plane --certificate-key <key>
```

`--control-plane` creates a new control-plane instance and, with stacked etcd, a local etcd member. Run `kubectl -n kube-system rollout restart deployment coredns` after at least one extra node joined, because all CoreDNS pods usually start on the first node.

## Workers

```bash
sudo kubeadm join <LB_DNS>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

## External etcd variant

Build the etcd cluster first, copy `ca.crt`, `apiserver-etcd-client.crt` and `.key` to the first control-plane node, and set `etcd.external.endpoints/caFile/certFile/keyFile` in `ClusterConfiguration` (shown in the official HA page). Everything else is as above.

## Pitfalls

| Trap | Consequence |
|------|-------------|
| `controlPlaneEndpoint` omitted or set to the first node's IP | The cluster cannot become HA without regenerating certificates |
| LB is an HTTP proxy | The API server terminates TLS and uses mutual TLS: use a TCP load balancer |
| Joining two control-plane nodes at once | Racing etcd member adds; join sequentially |
| Certificate key expired (2 h) | `kubeadm join --control-plane` fails to download certs: re-run `upload-certs` |
| Even number of control-plane nodes | Same fault tolerance as one fewer, more ways to lose quorum |
| `kubeadm init` run again on an initialised node | Use `kubeadm reset` only after the effect is understood ([node-lifecycle.md](node-lifecycle.md)) |

## Verification

```bash
kubectl get nodes -o wide                                        # all Ready, InternalIP as intended
kubectl -n kube-system get pods -o wide                          # 3x apiserver, controller-manager, scheduler, etcd
kubectl get --raw='/readyz?verbose' | tail -n 3                  # "readyz check passed"
sudo kubeadm certs check-expiration                              # each control-plane node
```

Then run the etcd health check in [etcd-backup-restore.md](etcd-backup-restore.md) and take the first snapshot.

## Sources (read 2026-11-10)

- https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
- https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-token/
- https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/ (package repositories, cgroup v2, swap)
- https://github.com/kubernetes/kubeadm/blob/main/docs/ha-considerations.md (keepalived + HAProxy)
- https://kubernetes.io/docs/reference/using-api/health-checks/

## Not verified

- Container runtime installation steps and the exact `kubeadm join` flags for `JoinConfiguration` control-plane mode (only the CLI join form was read).
- The "joining sequentially" rule is stated by the official page as a recommendation for external etcd; applying it to stacked etcd is operational practice.
- `stat -fc %T /sys/fs/cgroup` is a common check, not read in an official page.
