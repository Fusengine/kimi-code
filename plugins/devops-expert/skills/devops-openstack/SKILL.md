---
name: devops-openstack
description: Use when operating a private OpenStack cloud - mapping how a request flows through Keystone, Nova, Neutron/OVN, Glance, Cinder and Placement, picking a release and its SLURP upgrade path, choosing and running Kolla-Ansible, OpenStack-Ansible or OpenStack-Helm, sizing a small production control plane, day-2 work with the `openstack` CLI and `clouds.yaml` (projects, quotas, flavors, images, networks, routers, security groups, volumes, instances), series upgrades, or troubleshooting "No valid host", port binding failures, volume attach errors and RabbitMQ / MariaDB-Galera health. Not for Ceph internals (devops-storage-backup), the Terraform/OpenTofu OpenStack provider (devops-iac), generic Ansible (devops-ansible), Kubernetes itself (devops-kubernetes) or public clouds.
versions:
  openstack: "2026.2 Hibiscus (current, released 2026-09-30)"
  openstack-slurp: "2026.1 Gazpacho"
  openstack-next: "2027.1 Indri (SLURP, planned 2027-03-24)"
  kolla-ansible: "23.0.0 (2026.2)"
  openstack-ansible: "33.1.0 (2026.1); 2026.2 not released on 2026-11-10"
  openstack-helm: "2026.2.0"
  python-openstackclient: "10.3.1 (2026.2 series)"
references:
  - references/service-map.md
  - references/release-upgrade-slurp.md
  - references/deployment-choice-sizing.md
  - references/kolla-ansible.md
  - references/openstack-ansible.md
  - references/openstack-helm.md
  - references/networking-neutron-ovn.md
  - references/storage-cinder-ceph.md
  - references/operations-cli.md
  - references/troubleshooting.md
  - references/templates/clouds.yaml
  - references/templates/kolla-globals.yml
  - references/templates/project-bootstrap.md
  - references/templates/heat-single-server.yaml
  - references/templates/pre-upgrade-checklist.md
related-skills:
  - devops-storage-backup
  - devops-iac
  - devops-ansible
  - devops-kubernetes
  - devops-k8s-cluster
  - devops-linux
  - devops-networking
  - devops-virtualization
  - devops-observability
  - devops-databases
  - devops-secrets
  - devops-sre-ops
---

<objective>
Covers running a private OpenStack cloud end to end: the service map and request
flow, the release model (two releases a year, SLURP skip-level upgrades), the
choice and use of Kolla-Ansible, OpenStack-Ansible or OpenStack-Helm, small
production control-plane sizing, day-2 operations with the `openstack` CLI,
series upgrades and troubleshooting per deployment tool.
Does not cover Ceph internals (devops-storage-backup), the Terraform/OpenTofu
provider (devops-iac), Ansible in general (devops-ansible), Kubernetes itself
(devops-kubernetes, devops-k8s-cluster), public clouds, or vendor
distributions (Red Hat OpenStack Services on OpenShift, Canonical Sunbeam):
for those, read the vendor's own documentation.
</objective>

# DevOps OpenStack

## Agent Workflow (MANDATORY)

Before advising or changing anything, run in parallel (one `Agent` call each, with a `name`):

1. **explore-codebase** - find existing `globals.yml`, `passwords.yml`, inventories, `openstack_user_config.yml`, `clouds.yaml`, Helm values overrides
2. **research-expert** - re-read https://releases.openstack.org/ and the deployment tool docs for the target series (versions move every six months)
3. **mcp__context7__query-docs** - library `/websites/openstack` for the exact command or config key

After writing config or templates, run **sniper**.

## Overview

| Area | What this skill gives |
|------|-----------------------|
| **Service map** | Which service owns what, and the path of `openstack server create` through Keystone → Nova → Placement → Glance/Neutron/Cinder |
| **Releases** | Current, SLURP and next series; which upgrade jumps are tested |
| **Deployment** | Kolla-Ansible vs OpenStack-Ansible vs OpenStack-Helm, plus a 3-controller baseline |
| **Day-2** | `clouds.yaml`, read-only discovery, project bootstrap, quotas, images, networks, volumes, instances |
| **Upgrades** | Backup, prechecks, per-tool upgrade commands, verification |
| **Troubleshooting** | Logs per tool, the four classic failure chains, control-plane health |

## Critical Rules

