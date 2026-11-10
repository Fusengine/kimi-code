# Kolla-Ansible (2026.2: 23.0.0)

## Why it matters

Kolla-Ansible deploys every OpenStack service as a container from one config
directory (`/etc/kolla`) and one CLI. Its safety depends on three files staying
consistent: `globals.yml`, `passwords.yml` and the inventory.

## Install the tool for the series

From https://docs.openstack.org/kolla-ansible/2026.2/user/quickstart.html:

```bash
python3 -m venv /opt/kolla-venv && source /opt/kolla-venv/bin/activate
pip install -U pip
pip install git+https://opendev.org/openstack/kolla-ansible@stable/2026.2
sudo mkdir -p /etc/kolla && sudo chown $USER:$USER /etc/kolla
cp -r /opt/kolla-venv/share/kolla-ansible/etc_examples/kolla/* /etc/kolla
cp /opt/kolla-venv/share/kolla-ansible/ansible/inventory/multinode .
kolla-ansible install-deps          # Ansible Galaxy requirements
kolla-genpwd                        # fills /etc/kolla/passwords.yml
```

## Configuration rules

- `globals.yml` keys used in the template were checked against the 2026.2 sample
  https://opendev.org/openstack/kolla-ansible/src/branch/stable/2026.2/etc/kolla/globals.yml →
  [kolla-globals.yml](templates/kolla-globals.yml).
- `kolla_base_distro`: `debian`, `rocky` or `ubuntu`; match the host OS (Debian 13, Rocky 10, Ubuntu 24.04 supported).
- Leave `openstack_release` unset: the tool deploys the series embedded in it; overriding is for a local registry with its own tag policy.
- aarch64: images are not multi-arch, set `openstack_tag_suffix: "-aarch64"`.
- Extra per-service options go in `/etc/kolla/globals.d/*.yml` (all files are added automatically) and service config overrides in `/etc/kolla/config/<service>/...` (e.g. `/etc/kolla/config/neutron/openvswitch_agent.ini`).
- **Variable precedence**: `globals.yml` is passed as extra vars, so it beats everything. Host- or group-specific values (`api_interface` per host, `neutron_external_interface` per group) belong in inventory `host_vars/` / `group_vars/`, never in `globals.yml` (https://docs.openstack.org/kolla-ansible/2026.2/user/multinode.html).
- Several keepalived clusters on one L2 segment: give each a unique `keepalived_virtual_router_id` (0-255).
- RabbitMQ does not work with IP addresses: every controller's `api_interface` IP must resolve to its hostname on all RabbitMQ hosts.

## Deploy sequence

```bash
kolla-ansible bootstrap-servers -i multinode   # Docker/Podman + host deps
kolla-ansible prechecks -i multinode
kolla-ansible deploy -i multinode
kolla-ansible validate-config -i multinode     # only meaningful after the first deploy
kolla-ansible post-deploy -i multinode         # writes /etc/kolla/clouds.yaml (+ admin openrc)
pip install python-openstackclient -c https://releases.openstack.org/constraints/upper/2026.2
```

Copy `/etc/kolla/clouds.yaml` to `~/.config/openstack/` or `/etc/openstack`,
or point `OS_CLIENT_CONFIG_FILE` at it. `init-runonce` is a demo script that
creates networks/images; do not run it on a production cloud.

## Day-2 commands (all take `-i INVENTORY`)

| Command | Effect |
|---------|--------|
| `reconfigure [-t <service>]` | regenerate config and restart changed services |
| `genconfig` | generate config without restarting (not applied) |
| `deploy-containers` | check/update containers without generating config |
| `pull` | pull images for the current tag |
| `prune-images --yes-i-really-really-mean-it` | removes orphaned images (guarded) |
| `stop --yes-i-really-really-mean-it` | **stops** containers - outage; guarded flag is required |
| `destroy --yes-i-really-really-mean-it [--include-images]` | **removes containers and volumes = the cloud and its databases**; propose only with a verified backup and the user's go |
| `mariadb-backup [--incremental]` | Mariabackup into the `mariadb_backup` volume (needs `enable_mariabackup: true` + `reconfigure -t mariadb`) |
| `mariadb-recovery` | restart a fully stopped Galera cluster |
| `rabbitmq-reset-state` | wipes RabbitMQ queues/exchanges (used in queue-type migrations) |

Flags verified in `kolla_ansible/cli/commands.py` on `stable/2026.2`; command
list from https://docs.openstack.org/kolla-ansible/2026.2/user/operating-kolla.html.

## Series upgrade (e.g. 2026.1 → 2026.2)

1. Read the 2026.2 release notes (upgrade section) and back up `/etc/kolla` (git) plus a MariaDB backup.
2. `pip3 install --upgrade git+https://opendev.org/openstack/kolla-ansible@stable/2026.2`
3. SLURP jump only: upgrade `ansible-core` to the range the target supports (2026.2 docs example: `'ansible-core>=2.20,<2.21.99'`).
4. `kolla-ansible install-deps`; diff your inventory against the new sample inventories.
5. Merge passwords:
   ```bash
   cp /etc/kolla/passwords.yml passwords.yml.old
   cp /opt/kolla-venv/share/kolla-ansible/etc/kolla/passwords.yml passwords.yml.new
   kolla-genpwd -p passwords.yml.new
   kolla-mergepwd --old passwords.yml.old --new passwords.yml.new --final /etc/kolla/passwords.yml
   ```
6. `kolla-ansible pull` then `kolla-ansible prechecks`.
7. `kolla-ansible upgrade -i multinode` - recreates containers from new images and runs schema migrations.
8. Verify (below). Never pass `--limit` to the upgrade: the docs report known bugs (e.g. with parts of Nova).

Within a series: update the package, `pull`, then `deploy` again.

## MariaDB backup and restore

- Enable once: `enable_mariabackup: true`, then `kolla-ansible reconfigure -i multinode -t mariadb`.
- Back up: `kolla-ansible mariadb-backup -i multinode` (full) / `--incremental`. Kolla does not schedule it; the docs suggest daily full kept two weeks, hourly incremental kept one day (cron on the deployment host).
- Copy the `mariadb_backup` Docker volume off the node; a backup on the same disk is not a backup.
- Restore is manual (prepare with `mariabackup --prepare` in a `mariadb-server` image container, stop MariaDB with `kolla-ansible stop -t mariadb --yes-i-really-really-mean-it`, copy back, then `kolla-ansible mariadb-recovery -e mariadb_recover_inventory_name=<first node>`). Follow https://docs.openstack.org/kolla-ansible/2026.2/admin/mariadb-backup-and-restore.html step by step; the restore deletes `/var/lib/mysql/*` - propose, then the user's go.

## Verify

```bash
docker ps --filter health=unhealthy           # on each node; podman ps if Podman
kolla-ansible validate-config -i multinode
openstack compute service list && openstack network agent list && openstack volume service list
```

## Not verified

- Whether the `mariadb` client binary exists in every 2026.2 `mariadb-server` image (OSA docs use `mariadb`; older images ship `mysql`).

## Sources

- https://docs.openstack.org/kolla-ansible/2026.2/user/quickstart.html
- https://docs.openstack.org/kolla-ansible/2026.2/user/operating-kolla.html
- https://docs.openstack.org/kolla-ansible/2026.2/user/multinode.html
- https://docs.openstack.org/kolla-ansible/2026.2/admin/mariadb-backup-and-restore.html
- https://opendev.org/openstack/kolla-ansible/src/branch/stable/2026.2/kolla_ansible/cli/commands.py
