# Block, image and object storage: Cinder, Glance, Ceph RBD and RGW

## Why it matters

Where Glance images, Cinder volumes and Nova ephemeral disks live decides
whether live migration works, whether boot-from-volume is a fast clone or a
full copy, and what a storage outage takes down. Ceph internals (pools, CRUSH,
cephadm, upgrades) belong to devops-storage-backup; this file covers the
OpenStack side of the wiring.

## Backend decision

| Backend | Use when | Cost |
|---------|----------|------|
| External Ceph RBD for Glance + Cinder + Nova | any production cloud with 3+ storage nodes | Ceph to operate; copy-on-write clones, live migration without block copy |
| LVM + iSCSI (`enable_cinder_backend_lvm`) | lab or single storage node | no HA; the storage node is a SPOF |
| NFS (`enable_cinder_backend_nfs`) | existing NAS | performance and locking depend on the NAS |
| Glance `file` | all-in-one only | Kolla starts **one** `glance_api` container when `file` is the backend (multinode guide) |

Kolla 2026.2 sample `globals.yml` also lists Pure, Lightbits, VAST, Quobyte
backends and S3 for Glance and Cinder backup (`glance_backend_s3`,
`cinder_backup_driver: s3`).

## Kolla-Ansible with an external Ceph cluster

Keys verified in the 2026.2 sample `globals.yml`; file paths from
https://docs.openstack.org/kolla-ansible/2026.2/reference/storage/external-ceph-guide.html:

```yaml
glance_backend_ceph: "yes"
cinder_backend_ceph: "yes"
nova_backend_ceph: "yes"
# defaults shown - change only if your Ceph users/pools differ
# ceph_glance_user: "glance"          ceph_glance_pool_name: "images"
# ceph_cinder_user: "cinder"          ceph_cinder_pool_name: "volumes"
# ceph_cinder_backup_user: "cinder-backup"  ceph_cinder_backup_pool_name: "backups"
# ceph_nova_user: "{{ ceph_cinder_user }}"  ceph_nova_pool_name: "vms"
```

Files to place on the deployment host (one minimal `ceph.conf` per service,
e.g. from `ceph config generate-minimal-conf`, leading tabs removed):

| Service | Files |
|---------|-------|
| Glance | `/etc/kolla/config/glance/ceph.conf`, `/etc/kolla/config/glance/ceph.client.glance.keyring` |
| Cinder | `/etc/kolla/config/cinder/ceph.conf`, `/etc/kolla/config/cinder/cinder-volume/ceph.client.cinder.keyring`, `/etc/kolla/config/cinder/cinder-backup/ceph.client.cinder.keyring` (+ the backup user keyring) |
| Nova | `/etc/kolla/config/nova/ceph.conf`, `/etc/kolla/config/nova/ceph.client.cinder.keyring` |

Pools and cephx users with the right capabilities are created on the Ceph side
(Ceph docs "Block Devices and OpenStack", https://docs.ceph.com/en/latest/rbd/rbd-openstack/).
If Nova and Cinder use separate keys, set `ceph_nova_user: nova` before an upgrade
(Kolla operating guide note).

Apply: `kolla-ansible reconfigure -i multinode -t glance,cinder,nova` (or a full
`deploy` on a new cloud).

## Object storage

- Kolla 2026.2 has no `enable_swift` key in its sample `globals.yml`. Use Ceph RGW: `enable_ceph_rgw: true` registers Swift-compatible endpoints in Keystone (user `ceph_rgw`, port `ceph_rgw_port` default 6780) and load-balances RGW through HAProxy.
- `ceph_rgw_swift_compatibility` and `ceph_rgw_swift_account_in_url` must match the RGW-side settings (`rgw_swift_account_in_url`); a mismatch gives hard-to-diagnose 403s from Swift clients such as Horizon.
- OpenStack-Ansible documents RGW as a drop-in Swift replacement ("Using Ceph Object Gateway (radosgw) as a drop-in replacement for Swift" in its user guide) and still ships Swift roles.

## Day-2 commands

```bash
openstack volume service list                       # cinder-volume per backend host@backend: up
openstack volume type list --long
openstack volume create --size 20 --type <type> data01
openstack server add volume <server> data01          # --device is a hint only
openstack volume attachment list
openstack server volume list <server>
openstack image create --disk-format raw --container-format bare \
  --file ubuntu-24.04.raw --private ubuntu-24.04     # raw avoids conversion for RBD clones
```

Image format with Ceph: use `raw` images so Glance → Cinder/Nova can clone in
RBD; `qcow2` forces a download and conversion. Upstream Ceph RBD/OpenStack
guide states this; verify against your Ceph release docs.

## Destructive operations (propose, then the user's go)

| Command | Effect |
|---------|--------|
| `openstack volume delete <vol>` | deletes the volume and its data; fails if attached or with snapshots |
| `openstack volume delete --cascade <vol>` | also deletes its snapshots |
| `openstack volume delete --force <vol>` | forced removal regardless of state - can leave a dangling attachment on the compute |
| `openstack image delete <image>` | removes the image; instances booted from RBD clones still depend on the parent in Ceph |

Before proposing: `openstack volume show <vol> -c status -c attachments`,
`openstack volume snapshot list --volume <vol>`.

## Verify

```bash
openstack volume service list
openstack volume create --size 1 canary && openstack volume show canary -c status   # available
# then propose: openstack volume delete canary
```

## Not verified

- The raw-vs-qcow2 cloning statement was not re-read in the current Ceph docs.
- The exact key name for a separate Cinder backup user keyring in Kolla 2026.2 (guide lists the cinder keyring under `cinder-backup/`; read the guide section if `ceph_cinder_backup_user` differs).
- `openstack image delete` behaviour with RBD clone parents is general knowledge.

## Sources

- https://docs.openstack.org/kolla-ansible/2026.2/reference/storage/external-ceph-guide.html
- https://opendev.org/openstack/kolla-ansible/src/branch/stable/2026.2/etc/kolla/globals.yml
- https://docs.openstack.org/python-openstackclient/2026.2/cli/command-objects/volume.html
- https://docs.openstack.org/openstack-ansible/2026.1/
