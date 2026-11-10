---
name: packer-images
description: Building VM images with Packer HCL2 - required_plugins, the QEMU builder (cloud image + NoCloud seed), the Proxmox builders (clone and ISO), shell provisioners, build safety, the BSL license status and when virt-customize is the simpler tool
when-to-use: Producing a repeatable golden image or Proxmox template from a pipeline, instead of hand-built templates
keywords: packer, HCL2, pkr.hcl, packer init, packer validate, packer build, qemu builder, proxmox-clone, proxmox-iso, disk_image, cd_files, cd_label, provisioner shell, BSL
priority: high
related: cloud-init-nocloud.md, virt-customize-builder.md, qemu-img-formats.md, guest-agent.md
---

# Packer Image Builds

**Load when:** an image must be rebuilt on demand (patch cycles, base-image pipelines). One-off tweaks to an existing image: [virt-customize-builder.md](virt-customize-builder.md). Terraform/OpenTofu provisioning of the result: `devops-iac`; Proxmox template details: `devops-proxmox`; CI wiring: `devops-cicd`.

## Versions and license (verified 2026-11-10)

| Item | Value | Source |
|------|-------|--------|
| Packer | 1.16.2 (2026-10-22); 1.15.4 also maintained, 1.13 EOL 2026-07-24 | https://endoflife.date/api/hashicorp-packer.json |
| License | Business Source License 1.1; licensor IBM; Licensed Work: Packer 1.10.0 or later; change date four years after each version's publication, change license MPL 2.0 | https://raw.githubusercontent.com/hashicorp/packer/main/LICENSE |
| Use grant | Production use allowed unless you offer Packer to third parties on a hosted/embedded basis to compete with IBM's paid versions; "using the Licensed Work for internal purposes within an organization is not considered a competitive offering" | same file |
| QEMU plugin | `github.com/hashicorp/qemu` v1.1.8 | https://developer.hashicorp.com/packer/integrations/hashicorp/qemu |
| Proxmox plugin | `github.com/hashicorp/proxmox` v1.2.4 | https://developer.hashicorp.com/packer/integrations/hashicorp/proxmox |

For internal image building the quoted grant covers normal use; a legal question beyond the file text goes to the owner, not an agent opinion.

## Workflow

```bash
packer init .                         # downloads the plugins declared in required_plugins (-upgrade to move versions)
packer fmt -check . ; packer validate .          # syntax and config (-syntax-only skips datasources)
PACKER_LOG=1 packer build -var-file=lab.pkrvars.hcl .      # -on-error=cleanup (default) | abort | ask | run-cleanup-provisioner
```

`packer init` reads files ending `pkr.hcl`; variable files should end `.pkrvars.hcl` or `.auto.pkrvars.hcl` (excluded from init). `-force` overwrites a previous artifact; `-on-error=abort` keeps the failed VM for inspection (clean it up afterwards).

## Choosing a path

| Need | Tool |
|------|------|
| Start from a distribution cloud image, install packages, seal | Packer QEMU with `disk_image = true` ([templates/packer-qemu-cloudimg.pkr.hcl](templates/packer-qemu-cloudimg.pkr.hcl)) |
| Start from an installer ISO (kickstart/preseed/autoinstall) | QEMU or `proxmox-iso` with `boot_command` and `http_directory`/`cd_files`; long, fragile - prefer the cloud image path |
| Result must be a Proxmox template | `proxmox-clone` from an existing cloud-init template ([templates/packer-proxmox-clone.pkr.hcl](templates/packer-proxmox-clone.pkr.hcl)) or `proxmox-iso` |
| Only add packages / keys / a file to an image | `virt-customize` (no VM boot needed) |

## QEMU builder essentials (plugin 1.1.8 docs)

