---
name: provider-openstack
description: The OpenStack provider - maintainer and release status, clouds.yaml and application-credential auth, network, router, security group and instance resources
when-to-use: Declaring Neutron/Nova/Cinder objects in HCL against a private OpenStack cloud
keywords: openstack provider, clouds.yaml, application credential, openstack_compute_instance_v2, networking_network_v2, router_interface, boot from volume
priority: high
related: layout-providers-lock.md, state-surgery.md, modules-variables.md
---

# OpenStack provider

**Load when:** HCL manages OpenStack projects' networks, instances or volumes. Cloud operation (Kolla-Ansible, Neutron/OVN, quotas, flavors, `openstack` CLI) is `devops-openstack`.

## Status (registry and GitHub, 2026-11-10)

| Item | Value |
|------|-------|
| Source | `terraform-provider-openstack/openstack` (GitHub org `terraform-provider-openstack`), community tier |
| Latest release | 3.4.0, published 2025-11-11; no newer version in the registry list read today (about one year ago) |
| History | 2.0.0 and 3.0.0 are major bumps; the docs index still shows an old `~> 1.53.0` example - ignore it |
| Maintainer detail | Registry owner field shows an individual account; maintainer team and support policy **not verified** |

Verdict: it is the provider to use, but check repository activity and open issues before relying on a new OpenStack release; test every provider bump against a lab project. Pin `~> 3.4`.

## Authentication

```hcl
provider "openstack" {
  cloud = var.os_cloud          # entry in clouds.yaml (OS_CLOUD)
  # region = "RegionOne"        # or OS_REGION_NAME
}
```

- `cloud` selects an entry of `clouds.yaml` (openstacksdk format); alternatively set `auth_url` plus credentials, or `OS_*` environment variables.
- Prefer an **application credential** (`application_credential_id` + `application_credential_secret`, Identity v3) limited to one project: revocable, no user password in automation. Create it per `devops-openstack`; keep the secret in `devops-secrets`.
- `clouds.yaml` and `secure.yaml` are per-user files outside the repo (`~/.config/openstack/`); the CI job receives them as secret files.
- Use a TLS CA bundle for private clouds through the clouds.yaml `cacert`, not `insecure`.

## Resources (names from the provider docs)

| Need | Resource |
|------|----------|
| Network, subnet | `openstack_networking_network_v2`, `openstack_networking_subnet_v2` (`network_id`, `cidr`, `ip_version`, `enable_dhcp`, `gateway_ip`, `allocation_pool`) |
| Router and attachment | `openstack_networking_router_v2` (`external_network_id`, `enable_snat` needs the ext-gw-mode extension), `openstack_networking_router_interface_v2` (`router_id`, `subnet_id`) |
| Security group | `openstack_networking_secgroup_v2`, `openstack_networking_secgroup_rule_v2` |
| Port | `openstack_networking_port_v2` (`fixed_ip`, `security_group_ids`) |
| Floating IP | `openstack_networking_floatingip_v2` (`pool`), `openstack_networking_floatingip_associate_v2` |
| Volume | `openstack_blockstorage_volume_v3`, `openstack_compute_volume_attach_v2` |
| Instance | `openstack_compute_instance_v2` (`image_id`, `flavor_id`, `key_pair`, `security_groups`, `network {}`, `block_device {}`, `metadata`) |

Template: [templates/openstack-instance-network.tf](templates/openstack-instance-network.tf).

## Patterns and pitfalls

- Boot from volume uses a `block_device` block with `source_type = "image"`, `destination_type = "volume"`, `boot_index = 0`, `delete_on_termination` - decide `delete_on_termination` deliberately: `true` destroys the data disk with the instance.
- The docs' boot-from-volume examples omit `image_id` on the instance (the image is referenced in `block_device.uuid`); copy that shape.
- Attach extra volumes with `openstack_compute_volume_attach_v2`, not by editing `block_device` on a running instance (replacement).
- Resource arguments marked "Changing this creates a new ..." (for example router and port ownership, `tenant_id`) mean `-/+` in the plan: read it.
- All instance arguments, the admin password included, are stored in plain text in state: encrypt state (`state-backends-encryption.md`) and prefer key pairs.
- Image and flavor IDs differ per cloud; pass them as variables or look them up with data sources (names in the provider docs); never hard-code UUIDs from another cloud.
- `openstack_networking_router_interface_v2` imports by **port id** (`openstack port list --router <router>`); the import formats of the other resources are in each resource page.

## Verification

```bash
openstack --os-cloud <cloud> network list ; openstack --os-cloud <cloud> server list    # platform side (devops-openstack)
tofu plan -out=tfplan -detailed-exitcode
openstack --os-cloud <cloud> server show <id> -c status -c addresses
```

## Sources

- https://registry.terraform.io/v1/providers/terraform-provider-openstack/openstack (3.4.0)
- https://github.com/terraform-provider-openstack/terraform-provider-openstack/releases
- https://raw.githubusercontent.com/terraform-provider-openstack/terraform-provider-openstack/main/docs/index.md , .../docs/resources/compute_instance_v2.md , .../networking_network_v2.md , .../networking_subnet_v2.md , .../networking_router_v2.md , .../networking_router_interface_v2.md

## Not verified

- Who maintains the provider and whether releases resumed after 2025-11-11 (the registry showed none).
- Compatibility with the current OpenStack release series (check `devops-openstack` for the release in use).
- Names of image/flavor data sources and the import ID of instances, networks and volumes.
- `cacert` handling by the provider (clouds.yaml field per the openstacksdk docs, not tested with this provider).