1. **Read-only discovery first on a live cloud**: `openstack service list`, `openstack compute service list`, `openstack network agent list`, `openstack volume service list` - then plan, change, verify ([operations-cli.md](references/operations-cli.md)).
2. **Destructive commands are proposed, never run on your own**: `openstack server delete`, `volume delete`, `network delete`, `router delete`, `project delete`, `project cleanup`, `kolla-ansible destroy`, `kolla-ansible stop`, `nova-manage db purge`. Show the exact effect and the object list, then wait for the user's go.
3. **Upgrade only along a tested path**: adjacent series, or SLURP to SLURP. Never skip from a non-SLURP release ([release-upgrade-slurp.md](references/release-upgrade-slurp.md)).
4. **Back up before any series upgrade or DB-touching action**: deployment config (`/etc/kolla` or `/etc/openstack_deploy`) and the MariaDB data. Nova cannot downgrade its database.
5. **Odd-sized quorum**: MariaDB-Galera and RabbitMQ need 3 (or 5) controllers; 2 gives no HA.
6. **Never invent a key or flag**: every `globals.yml` key and CLI option in this skill was checked against the 2026.2 docs or source; anything else is verified first or reported as unknown.
7. **Secrets stay out of output**: `passwords.yml`, `user_secrets.yml`, `clouds.yaml` passwords and application credential secrets are never printed, committed or pasted (devops-secrets).

## Reference Guide

### Concepts

| Topic | Reference | When to consult |
|-------|-----------|-----------------|
| **Service map** | [service-map.md](references/service-map.md) | Which service does what, request flow, what to enable |
| **Releases & SLURP** | [release-upgrade-slurp.md](references/release-upgrade-slurp.md) | Picking a series, planning an upgrade path |
| **Deployment choice & sizing** | [deployment-choice-sizing.md](references/deployment-choice-sizing.md) | New cloud, choosing a tool, node layout |
| **Kolla-Ansible** | [kolla-ansible.md](references/kolla-ansible.md) | `globals.yml`, deploy, reconfigure, upgrade, MariaDB backup |
| **OpenStack-Ansible** | [openstack-ansible.md](references/openstack-ansible.md) | `openstack_user_config.yml`, playbooks, major upgrades |
| **OpenStack-Helm** | [openstack-helm.md](references/openstack-helm.md) | OpenStack on an existing Kubernetes cluster |
| **Neutron / OVN** | [networking-neutron-ovn.md](references/networking-neutron-ovn.md) | Provider vs tenant networks, OVN, floating IPs |
| **Cinder / Ceph** | [storage-cinder-ceph.md](references/storage-cinder-ceph.md) | Volume backends, external Ceph wiring, RGW as object store |
| **Operations CLI** | [operations-cli.md](references/operations-cli.md) | `clouds.yaml`, discovery, day-2 commands, destructive ops |
| **Troubleshooting** | [troubleshooting.md](references/troubleshooting.md) | Logs, No valid host, port binding, attach, RabbitMQ/Galera |

### Templates

| Template | When to use |
|----------|-------------|
| [clouds.yaml](references/templates/clouds.yaml) | Admin + project + application-credential entries |
| [kolla-globals.yml](references/templates/kolla-globals.yml) | Minimal 2026.2 Kolla-Ansible production `globals.yml` (OVN, external Ceph) |
| [project-bootstrap.md](references/templates/project-bootstrap.md) | New project: user, role, quotas, network, router, security group, first server |
| [heat-single-server.yaml](references/templates/heat-single-server.yaml) | Heat stack: network, router, port, server, floating IP, volume |
| [pre-upgrade-checklist.md](references/templates/pre-upgrade-checklist.md) | Gate before any series upgrade |

## Quick Reference

```bash
export OS_CLOUD=mycloud-admin                       # entry in clouds.yaml
openstack token issue -f value -c expires           # auth works
openstack service list                              # catalog
openstack compute service list                      # nova-* up/enabled per host
openstack network agent list                        # OVN controller / metadata agents alive
openstack volume service list                       # cinder-scheduler / cinder-volume up
openstack quota show --usage <project>              # quota vs consumption
openstack server event list <server>                # what Nova did to an instance
```

→ Full sequences in [operations-cli.md](references/operations-cli.md) and [project-bootstrap.md](references/templates/project-bootstrap.md).

## Best Practices

### DO
- Pin the deployment tool to the series branch or tag (`stable/2026.2`, OSA tag `33.1.0`) and install `python-openstackclient` with the series upper constraints
- Keep the whole deployment config in git; diff it against the new sample files at each upgrade
- Use application credentials in automation instead of user passwords
- Use OVN (`neutron_plugin_agent: "ovn"` in Kolla, the OSA default `ml2.ovn`) for new clouds
- Schedule MariaDB backups and test a restore before you need one

### DON'T
- Run `kolla-ansible upgrade` with `--limit` (the docs report known bugs with it)
- Put host-specific variables in Kolla `globals.yml` (highest precedence, applies to every host)
- Upgrade a non-SLURP release by two series at once
- Expect `enable_swift` in Kolla 2026.2 - the key is not in the sample `globals.yml`; use Ceph RGW (`enable_ceph_rgw`)
- Treat `openstack project delete` as cleanup - it removes the project, not its servers, volumes or networks (`project cleanup --dry-run` first)
