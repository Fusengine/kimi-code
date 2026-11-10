# Troubleshooting: logs, failure chains, control-plane health

## Method

1. Read-only first: `openstack compute service list`, `network agent list`, `volume service list`, `server show <srv> -c fault`, `server event list <srv>`.
2. Follow the request flow ([service-map.md](service-map.md)) to the service that failed; open its log with the request ID (`req-...`) from `server event list`.
3. One hypothesis, one change, verify; never stack fixes.

## Where the logs are

| Tool | Location | Command |
|------|----------|---------|
| Kolla-Ansible | `/var/log/kolla/<service>/` on the host (= Docker volume `kolla_logs`, `/var/lib/docker/volumes/kolla_logs/_data`); most containers do **not** log to stdout | `tail -f /var/log/kolla/nova/nova-scheduler.log`; `docker ps -a` for exited containers |
| OpenStack-Ansible | systemd-journald, container journals passed to the metal host under `/var/log/journal/` | `journalctl -u <unit> --since "30 min ago"` |
| OpenStack-Helm | pod stdout | `kubectl -n openstack logs <pod> -c <container>` |
| Kolla central logging | OpenSearch Dashboards on the VIP when `enable_central_logging: true` | browser, credentials in `passwords.yml` |

Sources: https://docs.openstack.org/kolla-ansible/2026.2/user/troubleshooting.html,
https://docs.openstack.org/openstack-ansible/2026.1/admin/maintenance-tasks/logging.html.
Kolla warns that Ansible can leak secrets to system logs; restrict access to
logs and OpenSearch.

## Chain 1: "No valid host was found"

The exception is `NoValidHost` ("No valid host was found. %(reason)s"). Two origins
in the scheduler (source: `nova/scheduler/manager.py`, `nova/filters.py` on `stable/2026.2`):

| Scheduler log line | Meaning | Check |
|--------------------|---------|-------|
| `Got no allocation candidates from the Placement API. This could be due to insufficient resources or a temporary occurrence as compute nodes start up.` | Placement found no provider with enough VCPU/MEMORY_MB/DISK_GB or the required traits | `openstack resource provider list`, `openstack resource provider usage show <rp>`, `openstack resource provider inventory list <rp>`, `openstack allocation candidate list --resource VCPU=2 --resource MEMORY_MB=4096` |
| `Filter <Name> returned 0 hosts` then `Filtering removed all hosts for the request ...` | a scheduler filter rejected everything | the named filter: AZ, aggregate metadata, server group (anti-)affinity, image properties, compute disabled |

Usual causes, in order: compute service `disabled` or `down`; flavor larger than
any host's free capacity after allocation ratios; leftover allocations from
failed migrations (Nova admin guide "Orphaned resource allocations");
`--disk` flavor on a boot-from-volume-only host; AZ or aggregate mismatch.
Repair tools exist (`nova-manage placement heal_allocations`, `nova-manage
placement audit [--delete]`) - `audit --delete` removes allocations: propose
with the audit output first.

## Chain 2: port binding failure