- `disk_image = true`: `iso_url` is a bootable image; Packer clones it (or uses it as backing file with `use_backing_file = true` and `format = "qcow2"`), resizes to `disk_size`, boots it.
- `cd_files = [...]` + `cd_label = "cidata"` attach a NoCloud seed CD ("a CD ... attached as the second CD device"); needs `xorriso`, `mkisofs`, `hdiutil` or `oscdimg` on the build host. `cd_content = { "user-data" = ..., "meta-data" = ... }` writes files from strings.
- `accelerator = "kvm"`, `headless = true` on servers, `format = "qcow2"`, `disk_compression`, `skip_compaction`, `disk_discard = "unmap"`, `disk_detect_zeroes`, `net_device`/`disk_interface = "virtio"`, `efi_boot` + `machine_type = "q35"` for UEFI, `net_bridge` (the bridge must already exist).
- SSH: `communicator = "ssh"`, `ssh_username`, `ssh_private_key_file` (put the matching public key in the NoCloud user-data) or `ssh_password` for throwaway builds, `ssh_timeout`, `shutdown_command`.
- Output lands in `output_directory`. `packer build -force` "forces a builder to run when artifacts from a previous build prevent a build from running" and, for builders that support it, removes the previous artifacts: it is a deletion, treat it as destructive.

## Proxmox builders (plugin 1.2.4 docs)

- Required: `proxmox_url` (`https://<host>:8006/api2/json`), `username` (with `!tokenid` for token auth) and either `token` or `password` (env: `PROXMOX_URL`, `PROXMOX_TOKEN`, `PROXMOX_PASSWORD`), `node`.
- `proxmox-clone`: `clone_vm` or `clone_vm_id`, `full_clone` (default true), `vm_name`, `vm_id`, `template_name`, `cloud_init` + `cloud_init_storage_pool` (adds an empty cloud-init drive after conversion), `qemu_agent` (default true: the guest agent must run in the clone), `task_timeout` (default 1 minute: raise for big clones), `network_adapters { bridge, model }`, `insecure_skip_tls_verify` (lab only).
- Token scope: least privilege token and role per `devops-proxmox` (api-access); never a password in the template or Git.

## Provisioners

`provisioner "shell" { inline = [...] }` or `script`/`scripts`, `environment_vars`, `valid_exit_codes`, `execute_command` (default `chmod +x {{.Path}}; . {{.EnvVarFile}} && {{.Path}}`). Keep provisioning minimal and deterministic: install the guest agent, apply updates, remove build-only keys, run `cloud-init clean --logs --machine-id` last ([cloud-init-nocloud.md](cloud-init-nocloud.md)).

## Verification

```bash
packer validate . && packer build ... && qemu-img info output/<vm_name>      # artifact exists, format qcow2
qemu-img check output/<vm_name>
# boot a throwaway guest from the artifact (virt-install --import --cloud-init ...), cloud-init status --wait --long
# Proxmox: qm config <template-vmid> shows template: 1 and the ide cloudinit drive
```

## Pitfalls

- No `required_plugins` or `packer init` skipped: "unknown builder".
- Packer cannot SSH in: wrong user, key not in the seed, NIC naming, or `ssh_timeout` too short.
- Secrets in `*.pkr.hcl` or `-var` on the command line end up in Git or process lists: use `PROXMOX_TOKEN` env or a vars file outside Git.
- `-force` and `-on-error=abort` leave artifacts/VMs behind; clean deliberately.
- Image content freshness: rebuild on a schedule (CVE patch cycle); an unpatched golden image is the common failure.

## Sources

https://developer.hashicorp.com/packer/docs/commands/{init,build,validate,fmt} , https://developer.hashicorp.com/packer/docs/provisioners/shell , https://developer.hashicorp.com/packer/integrations/hashicorp/qemu/latest/components/builder/qemu , https://developer.hashicorp.com/packer/integrations/hashicorp/proxmox/latest/components/builder/clone and /iso , https://github.com/hashicorp/packer-plugin-proxmox , https://github.com/hashicorp/packer-plugin-qemu (read 2026-11-10).

## Not verified

- Whether an OSS fork of Packer exists and its status (not searched).
- `proxmox-iso` option details beyond the `boot_iso` block (page skimmed for the clone path).
- That the QEMU `cd_content` + `cd_label` seed is accepted by every distribution's cloud image without extra datasource config (NoCloud rule: label `CIDATA`; matching is case-insensitive in practice, not verified).
- Plugin latest versions drift: re-read the integration pages before pinning.
