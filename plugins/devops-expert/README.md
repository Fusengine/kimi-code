# fuse-devops

Expert **self-hosted IT/DevOps** engineering: containers, Kubernetes, Linux servers, networking, Proxmox VE, KVM/libvirt/Incus, OpenStack, infrastructure as code, CI/CD, observability, storage and backup, secrets and stateful databases. Universal, versioned knowledge lives in the skills; every live change goes through a discovery, dry-run, one-go, verify, rollback sequence. Public clouds (AWS, GCP, Azure) are out of scope.

## Agent

| Agent | Description |
|-------|-------------|
| **devops-expert** | Builds, operates and troubleshoots self-hosted infrastructure end to end: inspects read-only, previews every change (plan, diff, dry run, check mode), backs up stateful systems, applies after your go, verifies and keeps a rollback ready |

## Skills

| Skill | Description |
|-------|-------------|
| devops-docker | Docker Engine, Compose, BuildKit, Dockerfile practice, container networking/firewall, registries, image supply chain (SBOM, signing), Podman/Quadlet |
| devops-kubernetes | Workloads, scheduling, Services, Gateway API, storage, RBAC, safe kubectl operations, troubleshooting |
| devops-k8s-cluster | Cluster lifecycle: kubeadm, k3s, Talos, Cluster API, etcd backup/restore, upgrades and version skew, CNI, bare-metal load balancing |
| devops-gitops-packaging | Helm, Kustomize, Argo CD, Flux, drift and prune safety, promotion between environments |
| devops-linux | Day-2 Linux: systemd, packages, users/SSH, kernel params, LVM/filesystems, SELinux/AppArmor, timers, performance and disk troubleshooting, bash scripting |
| devops-networking | nftables, bridges/bonding/VLAN, routing, DNS, TLS/ACME, reverse proxy (Traefik/Caddy/Nginx/HAProxy), WireGuard |
| devops-opnsense | OPNsense firewall/router: rules and NAT, DNS/DHCP, VPN, multi-WAN, CARP HA, plugins, upgrades and rollback, config backup, REST API, Ansible/OpenTofu |
| devops-proxmox | Proxmox VE: cluster, HA, SDN, storage, firewall, LXC, `qm`/`pct`/`pvesh`, templates and cloud-init, API automation |
| devops-virtualization | KVM/QEMU/libvirt (`virsh`), LXC/Incus, cloud-init, image building with Packer |
| devops-openstack | Service map, release/upgrade model (SLURP), Kolla-Ansible / OpenStack-Ansible / OpenStack-Helm, `openstack` CLI, day-2 ops, Ceph integration |
| devops-iac | Terraform and OpenTofu: state, modules, plan/apply discipline, licensing choice, providers for Proxmox/OpenStack/DNS, Terragrunt |
| devops-ansible | ansible-core, playbooks/roles/collections, inventory, idempotence, check mode, vault, Molecule |
| devops-cicd | GitHub Actions, GitLab CI, self-hosted runners, caching, environments and approvals, release pipelines |
| devops-observability | Prometheus, Alertmanager, Grafana, Loki, Alloy, OpenTelemetry Collector, exporters, dashboards as code |
| devops-storage-backup | ZFS, Ceph, LVM-thin/NFS, Proxmox Backup Server, restic/borg, 3-2-1, mandatory restore tests, disaster recovery |
| devops-sre-ops | SLI/SLO and alert policy, runbooks, incident response, postmortems, change management, capacity, DR drills |
| devops-secrets | SOPS + age, Vault and OpenBao, External Secrets, Kubernetes Secrets handling, rotation |
| devops-databases | PostgreSQL HA (Patroni, pgBackRest, CloudNativePG), MariaDB/Galera, PITR, upgrade and failover runbooks |

SOLID: scripts and code helpers follow the shared `solid-generic` skill (no local duplicate); infrastructure artifacts follow the structure of the matching skill.

## Detection

| Kind | Indicators | Effect |
|------|-----------|--------|
| Strong | `*.tf`, `.terraform.lock.hcl`, `terragrunt.hcl`, `Chart.yaml`, `kustomization.yaml`, `ansible.cfg`, `playbooks/`, `roles/`, `inventory/`, `*.pkr.hcl`, `.sops.yaml`, Flux `flux-system/` or Argo CD `Application` manifests, `prometheus.yml` / `alertmanager.yml`, Kolla/OSA `globals.yml` / `openstack_user_config.yml`, `nftables.conf`, `Vagrantfile` | Any one makes devops-expert the primary agent |
| Weak | `Dockerfile`, `compose.yaml` / `docker-compose.yml`, `.github/workflows/`, `.gitlab-ci.yml`, `Makefile`, `scripts/*.sh` | Never alone. In a repo matched by a framework/language expert, that expert stays primary and devops-expert handles only the infrastructure files when the task touches them |

Intent words (deploy, cluster, VM, backup, terraform, helm, proxmox, openstack) also route to devops-expert.

## Safety model

1. **Read-only discovery** — inspect the host, cluster or hypervisor before anything else; the SSH host, kube context and namespace are never guessed.
2. **Plan / dry run** — `terraform plan` / `tofu plan`, `kubectl diff` and `--dry-run=server`, `ansible-playbook --check --diff`, `helm diff` or `helm upgrade --dry-run=server`; one canary host before a fleet.
3. **Backup or snapshot** before changing any stateful system; restore tests are logged.
4. **One go** — you see the plan (adds / changes / destroys), then say go once.
5. **Apply, verify, roll back** — real post-change checks; a failed check rolls back, never stacks a fix.

Destructive commands (`terraform destroy`, `kubectl delete`, `qm destroy`, `pct destroy`, `zfs destroy`, `ceph osd purge`, `openstack server delete`, `docker system prune`, `rm -rf`) are proposed with their exact effect and run only after your explicit go. Secrets are never printed, committed or passed on a command line.

## Installation

```bash
/plugin install fuse-devops
```

## Usage

> "Add a Proxmox VM template with cloud-init and provision three nodes with OpenTofu."
> "Why is this k3s node NotReady?"

For hardening and security audits use `security-expert`; for application code and framework deploys use the framework/language experts.
