# Template: pre-upgrade checklist (series upgrade)

Copy into the change ticket and fill every line with evidence (command output or
path). Any unchecked line = no upgrade. The user's go is given on the completed
checklist; a later change gets its own checklist.

## Change identity

- Cloud / region: `<name>`  ·  Deployment tool: Kolla-Ansible | OpenStack-Ansible | OpenStack-Helm
- From series: `<2026.1 Gazpacho>` → To series: `<2026.2 Hibiscus>`
- [ ] Path is supported: adjacent, or SLURP → SLURP (never non-SLURP → non-SLURP) - [release-upgrade-slurp.md](../release-upgrade-slurp.md)
- [ ] Target tool version exists for the target series (Kolla 23.x for 2026.2; OSA has no 2026.2 release on 2026-11-10) - checked at https://releases.openstack.org/ on `<date>`
- [ ] Release notes read: target series **and every skipped series**, upgrade notes first (links: `<...>`)
- [ ] Tool-specific prerequisites listed (Kolla: `ansible-core` range for SLURP, RabbitMQ allowed path; OSA: RabbitMQ ≥ 3.13, quorum queues; OSH: Kubernetes in the tested range)

## Health before (all green, outputs attached)

- [ ] `openstack compute service list` - every service `enabled`/`up` (or the disabled ones explained)
- [ ] `openstack network agent list` - every agent alive
- [ ] `openstack volume service list` - every service `up`
- [ ] Galera: `wsrep_cluster_size` = node count, `wsrep_cluster_status` = `Primary` on every node
- [ ] RabbitMQ: `rabbitmqctl cluster_status` lists all nodes running; `rabbitmq-diagnostics check_local_alarms` clean
- [ ] `nova-status upgrade check` on the **current** code: exit 0 (1 = read and justify, 2 = stop)
- [ ] Previous upgrade fully finished: `nova-manage db online_data_migrations` (it migrates data, not read-only) exited 0 after the last upgrade - 1 = run again, 2 = intervention needed (https://docs.openstack.org/nova/2026.2/cli/nova-manage.html)
- [ ] No instance in `ERROR`/`BUILD`/`MIGRATING` that matters: `openstack server list --all-projects --status ERROR`
- [ ] Free disk on control nodes for new images and DB growth (`df -h /var/lib/docker` or equivalent)

## Backups (restorable, off the node)

- [ ] Deployment config committed in git and tagged: `/etc/kolla` (globals.yml, passwords.yml stored encrypted), or `/etc/openstack_deploy` + `/etc/ansible` + `/usr/local/bin/openstack-ansible.rc` tarball, or Helm values files
- [ ] MariaDB full backup taken and copied off-node (Kolla: `kolla-ansible mariadb-backup -i <inv>`; `mariadb_backup` volume) - path: `<...>`
- [ ] Restore of that backup tested on a scratch node within the last `<N>` days (date + evidence)
- [ ] Ceph / external storage untouched by this change, or its own backup plan referenced (devops-storage-backup)

## Rehearsal and plan

- [ ] Upgrade rehearsed on staging with the same tool version and config; duration measured: `<minutes>`
- [ ] Config diff against the new sample files reviewed (Kolla inventory/globals; OSA `deploy_config_changes` contents; OSH new values overrides)
- [ ] Passwords merged (Kolla `kolla-mergepwd`), new secrets generated
- [ ] Maintenance window and user notice sent; API downtime expectation stated
- [ ] Canary plan: one instance create/attach/delete per AZ after the upgrade
- [ ] Rollback stated honestly: Nova (and most services) cannot downgrade the database → rollback = restore DB backup + previous tool version + previous images

## After the upgrade (verify, attach outputs)

- [ ] `openstack versions show` and `openstack compute service list` show the new version on all hosts
- [ ] `nova-status upgrade check` exit 0 on the new code
- [ ] Agents and volume services up; Galera Primary; RabbitMQ clean
- [ ] Canary per AZ: create, attach volume, floating IP reachable - deletion proposed, then the user's go
- [ ] Release-note follow-ups done (online data migrations, deprecated options removed)
- [ ] Report: versions before/after, duration, incidents, evidence links
