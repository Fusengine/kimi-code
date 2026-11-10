# Project network, router, security group and one instance with the OpenStack provider (3.4.0).
# Arguments follow the provider docs: networking_network_v2, subnet_v2, router_v2, router_interface_v2,
# secgroup_v2, secgroup_rule_v2 and compute_instance_v2 (https://github.com/terraform-provider-openstack/terraform-provider-openstack/tree/main/docs/resources).
# Auth: clouds.yaml entry via var.cloud (OS_CLOUD). Prefer an application credential scoped to one project.
# Image and flavor are passed as IDs because they differ per cloud.

terraform {
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 3.4"
    }
  }
}

variable "cloud" {
  type        = string
  description = "Entry name in clouds.yaml."
}

variable "external_network_id" {
  type        = string
  description = "UUID of the external (provider) network used as router gateway."
}

variable "image_id" {
  type        = string
  description = "Glance image UUID."
}

variable "flavor_id" {
  type        = string
  description = "Nova flavor ID."
}

variable "key_pair" {
  type        = string
  description = "Name of an existing Nova key pair."
}

variable "ssh_source_cidr" {
  type        = string
  description = "CIDR allowed to reach SSH (never 0.0.0.0/0 in production)."

  validation {
    condition     = can(cidrhost(var.ssh_source_cidr, 0)) && var.ssh_source_cidr != "0.0.0.0/0"
    error_message = "ssh_source_cidr must be a valid CIDR and not 0.0.0.0/0."
  }
}

provider "openstack" {
  cloud = var.cloud
}

resource "openstack_networking_network_v2" "app" {
  name           = "app-net"
  admin_state_up = true
}

resource "openstack_networking_subnet_v2" "app" {
  name       = "app-subnet"
  network_id = openstack_networking_network_v2.app.id
  cidr       = "192.168.50.0/24"
  ip_version = 4
}

resource "openstack_networking_router_v2" "app" {
  name                = "app-router"
  admin_state_up      = true
  external_network_id = var.external_network_id
}

resource "openstack_networking_router_interface_v2" "app" {
  router_id = openstack_networking_router_v2.app.id
  subnet_id = openstack_networking_subnet_v2.app.id
}

resource "openstack_networking_secgroup_v2" "ssh" {
  name        = "app-ssh"
  description = "SSH from the admin network"
}

resource "openstack_networking_secgroup_rule_v2" "ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = var.ssh_source_cidr
  security_group_id = openstack_networking_secgroup_v2.ssh.id
}

resource "openstack_compute_instance_v2" "app" {
  name            = "app-01"
  image_id        = var.image_id
  flavor_id       = var.flavor_id
  key_pair        = var.key_pair
  security_groups = [openstack_networking_secgroup_v2.ssh.name]

  network {
    name = openstack_networking_network_v2.app.name
  }

  # The subnet and router attachment must exist before the instance boots.
  depends_on = [openstack_networking_router_interface_v2.app]

  metadata = {
    managed-by = "opentofu"
  }
}

output "instance_id" {
  description = "Nova server UUID; read its addresses with: openstack server show <id> -c addresses."
  value       = openstack_compute_instance_v2.app.id
}
