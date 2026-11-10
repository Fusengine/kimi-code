# Declarative state changes, reviewed in a plan and applied from a saved plan file.
# Procedure: tofu state pull > backup; add the blocks; tofu plan -out=tfplan; the plan must show only
# "will be imported", "has moved" or "will be removed from state" for these addresses and nothing else;
# show it, wait for the go, tofu apply tfplan. Docs: https://opentofu.org/docs/language/import/ and
# https://opentofu.org/docs/language/modules/develop/refactoring/
# Addresses and IDs below are placeholders. Import ID formats are per resource type: read its Import section.

# 1. Rename a resource without recreating it (old address -> new address).
moved {
  from = openstack_networking_network_v2.app_net
  to   = openstack_networking_network_v2.app
}

# 2. Turn a single resource into a for_each instance, keeping the existing object.
moved {
  from = proxmox_virtual_environment_vm.web
  to   = proxmox_virtual_environment_vm.this["web"]
}

# 3. Adopt an existing object. The resource block must exist (or use -generate-config-out, experimental).
import {
  to = openstack_networking_secgroup_v2.legacy
  id = "00000000-0000-0000-0000-000000000000" # UUID from: openstack security group list
}

resource "openstack_networking_secgroup_v2" "legacy" {
  name        = "legacy"
  description = "adopted from the console"
}

# 4. Forget an object but leave it running (OpenTofu 1.7+, lifecycle block recommended).
#    `from` cannot carry an instance key. The block can stay as a record or be removed after apply.
removed {
  from = openstack_networking_floatingip_v2.old

  lifecycle {
    destroy = false
  }
}

# 5. Keep a resource in the configuration but never destroy it (OpenTofu 1.12): destroy and replace plans
#    forget it instead; tofu destroy then exits non-zero. Persisted in state: to destroy it later, remove the
#    argument (or add a removed block with destroy = true) and apply again.
# resource "openstack_blockstorage_volume_v3" "data" {
#   name = "data"
#   size = 100
#   lifecycle {
#     destroy = false
#   }
# }
