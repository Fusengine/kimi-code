# Service map and request flow

## Why it matters

Every OpenStack failure surfaces in one service but is caused in another: a
"No valid host" from Nova is often a Placement inventory problem, a server stuck
in `BUILD` is often a Neutron port that never bound. Knowing who calls whom tells
you which log to open first.

## Services and their 2026.2 Hibiscus versions

Versions from https://releases.openstack.org/hibiscus/index.html (read 2026-11-10).

| Service | Project | Owns | 2026.2 version |
|---------|---------|------|----------------|
| Identity | Keystone | users, projects, domains, roles, tokens, service catalog | 30.0.0 |
| Compute | Nova | instances, flavors, scheduling, cells, live migration | 34.0.0 |
| Placement | Placement | resource providers, inventories, allocations, traits | 16.0.0 |
| Networking | Neutron | networks, subnets, ports, routers, floating IPs, security groups | 29.0.0 |
| Image | Glance | images and their backends (file, Ceph RBD, S3) | 33.0.0 |
| Block storage | Cinder | volumes, snapshots, backups, volume types | 29.0.0 |
| Dashboard | Horizon (Skyline is the alternative UI: `skyline-apiserver`, `skyline-console`) | web UI | 27.0.0 |
| Orchestration | Heat | stacks from HOT templates | 27.0.1 |
| Load balancer | Octavia (+ `ovn-octavia-provider` 11.0.0) | load balancers, listeners, pools | 19.0.0 |
| DNS | Designate | zones, recordsets, Neutron DNS integration | 23.0.0 |
| Key manager | Barbican | secrets, certificates, encryption keys | 23.0.0 |
| Containers | Magnum | Kubernetes clusters as a service (Cluster API driver) | 23.0.0 |
| Object storage | Swift, or Ceph RGW exposing a Swift-compatible endpoint | objects, containers | Swift 2.38.3 |

Infrastructure under all of them: MariaDB (Galera cluster), RabbitMQ (RPC and
notifications, quorum queues by default since RabbitMQ 4.0), Memcached (token and
API caches), HAProxy + keepalived (API VIP) - Kolla-Ansible docs
https://docs.openstack.org/kolla-ansible/2026.2/admin/production-architecture-guide.html
and https://docs.openstack.org/kolla-ansible/2026.2/reference/message-queues/rabbitmq.html.

## What to enable

| Need | Minimum set |
|------|-------------|
| VMs with networking | Keystone, Nova, Placement, Neutron, Glance (Kolla enables these plus Heat and Horizon via `enable_openstack_core`) |
| Persistent disks | + Cinder (with a backend: Ceph RBD, LVM, NFS...) |
| Tenant load balancers | + Octavia (OVN provider avoids amphora VMs, L4 only - check the provider limits in the Octavia docs before promising L7) |
| DNS names for ports / floating IPs | + Designate |
| Object storage | Ceph RGW (Kolla: `enable_ceph_rgw`) or Swift (OSA has Swift roles; Kolla 2026.2 has no `enable_swift` key) |
| Kubernetes for tenants | + Magnum, Barbican, Octavia |

Every extra service adds endpoints, database schemas and upgrade steps; enable
it when a user needs it, not "for later".

## Request flow: `openstack server create`

1. **Client → Keystone**: the CLI reads `clouds.yaml`, gets a token and the service catalog.
2. **Client → Nova API**: request with flavor, image, network(s), key, security groups.
3. **Nova API → Glance / Neutron / Cinder**: validates the image, the networks and (boot-from-volume) the volume source.
4. **Nova conductor → Nova scheduler → Placement**: Placement returns allocation candidates matching the flavor's resources and traits. Empty answer → `NoValidHost` ("Got no allocation candidates from the Placement API" in the scheduler log, source `nova/scheduler/manager.py`).
5. **Scheduler filters and weighers** reduce the candidates; all removed → "Filtering removed all hosts for the request" (source `nova/filters.py`), then `NoValidHost`.
6. **Allocation claimed in Placement**, request sent over RabbitMQ to the chosen `nova-compute`.
7. **nova-compute → Neutron**: creates/binds the port to the host (`binding:host_id`); OVN programs the logical port. Bind failure → `PortBindingFailed` ("Binding failed for port ..., please check neutron logs").
8. **nova-compute → Glance or Cinder**: fetches the image or attaches the root volume (os-brick, iSCSI/RBD).
9. **nova-compute → libvirt**: defines and starts the domain; Neutron reports the port active.
10. **Instance `ACTIVE`**; metadata and DHCP are served by OVN (metadata agent) on the compute host.

Exception names and messages verified in
https://opendev.org/openstack/nova/src/branch/stable/2026.2/nova/exception.py.

## Where each step breaks (first log to open)

| Symptom | Step | First place to look |
|---------|------|---------------------|
| 401 / auth errors | 1 | Keystone log, `clouds.yaml` `auth_url`, project/domain names |
| `ERROR` immediately, fault "No valid host was found" | 4-5 | nova-scheduler log, `openstack resource provider list` |
| Stuck `BUILD` then `ERROR`, fault mentions binding | 7 | neutron-server log, `openstack network agent list` |
| `ERROR` with image/volume fault | 8 | nova-compute log on the host, cinder-volume log |
| `ACTIVE` but unreachable | 9-10 | security groups, router/floating IP, OVN metadata agent |

→ Detailed chains in [troubleshooting.md](troubleshooting.md).

## Verify

```bash
openstack catalog list                  # every enabled service has public/internal endpoints
openstack endpoint list --interface public
openstack compute service list          # nova-scheduler, nova-conductor, nova-compute: State up
openstack network agent list            # OVN agents Alive
openstack volume service list           # cinder-scheduler, cinder-volume up
```

## Not verified

- Octavia OVN provider feature limits (L4-only claim is general knowledge, read the Octavia provider driver matrix before relying on it).
- Skyline version numbers for 2026.2 (listed on the series page, not extracted).

## Sources

- https://releases.openstack.org/hibiscus/index.html
- https://docs.openstack.org/2026.2/admin/ (service admin guides index)
- https://docs.openstack.org/kolla-ansible/2026.2/admin/production-architecture-guide.html
- https://opendev.org/openstack/nova/src/branch/stable/2026.2/nova/scheduler/manager.py
