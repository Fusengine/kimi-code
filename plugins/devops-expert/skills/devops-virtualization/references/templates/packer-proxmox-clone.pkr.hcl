# Packer (HCL2) - new Proxmox VE template cloned from an existing cloud-init template.
# Options verified against the Proxmox plugin docs v1.2.4
# (https://developer.hashicorp.com/packer/integrations/hashicorp/proxmox/latest/components/builder/clone),
# read 2026-11-10.
#
# Credentials: never in this file. Export before building (token from devops-proxmox api-access template):
#   export PROXMOX_URL="https://<pve>:8006/api2/json"
#   export PROXMOX_USERNAME="<user>@<realm>!<tokenid>"     # hashicorp docs: username includes !tokenid for tokens
#   export PROXMOX_TOKEN="<secret>"                        # set in the shell only, never echo or commit
# Usage:
#   packer init . && packer validate . && packer build .   # build after review and the user's go
# The source template (clone_vm) must have qemu-guest-agent installed (qemu_agent defaults to true) and a
# reachable SSH user/key for the provisioner.

packer {
  required_plugins {
    proxmox = {
      version = ">= 1.2.2"
      source  = "github.com/hashicorp/proxmox"
    }
  }
}

variable "node" {
  type    = string
  default = "pve"
}

variable "base_template" {
  type    = string
  default = "tpl-debian-cloud" # name of the existing cloud-init template to clone
}

variable "ssh_username" {
  type    = string
  default = "builder"
}

variable "ssh_private_key_file" {
  type = string
}

source "proxmox-clone" "golden" {
  node         = var.node
  clone_vm     = var.base_template
  full_clone   = true
  vm_name      = "packer-golden-build"
  template_name = "tpl-golden"
  template_description = "Built by Packer from ${var.base_template}"

  cores   = 2
  memory  = 2048
  os      = "l26"
  scsi_controller = "virtio-scsi-single"
  qemu_agent = true

  network_adapters {
    bridge = "vmbr0"
    model  = "virtio"
  }

  cloud_init              = true # add an empty cloud-init drive to the final template
  cloud_init_storage_pool = "local-lvm"

  task_timeout = "10m" # default is 1 minute

  ssh_username         = var.ssh_username
  ssh_private_key_file = var.ssh_private_key_file

  # Lab only: skip when the node has a trusted certificate.
  # insecure_skip_tls_verify = true
}

build {
  sources = ["source.proxmox-clone.golden"]

  provisioner "shell" {
    inline = [
      "cloud-init status --wait",
      "sudo cloud-init clean --logs --machine-id",
    ]
  }
}
