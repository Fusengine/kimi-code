# VMs cloned from an existing cloud-init template with the bpg/proxmox provider (0.121.0).
# The template VM is created outside this stack (devops-proxmox cloud-init template, or Packer).
# Arguments follow https://github.com/bpg/terraform-provider-proxmox/blob/main/docs/resources/virtual_environment_vm.md
# Needs a provider "proxmox" block (see root-module.tf). `prevent_destroy = var.protect` needs OpenTofu 1.12+;
# on Terraform replace it by a literal true/false.

terraform {
  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "~> 0.121.0"
    }
  }
}

variable "node_name" {
  type        = string
  description = "Proxmox node that hosts the VMs."
}

variable "template_vm_id" {
  type        = number
  description = "VMID of the cloud-init template to clone (must be a template with qemu-guest-agent installed when agent_enabled is true)."
}

variable "datastore_id" {
  type        = string
  description = "Datastore for the cloned disks and the cloud-init drive."
  default     = "local-lvm"
}

variable "agent_enabled" {
  type        = bool
  description = "Wait for the QEMU guest agent. When true and the agent is missing, refresh waits up to the agent timeout (15 minutes by default)."
  default     = true
}

variable "ssh_public_key" {
  type        = string
  description = "Public key injected through cloud-init (no password is set)."
}

variable "protect" {
  type        = bool
  description = "Block destruction of the VMs (true in prod)."
  default     = true
}

variable "vms" {
  type = map(object({
    vm_id   = number
    cores   = optional(number, 2)
    memory  = optional(number, 2048)
    bridge  = optional(string, "vmbr0")
    vlan_id = optional(number)
    address = string # CIDR, for example 10.20.0.11/24
    gateway = string
  }))
  description = "VMs to create, keyed by name (stable keys: renaming a key replaces the VM)."
}

variable "dns_servers" {
  type    = list(string)
  default = ["10.20.0.2"]
}

resource "proxmox_virtual_environment_vm" "this" {
  for_each = var.vms

  name      = each.key
  node_name = var.node_name
  vm_id     = each.value.vm_id
  tags      = ["opentofu"]

  clone {
    vm_id        = var.template_vm_id
    full         = true
    datastore_id = var.datastore_id
  }

  agent {
    enabled = var.agent_enabled
  }
  stop_on_destroy = !var.agent_enabled # a VM without agent cannot be shut down gracefully

  cpu {
    cores = each.value.cores
    type  = "x86-64-v2-AES"
  }

  memory {
    dedicated = each.value.memory
  }

  network_device {
    bridge  = each.value.bridge
    vlan_id = each.value.vlan_id
  }

  initialization {
    datastore_id = var.datastore_id

    dns {
      servers = var.dns_servers
    }

    ip_config {
      ipv4 {
        address = each.value.address
        gateway = each.value.gateway
      }
    }

    user_account {
      username = "ubuntu" # match the template's default user
      keys     = [trimspace(var.ssh_public_key)]
    }
  }

  lifecycle {
    prevent_destroy = var.protect
  }
}

output "vm_ids" {
  description = "Proxmox VMIDs by VM name."
  value       = { for name, vm in proxmox_virtual_environment_vm.this : name => vm.vm_id }
}
