---
name: ceph-architecture-deploy
description: Ceph architecture (MON, MGR, OSD, MDS, RGW), pools and CRUSH, RBD/CephFS/RGW, cephadm bootstrap and OSD creation, release lifecycle
when-to-use: Designing a Ceph cluster, deploying with cephadm, creating pools or file systems, or choosing a Ceph release
keywords: ceph, cephadm, mon, mgr, osd, mds, rgw, crush, pool, rbd, cephfs, erasure coding, umbrella, tentacle, squid
priority: critical
related: ceph-operations-health.md, ceph-destructive-ops.md, kubernetes-storage-pointers.md, storage-selection.md
---

# Ceph Architecture and Deployment

**Load when:** building or extending a Ceph cluster. Daily health work is in [ceph-operations-health.md](ceph-operations-health.md); Proxmox-integrated Ceph (`pveceph`) is in `devops-proxmox`; Ceph under OpenStack Cinder in `devops-openstack`.

## Releases (docs.ceph.com/releases, read 2026-11-10)

| Release | Latest | Initial | End of life |
|---------|--------|---------|-------------|
| Umbrella (21) | 21.2.0 | 2026-10-28 | 2028-06-01 (estimated) |
| Tentacle (20) | 20.2.5 | 2025-11-18 | 2027-06-01 (estimated) |
| Squid (19) | 19.2.7 | 2024-09-26 | **2026-12-02** (estimated) |

Squid ends in weeks: plan the upgrade. Pick Tentacle for production today unless Umbrella's features are needed. Proxmox VE 9.2 ships Squid and Tentacle only.

## Daemons

| Daemon | Role | Count |
|--------|------|-------|
| MON | Cluster maps and quorum | 3 (odd; 5 for large sites) |
| MGR | Dashboard, orchestrator module, metrics, balancer, autoscaler | 2 (active + standby) |
| OSD | One per disk; stores objects, replicates, recovers | Many |
| MDS | CephFS metadata | 1 active + standby per file system |
| RGW | S3/Swift gateway | 2+ behind a load balancer |

Clients: **RBD** (block images in a pool), **CephFS** (POSIX file system), **RGW** (object). All sit on RADOS pools.

## Pools and CRUSH

A pool has a type (`replicated` or `erasure`), a CRUSH rule that picks the **failure domain** (default host), `size` (copies) and `min_size` (copies needed to accept I/O) and a PG autoscale mode.

```bash
ceph osd pool create POOL --pool_type replicated --size 3 --min_size 2   # fields per `ceph osd pool create` syntax
ceph osd pool set POOL min_size 2
rbd pool init POOL                          # newly created RBD pools must be initialised
ceph fs volume create cephfs                # creates pools; orchestrator deploys MDS
```

`size 2` or `min_size 1` in production risks data loss (docs warn: only temporarily in emergencies). The CephFS metadata pool must be replicated; the first data pool may be erasure-coded but replication is recommended. Erasure-coded pools suit large cold object data, not VM disks.

## Deploy with cephadm

```bash
cephadm bootstrap --mon-ip MONIP            # first host: creates MON + MGR, SSH key, /etc/ceph/ceph.conf,
                                            # client.admin keyring (privileged), _admin label
ceph orch host add HOST IP                  # more hosts (check version help for flags)
ceph orch device ls                         # AVAILABLE only if: no partitions, no LVM, not mounted,
                                            # no file system, no BlueStore OSD, >= 5 GiB
ceph orch apply osd --all-available-devices --dry-run     # preview first
ceph orch apply osd --all-available-devices
ceph orch daemon add osd HOST:/dev/sdX      # one specific device
```

`--dry-run` previews are snapshots of the inventory; apply soon after. Do not install the `ceph-osd` package on hosts managed by cephadm (documented conflict). `cephadm bootstrap` writes the admin keyring: protect `/etc/ceph/ceph.client.admin.keyring` and never paste it.

## Capacity rules

Ratios (defaults): nearfull 0.85 (health warning), backfillfull 0.90 (backfills stop), full 0.95 (client writes blocked). Size the cluster so that losing one failure domain still leaves the remaining OSDs below nearfull. Details in [ceph-operations-health.md](ceph-operations-health.md).

## Sources

- https://docs.ceph.com/en/latest/releases/ (read 2026-11-10)
- https://docs.ceph.com/en/latest/cephadm/services/osd/ (read 2026-11-10)
- Context7 `/ceph/ceph` (2026-11-10): cephadm install, pools, rbd, CephFS volumes (https://github.com/ceph/ceph/blob/main/doc/cephadm/install.rst , doc/rados/operations/pools.rst , doc/cephfs/fs-volumes.rst)

## Not verified

- Daemon counts and the "5 MON for large sites" and "RGW 2+" guidance: standard practice, the architecture and hardware pages were not read today.
- Default values of `osd_pool_default_size` / `min_size` (commonly 3/2): not read; set them explicitly.
- `ceph orch host add` argument form: not read today; check `ceph orch host add -h`.
- Umbrella changes versus Tentacle: release notes not read.
