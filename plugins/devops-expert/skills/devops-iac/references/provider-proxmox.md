---
name: provider-proxmox
description: Which Proxmox VE provider to use (bpg/proxmox vs Telmate), authentication and least privilege, and a VM cloned from a cloud-init template
when-to-use: Managing Proxmox VMs, containers, storage or SDN with OpenTofu/Terraform, or migrating between Proxmox providers
keywords: bpg/proxmox, Telmate, proxmox_virtual_environment_vm, proxmox_cloned_vm, api_token, ssh, sudoers, clone, initialization, cloud-init
priority: high
related: state-surgery.md, layout-providers-lock.md, modules-variables.md
---

# Proxmox VE provider

**Load when:** a Proxmox guest, template clone, file or network object is declared in HCL. Platform behaviour (clusters, storage, HA, backups, cloud-init template creation) is `devops-proxmox`; the API user/token itself is `devops-proxmox/references/api-access.md`.

## Which provider (registry facts, 2026-11-10)

| Provider | Latest at registry | Maintainer / status | Verdict |
|----------|--------------------|---------------------|---------|
| `bpg/proxmox` | 0.121.0, published 2026-11-09 | BPG Labs (individual-run, not affiliated with Proxmox Server Solutions); targets PVE 9.x, PVE 8.x supported with limits, 7.x unsupported; Terraform and OpenTofu both documented | **Use this.** Still 0.x: minors may break |
| `Telmate/proxmox` | 3.0.2-rc10 (2026-08-30); last non-RC listed 2.9.14 | Community (registry owner ggongaware); all 3.x entries are release candidates; README lists known limitations (disk size mismatch, failed-task noise on update, LXC needs `rootfs`) | Existing stacks only; plan a migration |
| `danitso/proxmox` | registry entry exists | bpg's README says upstream maintenance stopped in 2021 and bpg forked it | Do not use |

Other forks exist on the registry (e.g. `Terraform-for-Proxmox`, `TheGameProfi`, `lucian-tx`): not evaluated; do not adopt without reading their repository activity. Maintainer status beyond what the registry and READMEs state is **not verified**.

Docs: https://bpg.sh/docs (mirrored in the repository `docs/` folder). The Terraform and OpenTofu registries serve the same releases.

## Authentication and privileges

```hcl
provider "proxmox" {
  endpoint  = var.pve_endpoint            # https://pve.example.internal:8006/
  api_token = var.pve_api_token           # "user@realm!tokenid=<uuid>" from the environment, never the repo
  # ssh { username = "terraform" agent = true }   # only if a resource needs SSH
}
```

- Order of precedence: API token (recommended), auth ticket, username/password. Environment variables such as `PROXMOX_VE_USERNAME`/`PROXMOX_VE_PASSWORD` exist; for tokens read the Argument Reference for the exact name.
- Requires TLS 1.3 on the API endpoint (`min_tls` allows older); `insecure = true` only for lab self-signed certificates.
- SSH is optional: needed for snippets and some file uploads. With a token, set the SSH username; the sudoers rule shown in the docs is `terraform ALL=(root) NOPASSWD: /usr/sbin/pvesm apiinfo`. **Never grant sudo on all of `qm` or `pvesm`**: the provider docs state both are root-equivalent (`qm set --args`, `--hookscript`, `pvesm export`).
- The docs' sample `Terraform` role lists many privileges and says it is likely too permissive for PVE 9. Start from the minimal role in `devops-proxmox` (`pveum role add ... --privs`, pool-scoped ACL, privilege-separated token with expiry) and add privileges until plans pass; keep `SDN.Audit` or `SDN.Use` to avoid "interface not found" on network reads.
- The token secret is shown once; keep it in `devops-secrets`. Rotation (`pveum user token modify ... --regenerate 1`) cuts every consumer at once.

## Resources you will use

| Need | Resource | Notes |
|------|----------|-------|
| VM from a cloud-init template | `proxmox_virtual_environment_vm` with `clone { vm_id = ... }` | Legacy (SDKv2) resource, still maintained. Template: [templates/proxmox-vm-cloudinit.tf](templates/proxmox-vm-cloudinit.tf) |
| VM clone managed as a delta | `proxmox_cloned_vm` | Newer short-prefix resource: `clone = { source_vm_id, full, target_datastore, source_node_name }`; `network`/`disk` as maps; migrating from the legacy resource recreates the VM (migration guide) |
| Image download to a node | `proxmox_virtual_environment_download_file` (`content_type = "import"`) | File must be renamed `*.qcow2` for import disks |
| Cloud-init snippets | `proxmox_virtual_environment_file` | Needs SSH |
| LXC | `proxmox_virtual_environment_container` | Same SSH/privilege notes |

Both resource families ship in one binary; the Plugin Framework migration of the VM resource is a prerequisite for provider 1.0 (README), so expect the VM schema to change before 1.0.

## Pitfalls

- `agent.enabled` defaults to false; when true and the guest agent is absent, refresh waits up to the agent `timeout` (default 15m). Use `wait_for_ip { disabled = true }` only when you accept empty IP attributes.
- Cloning: if you change any attribute of an inherited disk, restate every non-default attribute (`size`, `discard`, `cache`, `aio`) or the schema defaults override the source values.
- Cross-node clone with non-shared datastores clones to the source node first, then migrates; set `clone.datastore_id` when the datastore name does not exist on the target node.
- `started = true` needs a bootable disk; set `stop_on_destroy = true` or destroying a running VM without an agent fails.
- A cloud-init template is a Proxmox object created outside HCL (`devops-proxmox`, `devops-virtualization` for Packer); never let the provider destroy the template: `prevent_destroy` on its resource if managed, data source lookup otherwise.
- Replacing a VM (`-/+`) discards guest disks: read plan reasons (`plan-apply-protocol.md`).

## Migration Telmate to bpg

Resource types and schemas differ; a rename is impossible. Per VM: `state rm` the old address, write the bpg resource, `import` it (`state-surgery.md`), plan to zero changes. Do it one VM at a time with a state backup; propose, then go.

## Verification

```bash
tofu providers | grep -i proxmox
tofu plan -out=tfplan -detailed-exitcode        # after adopting a VM: exit 0
pvesh get /nodes/<node>/qemu/<vmid>/config      # platform side (devops-proxmox)
```

## Sources

- https://registry.terraform.io/v1/providers/bpg/proxmox , .../Telmate/proxmox , https://registry.terraform.io/v2/providers?filter%5Bname%5D=proxmox
- https://raw.githubusercontent.com/bpg/terraform-provider-proxmox/main/README.md , .../docs/index.md , .../docs/resources/virtual_environment_vm.md
- https://raw.githubusercontent.com/Telmate/terraform-provider-proxmox/master/README.md
- Context7 `/bpg/terraform-provider-proxmox` (clone, cloned_vm migration guide, sudoers, role)

## Not verified

- The `import` ID format for `proxmox_virtual_environment_vm` (read the resource page's Import section; commonly `node/vmid` but unconfirmed).
- Environment variable name for the API token; exact minimal privilege set per resource.
- Whether `danitso/proxmox` and the other forks are abandoned today (only bpg's README statement is quoted).
- Context7 indexes provider v0.118.1; the registry shows 0.121.0.