Nova raises `PortBindingFailed` ("Binding failed for port <id>, please check
neutron logs for more information.").

```bash
openstack port show <port> -c binding_vif_type -c binding_host_id -c status
openstack network agent list --host <compute>
```

`binding_vif_type` = `binding_failed` (constant in neutron-lib portbindings) means
no mechanism driver could bind on that host. Check, in order: the OVN controller
agent on that compute is alive; the network's physnet exists on that host
(`neutron_physical_networks` / bridge mappings); the network type is enabled;
the host name Nova uses matches the agent `Host` exactly. Stale duplicated OVN
agents after a host upgrade: see [networking-neutron-ovn.md](networking-neutron-ovn.md).

## Chain 3: volume attach fails

1. `openstack volume show <vol> -c status -c attachments` - must be `available` (or `in-use` with multiattach).
2. `openstack volume service list` - the `cinder-volume` for that backend `up`.
3. nova-compute log on the instance's host (os-brick errors: iSCSI login, RBD auth/keyring, multipath).
4. Ceph backend: the `nova` side keyring `/etc/kolla/config/nova/ceph.client.cinder.keyring` matches `ceph_cinder_user` ([storage-cinder-ceph.md](storage-cinder-ceph.md)).
5. Attach after detach of the same volume can fail on a stale device name; the Cinder admin guide's fix is a different device name or, after repeated cycles, restarting the KVM host (https://docs.openstack.org/cinder/2026.2/admin/ts-failed-attach-vol-after-detach.html).

A volume stuck in `attaching`/`detaching`: do not `volume set --state` blindly;
compare with `openstack volume attachment list --volume-id <id>` and the guest,
then propose the state reset.

## Chain 4: RabbitMQ health

Symptoms: services flapping `down` in `compute service list`, timeouts
"MessagingTimeout" in logs, builds hanging.

```bash
docker exec rabbitmq rabbitmqctl cluster_status          # Kolla; all nodes in running_nodes
docker exec rabbitmq rabbitmq-diagnostics check_running
docker exec rabbitmq rabbitmq-diagnostics check_local_alarms   # memory/disk alarms block publishers
```

Commands from https://www.rabbitmq.com/docs/monitoring and
https://www.rabbitmq.com/docs/clustering. Queues are quorum queues by default
with RabbitMQ 4.0; streams are used for fanout unless
`om_enable_rabbitmq_stream_fanout: false`. Streams declared while a node was
down are not replicated to it; Kolla ships
`contrib/ops/rabbitmq/rabbitmq-repair-stream-replicas.sh` for a healthy cluster
only. `kolla-ansible rabbitmq-reset-state` wipes queues - outage, propose only.

## Chain 5: MariaDB-Galera health

```bash
# Kolla: user root_shard_0, password = database_password in /etc/kolla/passwords.yml
docker exec -it mariadb mariadb -u root_shard_0 -p -e "SHOW STATUS LIKE 'wsrep_cluster_%';"
# OSA, from /opt/openstack-ansible:
ansible galera_container -m shell -a "mariadb -h localhost -e 'show status like \"%wsrep_cluster_%\";'"
```

Healthy: `wsrep_cluster_size` = node count and `wsrep_cluster_status` = `Primary`
on every node. A non-Primary component or size 1 means split or lost quorum.
Whole cluster stopped: Kolla `kolla-ansible mariadb-recovery -i <inv>`; OSA has
`openstack.osa.tools.galera_cluster_rolling_restart` for controlled restarts.
Never bootstrap a node with stale data as the new primary without comparing
sequence numbers - propose with evidence.

## After the fix

Re-run the read-only discovery set, a canary `server create` on the affected
host/AZ, and record root cause + evidence.

## Not verified

- `rabbitmq-diagnostics` being present in the Kolla 2026.2 RabbitMQ image (the role healthcheck uses a `healthcheck_rabbitmq` script).
- The `mariadb` client binary name in the Kolla 2026.2 image (fallback `mysql`).
- The `MessagingTimeout` log string (oslo.messaging exception name, general knowledge).
- `openstack allocation candidate list` may need `OS_PLACEMENT_API_VERSION` set (the osc-placement example exports 1.10); the minimum microversion per option was not checked.

## Sources

- https://docs.openstack.org/kolla-ansible/2026.2/user/troubleshooting.html
- https://docs.openstack.org/nova/2026.2/admin/support-compute.html
- https://docs.openstack.org/nova/2026.2/cli/nova-manage.html
- https://opendev.org/openstack/neutron-lib/src/branch/master/neutron_lib/api/definitions/portbindings.py
- https://docs.openstack.org/kolla-ansible/2026.2/reference/message-queues/rabbitmq.html
- https://docs.openstack.org/project-deploy-guide/openstack-ansible/2026.1/run-playbooks.html
