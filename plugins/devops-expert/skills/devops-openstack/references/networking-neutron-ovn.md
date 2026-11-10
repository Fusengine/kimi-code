# Neutron networking with OVN

## Why it matters

Most "instance unreachable" tickets are a mismatch between the physical wiring
(provider interface, VLANs, MTU) and what Neutron was told. Decide the network
model before the first deploy; changing the mechanism driver later is a
migration.

## Concepts

| Term | Meaning | Who creates it |
|------|---------|----------------|
| Provider network | maps to a physical network (`flat` or `vlan`) via a physnet name; used for external/floating IPs or direct VM attachment | admin only |
| Tenant (self-service) network | overlay network (Geneve with OVN) inside a project | project members |
| Router | connects tenant subnets to an external provider network, does SNAT and floating IPs | project members (gateway on external net) |
| Floating IP | public address from the external network, NATed to a port | project members |
| Security group | stateful per-port firewall; default group allows egress only and ingress from the same group | project members |

## Mechanism driver choice

- Kolla-Ansible: `neutron_plugin_agent` accepts `openvswitch` (default) or `ovn`. Set `"ovn"` for new clouds.
- OpenStack-Ansible 2026.1: role default `neutron_plugin_type: "ml2.ovn"`.
- OpenStack-Helm: docs example uses Open vSwitch; OVN needs its own charts/overrides.

Sources: https://docs.openstack.org/kolla-ansible/2026.2/reference/networking/neutron.html,
https://opendev.org/openstack/openstack-ansible-os_neutron/src/branch/stable/2026.1/defaults/main.yml.

## Kolla-Ansible keys (all present in the 2026.2 sample `globals.yml`)

```yaml
neutron_plugin_agent: "ovn"
neutron_external_interface: "eth1"            # no IP on it; Kolla plugs it into br-ex
# several provider networks: lists of the same length, zipped together
# neutron_external_interface: "eth1,eth2"
# neutron_bridge_name: "br-ex1,br-ex2"
# neutron_physical_networks: "physnet1,physnet2"   # default physnet1..N
enable_neutron_provider_networks: true        # external bridge on computes too (VMs directly on VLANs)
neutron_ovn_distributed_fip: true             # floating IP traffic leaves from the compute (needs external bridge on computes)
```

- Default physnet name is `physnet1` (or `physnet1..N`); your `openstack network create --provider-physical-network` must match it.
- With OVN, Kolla does **not** enable distributed floating IPs by default: FIP and SNAT traffic goes through gateway chassis (network nodes) unless `neutron_ovn_distributed_fip` is set.
- Large clouds: OVN southbound relays are computed as `ceil(ovn-controller hosts / ovn_sb_db_relay_compute_per_relay)` (default 50 per relay); override with `ovn_sb_db_relay_count`.
- Internal DNS on ports: `neutron_dns_integration: "yes"` and `neutron_dns_domain` (must end with a dot, not `openstacklocal`).

## Create the external network (admin, once)

```bash
openstack network create --external --provider-network-type flat \
  --provider-physical-network physnet1 public
openstack subnet create --network public --subnet-range 203.0.113.0/24 \
  --gateway 203.0.113.1 --no-dhcp \
  --allocation-pool start=203.0.113.100,end=203.0.113.200 public-subnet
# VLAN instead of flat: --provider-network-type vlan --provider-segment 100
```

## Tenant topology (per project)

```bash
openstack network create app-net
openstack subnet create --network app-net --subnet-range 10.20.0.0/24 \
  --dns-nameserver 192.0.2.53 app-subnet
openstack router create app-router
openstack router set --external-gateway public app-router
openstack router add subnet app-router app-subnet
openstack security group create app-sg
openstack security group rule create --ingress --protocol tcp --dst-port 22 \
  --remote-ip 198.51.100.0/24 app-sg
openstack floating ip create public
openstack server add floating ip <server> <floating-ip>
```

All commands and options verified in the python-openstackclient 2026.2 command
reference (https://docs.openstack.org/python-openstackclient/2026.2/cli/commands.html).

## MTU

Geneve encapsulation adds a larger header than VXLAN; if the underlay MTU is
1500, tenant MTU drops below it. Raise the underlay MTU (jumbo frames on
`tunnel_interface`) or accept the smaller tenant MTU, and test with a
don't-fragment ping between two instances on different computes
(OVN troubleshooting page, MTU section).

## Verify

```bash
openstack network agent list -c "Agent Type" -c Host -c Alive -c State
openstack port list --server <server> --long
openstack router show app-router -c external_gateway_info -c status
```

OVN agents (`OVN Controller agent`, `OVN Controller Gateway agent`,
`OVN Metadata agent`) must be `Alive :-)` and `UP` on every host.

## Pitfalls

- An IP left on `neutron_external_interface` becomes unusable once Kolla plugs it into the bridge; never use the SSH/management interface as provider interface.
- Duplicated OVN agents after a host upgrade: the OVS `system-id` changed and stale `Chassis` / `Chassis_Private` records remain in the southbound DB. The fix (`ovn-sbctl destroy Chassis <name>` and `... Chassis_Private <name>`) deletes records: list them first, propose, then the user's go (https://docs.openstack.org/neutron/2026.2/admin/ovn/troubleshooting.html).
- Geneve needs kernel support (`lsmod | grep openvswitch` should list geneve).

## Not verified

- Exact `Agent Type` strings per OVN version beyond the troubleshooting page example (`OVN Controller Gateway agent`, `OVN Metadata agent`); `OVN Controller agent` (non-gateway host) is from general knowledge.
- Default security group rules (egress allowed, ingress only from the same group) are general knowledge, not re-read for 2026.2; check with `openstack security group rule list default`.

## Sources

- https://docs.openstack.org/kolla-ansible/2026.2/reference/networking/neutron.html
- https://docs.openstack.org/neutron/2026.2/admin/ovn/troubleshooting.html
- https://docs.openstack.org/python-openstackclient/2026.2/cli/command-objects/network.html
