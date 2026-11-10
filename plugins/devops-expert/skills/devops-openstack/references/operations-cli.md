# Day-2 operations with the `openstack` CLI

## Why it matters

The `openstack` client (python-openstackclient, 10.3.1 in the 2026.2 series)
is the one interface that works the same on Kolla, OSA and OSH clouds. Every
live change follows: **read-only discovery → plan → change → verify**, and
every destructive command is shown with its effect before the user's go.

## Install and authenticate

```bash
python3 -m venv ~/osc && source ~/osc/bin/activate
pip install python-openstackclient -c https://releases.openstack.org/constraints/upper/2026.2
pip install osc-placement          # adds `openstack resource provider ...` (needed for scheduling issues)
export OS_CLOUD=mycloud-admin      # or --os-cloud mycloud-admin on each command
openstack token issue -f value -c expires
```

`clouds.yaml` lookup order (openstacksdk config docs): current directory,
`~/.config/openstack/` (Linux), `/etc/openstack/`; first file found wins.
`OS_CLIENT_CONFIG_FILE` inserts an explicit path first. Secrets can live in a
separate `secure.yaml` (same search rules, takes precedence), or use
`auth_type: v3applicationcredential` with `application_credential_id` /
`application_credential_secret` → [clouds.yaml](templates/clouds.yaml).
Kolla writes an admin `clouds.yaml` with `kolla-ansible post-deploy`.

TLS: openstacksdk verifies certificates by default; use `cacert:` for a private
CA. `verify: False` disables verification and wins over `cacert` - do not ship it.

## Read-only discovery (run before any change)

```bash
openstack service list
openstack endpoint list --interface public
openstack compute service list               # Host, Status (enabled/disabled), State (up/down)
openstack network agent list
openstack volume service list
openstack hypervisor list --long
openstack resource provider list             # osc-placement
openstack quota list --compute               # admin overview
openstack server list --all-projects --long
openstack versions show
```

Record the output in the change log; it is the "before" state you verify against.

## Projects, users, roles, quotas

```bash
openstack project create --domain default --description "Team A" team-a
openstack user create --domain default --password-prompt alice
openstack role add --project team-a --user alice member     # default roles: admin, member, reader
openstack quota set --instances 20 --cores 40 --ram 81920 \
  --volumes 20 --gigabytes 1000 --floating-ips 5 \
  --networks 5 --routers 2 --ports 100 --secgroups 20 team-a
openstack quota show --usage team-a
```

Keystone provides `admin`, `member` and `reader` by default since Rocky
(https://docs.openstack.org/keystone/2026.2/admin/service-api-protection.html).
For automation create an application credential in the target project instead of
sharing a password: `openstack application credential create <name>`.

## Flavors, images, keypairs

```bash
openstack flavor create --vcpus 2 --ram 4096 --disk 40 --public m1.medium
openstack flavor create --vcpus 8 --ram 32768 --disk 0 --private --project team-a team-a.large   # disk 0 = boot from volume
openstack image create --disk-format raw --container-format bare \
  --file noble.raw --property hw_disk_bus=virtio --public ubuntu-24.04
openstack keypair create --public-key ~/.ssh/id_ed25519.pub alice-key
```

## Networks and instances

Tenant network, router, security group, floating IP: see
[networking-neutron-ovn.md](networking-neutron-ovn.md). Then:

```bash
openstack server create --flavor m1.medium --image ubuntu-24.04 \
  --boot-from-volume 40 --network app-net --security-group app-sg \
  --key-name alice-key --wait web01
openstack server show web01 -c status -c addresses -c fault
openstack server event list web01
openstack console log show --lines 50 web01
```

`--boot-from-volume <size>` creates the root volume from the image; it is **not**
deleted with the server unless `--delete-on-termination` is given.

## Maintenance on a compute host

```bash
openstack compute service set --disable --disable-reason "maint CHG-123" <host> nova-compute
openstack server list --all-projects --host <host>
openstack server migrate --live-migration --wait <server>      # scheduler picks the target
openstack server migration list --server <server>
openstack compute service set --enable <host> nova-compute
```

`openstack server evacuate` rebuilds instances of a **dead** host elsewhere; run
it only when the host is confirmed down (fenced), never on a host that may still
run the guests.

## Destructive commands: exact effect, then the user's go

| Command | Effect | Check before proposing |
|---------|--------|------------------------|
| `openstack server delete [--wait] <srv>` | deletes the instance and its ephemeral disk; boot volumes survive unless created with delete-on-termination | `server show`, `server volume list` |
| `openstack server delete --force` | force delete (CLI help: "Force delete server(s)") | why the normal delete failed |
| `openstack volume delete [--cascade\|--force] <vol>` | deletes data (and snapshots with `--cascade`) | attachments, snapshots, backups |
| `openstack network delete <net>` / `router delete <rtr>` | fails while ports/interfaces exist; success cuts every attached workload | `port list --network`, `router show` |
| `openstack project cleanup --dry-run --project <p>` then `--auto-approve` | lists, then deletes **all** resources of the project | dry-run output attached to the proposal |
| `openstack project delete <p>` | deletes the Keystone project; run `project cleanup` first so resources are not orphaned | dry-run cleanup is empty |
| `nova-manage db archive_deleted_rows --until-complete` / `nova-manage db purge --before <date>` | archives soft-deleted rows to shadow tables / deletes shadow rows permanently | DB backup taken |

Never pipe a `list` into a `delete` loop without showing the list first.

## Not verified

- That `openstack project delete` leaves Nova/Neutron/Cinder resources orphaned is general knowledge (the existence of `project cleanup` implies it; no 2026.2 page read states it).
- The `hw_disk_bus` image property name was not re-checked in the 2026.2 Glance metadata docs.

## Sources

- https://docs.openstack.org/python-openstackclient/2026.2/cli/commands.html
- https://docs.openstack.org/openstacksdk/2026.2/user/config/configuration.html
- https://docs.openstack.org/osc-placement/2026.2/cli/index.html
- https://docs.openstack.org/nova/2026.2/cli/nova-manage.html
- https://docs.openstack.org/kolla-ansible/2026.2/user/quickstart.html
