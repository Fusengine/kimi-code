# OpenStack-Ansible (2026.1: 33.1.0)

## Why it matters

OSA installs services from source into venvs, on metal or in LXC containers,
driven by playbooks in the `openstack.osa` collection. It trails the
coordinated release: on 2026-11-10 the newest OSA series is **2026.1 Gazpacho**
(tag 33.1.0); 2026.2 has a deliverable file with no release yet
(https://opendev.org/openstack/releases/src/branch/master/deliverables/hibiscus/openstack-ansible.yaml).

## Layout

| Path | Content |
|------|---------|
| `/opt/openstack-ansible` | the OSA git checkout, pinned to a tag |
| `/etc/openstack_deploy/openstack_user_config.yml` | hosts per group, networks (`cidr_networks`, `provider_networks`), VIPs |
| `/etc/openstack_deploy/user_variables.yml` | global and role overrides |
| `/etc/openstack_deploy/user_secrets.yml` | generated secrets - never print |
| `/etc/openstack_deploy/conf.d/*.yml` | per-service host groups |
| `/usr/local/bin/openstack-ansible.rc` | environment for ad-hoc `ansible` runs |

Group names use underscores since 2026.1 (`galera_all`, `rabbitmq_all`); OSA sets
`ANSIBLE_TRANSFORM_INVALID_GROUP_CHARS=always` and warns on dashes.

## Deploy sequence

From https://docs.openstack.org/project-deploy-guide/openstack-ansible/2026.1/ (deployment host, configure, run playbooks pages):

```bash
git clone -b 33.1.0 https://opendev.org/openstack/openstack-ansible /opt/openstack-ansible
cd /opt/openstack-ansible && scripts/bootstrap-ansible.sh
cp -a /opt/openstack-ansible/etc/openstack_deploy /etc/openstack_deploy
cd /etc/openstack_deploy && cp openstack_user_config.yml.example openstack_user_config.yml
cd /opt/openstack-ansible                                   # edit the files above first
./scripts/pw-token-gen.py --file /etc/openstack_deploy/user_secrets.yml
openstack-ansible openstack.osa.setup_infrastructure --syntax-check
openstack-ansible openstack.osa.setup_hosts
openstack-ansible openstack.osa.setup_infrastructure
openstack-ansible openstack.osa.setup_openstack
```

The deploy guide clones 33.0.1; use the latest 2026.1 tag (33.1.0, the tag the
2026.1 major-upgrade guide checks out). Decide `install_method` (source, the
default, or distro packages) in `user_variables.yml` before the first run: the
configure page states OSA cannot convert from one method to the other later.

## Networking default

`os_neutron` role default `neutron_plugin_type: "ml2.ovn"` on `stable/2026.1`
(https://opendev.org/openstack/openstack-ansible-os_neutron/src/branch/stable/2026.1/defaults/main.yml):
new OSA clouds are OVN unless you override it.

## Verify the database cluster after `setup_infrastructure`

```bash
cd /opt/openstack-ansible
ansible galera_container -m shell \
  -a "mariadb -h localhost -e 'show status like \"%wsrep_cluster_%\";'"
```

Every node must report `wsrep_cluster_size` = number of Galera nodes and
`wsrep_cluster_status` = `Primary`.

## Logs

Since Train, services log to systemd-journald; container journals are visible
on the host under `/var/log/journal/`, so `journalctl` on the metal host reads
every service. `/openstack/log/` mappings no longer exist. Journals persist
across reboots (`openstack_host_keep_journals: true` by default)
(https://docs.openstack.org/openstack-ansible/2026.1/admin/maintenance-tasks/logging.html).

```bash
journalctl -u nova-scheduler --since "15 min ago"    # unit names follow the service; check with systemctl list-units
```

## Major upgrade (2025.2 Flamingo or 2025.1 Epoxy → 2026.1 Gazpacho)

From https://docs.openstack.org/openstack-ansible/2026.1/admin/upgrades/major-upgrades.html
- the 2026.1 series migrates from the adjacent release or from the previous SLURP:

1. Preflight health checks; read release notes of the target **and skipped** series.
2. `cd /opt/openstack-ansible && git checkout 33.1.0`
3. Back up: `tar zcf /openstack/backup-openstack-ansible-2025.2.tar.gz /etc/openstack_deploy /etc/ansible/ /usr/local/bin/openstack-ansible.rc`
4. Either `./scripts/run-upgrade.sh`, or the manual steps:
   ```bash
   unset ANSIBLE_INVENTORY
   ./scripts/bootstrap-ansible.sh
   openstack-ansible openstack.osa.upgrade.deploy_config_changes
   openstack-ansible openstack.osa.setup_hosts --limit '!galera_all:!rabbitmq_all' -e package_state=latest
   openstack-ansible openstack.osa.setup_hosts -e 'lxc_container_allow_restarts=false' --limit 'galera_all:rabbitmq_all'
   openstack-ansible openstack.osa.setup_infrastructure -e 'galera_upgrade=true' -e 'rabbitmq_upgrade=true' -e package_state=latest
   openstack-ansible openstack.osa.tools.galera_cluster_rolling_restart
   openstack-ansible openstack.osa.setup_openstack -e package_state=latest
   ```
5. Before the infrastructure step: RabbitMQ must be ≥ 3.13 (minor upgrade documented as `openstack-ansible openstack.osa.rabbitmq_server -e rabbitmq_upgrade=true -e rabbitmq_package_version=3.13.7-1`) and mirrored queues migrated to quorum queues.
6. Magnum: the Cluster API driver is integrated in `os_magnum` from 2026.1; follow the Magnum CAPI migration doc.
7. Ceph: `setup_infrastructure` / `setup_openstack` include Ceph playbooks; `upgrade_ceph_packages: true` upgrades Ceph packages too. Keep the Ceph client version with `ceph_stable_release` if needed (Ceph cluster upgrades: devops-storage-backup).

`-e package_state=latest` upgrades only the packages the roles manage; it is not a full `apt upgrade` / `dnf upgrade`.

## Pitfalls

- Non-trusted certificates for RabbitMQ are not possible with newer amqp versions (upgrade guide warning).
- Running `setup_infrastructure` without the `--limit` exclusions restarts Galera/RabbitMQ containers in an uncontrolled way during upgrades.
- Do not track `master`: the docs warn it is unstable.

## Not verified

- The exact systemd unit names per service on a 2026.1 host (check with `systemctl list-units | grep -E 'nova|neutron|cinder'`).
- OSA 2026.2 release date.

## Sources

- https://docs.openstack.org/openstack-ansible/2026.1/
- https://docs.openstack.org/openstack-ansible/2026.1/admin/upgrades/major-upgrades.html
- https://docs.openstack.org/openstack-ansible/2026.1/admin/upgrades/compatibility-matrix.html
- https://docs.openstack.org/project-deploy-guide/openstack-ansible/2026.1/run-playbooks.html
- https://docs.openstack.org/openstack-ansible/2026.1/admin/maintenance-tasks/logging.html
