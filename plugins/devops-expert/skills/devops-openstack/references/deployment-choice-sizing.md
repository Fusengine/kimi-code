# Choosing a deployment tool and sizing a small production cloud

## Why it matters

The deployment tool decides how you upgrade, where logs live and what the team
must know for the next five years. Switching tools later is a migration
project, not a config change.

## The three upstream tools

| | Kolla-Ansible | OpenStack-Ansible (OSA) | OpenStack-Helm (OSH) |
|---|---|---|---|
| Runs services as | Docker or Podman containers (`kolla_container_engine`) built by Kolla | Python venvs on hosts or in LXC containers, systemd units | Pods on an existing Kubernetes cluster, Helm charts |
| Config entry point | `/etc/kolla/globals.yml`, `passwords.yml`, Ansible inventory | `/etc/openstack_deploy/openstack_user_config.yml`, `user_variables.yml`, `user_secrets.yml` | Helm values + `helm osh get-values-overrides` feature sets |
| Host OS (current series) | Debian 13, Rocky Linux 10, Ubuntu 24.04 (2026.2 support matrix) | 2026.1 source install: Ubuntu 24.04 / 26.04, Debian 12 / 13, CentOS Stream 10, Rocky 10 (compatibility matrix) | Ubuntu Resolute images and hosts for 2026.2; Kubernetes `>=1.33,<=1.35` tested |
| Logs | `/var/log/kolla/<service>` (Docker volume `kolla_logs`) | systemd-journald, `journalctl` on the metal host | `kubectl logs` |
| Upgrade | `kolla-ansible upgrade` (one command) | `scripts/run-upgrade.sh` or the manual playbook sequence | `helm upgrade` per chart |
| Current version | 23.0.0 for 2026.2 | 33.1.0 for 2026.1 (2026.2 not released) | 2026.2.0 |
| Kubernetes needed | no | no | yes - you also own the cluster lifecycle |

Sources: https://docs.openstack.org/kolla-ansible/2026.2/user/support-matrix.html,
https://docs.openstack.org/openstack-ansible/2026.1/admin/upgrades/compatibility-matrix.html,
https://docs.openstack.org/openstack-helm/latest/readme.html.

## Decision rules

1. **Small team, first production cloud, wants the current series** → Kolla-Ansible. One CLI, single-command upgrade, upstream production architecture guide.
2. **Team already strong in Ansible, wants services as host packages/venvs, journald logging, can trail the coordinated release by some weeks** → OpenStack-Ansible.
3. **Organisation already runs Kubernetes in production and has people who can debug Helm, CNI and storage under OpenStack** → OpenStack-Helm. Note that the OSH Kubernetes test range (≤ 1.35) lags the newest Kubernetes minors (devops-kubernetes for versions).
4. **A vendor support contract is required** → a vendor distribution; out of scope here, use the vendor docs.
5. Never choose a tool for one feature; check the target service is supported by it (e.g. Kolla 2026.2 has no Swift key, uses Ceph RGW).

## Node roles (Kolla inventory groups as the vocabulary)

From https://docs.openstack.org/kolla-ansible/2026.2/admin/production-architecture-guide.html:

| Role | Runs | Count |
|------|------|-------|
| deployment | the tool's CLI, config repo | 1 (can be a VM) |
| control | APIs, schedulers, MariaDB, RabbitMQ, Memcached | **odd number**, 3 recommended, 5 for two failures |
| network | Neutron/OVN gateway, HAProxy + keepalived (VIP) | often collocated with control in small clouds |
| compute | nova-compute, libvirt, OVN controller | as many as needed |
| storage | cinder-volume (LVM) - not needed with external Ceph | 0+ |
| monitoring | Prometheus / central logging | optional (devops-observability) |

Quorum: MariaDB-Galera and RabbitMQ need a majority; 2 instances give no HA
(one failure stops the other), 3 tolerate one failure, more than 5 rarely helps.

## Small production baseline

- 3 converged control+network nodes behind one internal VIP (`kolla_internal_vip_address`) and optionally an external VIP with TLS (`kolla_enable_tls_external`).
- N compute nodes; plan host capacity for one compute failure (evacuation room).
- External Ceph cluster for Glance, Cinder, Nova ephemeral and RGW (devops-storage-backup owns Ceph).
- Separate networks: management/API (`api_interface`), tunnel (`tunnel_interface`), provider/external without IP (`neutron_external_interface`), storage.
- `/var/lib/docker` (Kolla) on fast disk with room: MariaDB, RabbitMQ and logs live in Docker volumes; a loaded 130-node cluster with central logging and debug produced 30-50 GB of logs per day (Kolla production guide).
- Local container registry for multinode Kolla (recommended by https://docs.openstack.org/kolla-ansible/2026.2/user/multinode.html).

Evaluation floor (Kolla all-in-one quickstart, not production): 2 NICs, 8 GB
RAM, 40 GB disk (https://docs.openstack.org/kolla-ansible/2026.2/user/quickstart.html).

## Sizing method (derive, do not guess)

1. Compute capacity = sum of flavors expected × instance count, divided by the CPU/RAM allocation ratios you set in Nova; add one host of headroom.
2. Control nodes: measure on a staging deploy (`docker stats` / `systemd-cgtop`) under a load test, then add margin; MariaDB and RabbitMQ memory grows with compute count and API rate.
3. Storage: Ceph sizing belongs to devops-storage-backup; give it the volume/image/ephemeral totals.

## Verify the chosen layout before deploy

```bash
kolla-ansible prechecks -i multinode            # Kolla
openstack-ansible openstack.osa.setup_infrastructure --syntax-check   # OSA (run from /opt/openstack-ansible)
helm osh wait-for-pods openstack                # OSH, after each chart
```

## Not verified

- No upstream page gives CPU/RAM figures for production control nodes; the sizing method above is a measurement procedure, not a sourced number.
- OSH production readiness statements beyond the "Versions supported" table were not read.

## Sources

- https://docs.openstack.org/kolla-ansible/2026.2/admin/production-architecture-guide.html
- https://docs.openstack.org/kolla-ansible/2026.2/user/quickstart.html
- https://docs.openstack.org/openstack-ansible/2026.1/
- https://docs.openstack.org/openstack-helm/latest/readme.html
- https://docs.openstack.org/2026.2/deploy/
