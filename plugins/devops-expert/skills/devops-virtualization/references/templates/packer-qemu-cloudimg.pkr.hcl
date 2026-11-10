# Packer (HCL2) - golden qcow2 from a distribution cloud image, NoCloud seed on a CD.
# Options verified against the QEMU plugin docs v1.1.8
# (https://developer.hashicorp.com/packer/integrations/hashicorp/qemu/latest/components/builder/qemu),
# read 2026-11-10. Packer is BSL 1.1 (IBM); internal use is allowed by the grant, see packer-images.md.
#
# Usage:
#   packer init . && packer fmt -check . && packer validate -var-file=lab.pkrvars.hcl .
#   packer build -var-file=lab.pkrvars.hcl .          # after review and the user's go
# lab.pkrvars.hcl (outside Git if it names paths/keys):
#   cloud_image_url      = "<official cloud image URL>"
#   cloud_image_checksum = "file:<official SHA256SUMS URL>"
#   ssh_private_key_file = "/path/to/build-key"       # its PUBLIC key is in seed/user-data
# seed/ holds user-data and meta-data (sibling templates nocloud-user-data.yaml / nocloud-meta-data.yaml,
# copied under those exact names). The user in user-data must equal ssh_username below.
# Output: output-golden/golden.qcow2. Needs xorriso or mkisofs on the build host for the CD.

packer {
  required_plugins {
    qemu = {
      version = ">= 1.1.8"
      source  = "github.com/hashicorp/qemu"
    }
  }
}

variable "cloud_image_url" {
  type = string
}

variable "cloud_image_checksum" {
  type = string # e.g. "file:https://.../SHA256SUMS" or "sha256:<hex>"
}

variable "ssh_username" {
  type    = string
  default = "builder"
}

variable "ssh_private_key_file" {
  type = string
}

source "qemu" "golden" {
  iso_url          = var.cloud_image_url
  iso_checksum     = var.cloud_image_checksum
  disk_image       = true # iso_url is a bootable image, not an installer
  format           = "qcow2"
  disk_size        = "20G"
  disk_interface   = "virtio"
  net_device       = "virtio-net"
  disk_discard     = "unmap"
  accelerator      = "kvm"
  cpus             = 2
  memory           = 2048
  headless         = true
  vm_name          = "golden.qcow2"
  output_directory = "output-golden"

  cd_files = ["seed/user-data", "seed/meta-data"]
  cd_label = "cidata" # NoCloud seed label

  communicator         = "ssh"
  ssh_username         = var.ssh_username
  ssh_private_key_file = var.ssh_private_key_file
  ssh_timeout          = "10m"
  shutdown_command     = "sudo shutdown -P now"
}

build {
  sources = ["source.qemu.golden"]

  provisioner "shell" {
    inline = [
      "cloud-init status --wait",
      "sudo apt-get update && sudo apt-get -y upgrade", # Debian family example; adapt the package manager
      "sudo cloud-init clean --logs --machine-id",      # seal: next boot is a first boot
    ]
  }
}
