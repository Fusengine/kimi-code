---
name: cloud-init-nocloud
description: cloud-init with the NoCloud datasource - user-data, meta-data, vendor-data and network-config (v2) files, the CIDATA seed drive, kernel-command-line and HTTP seeds, per-instance semantics, and how each hypervisor path delivers them
when-to-use: Initialising a cloud image outside a cloud (libvirt, QEMU, Packer, Incus), writing user-data or network-config, or preparing a golden image for cloning
keywords: cloud-init, NoCloud, CIDATA, user-data, meta-data, vendor-data, network-config, netplan v2, seedfrom, instance-id, cloud-init clean, schema
priority: high
related: cloud-init-debug.md, libvirt-domains.md, packer-images.md, incus-core.md, templates/virt-install-cloud-image.md
---

# cloud-init: NoCloud Datasource

**Load when:** a Linux cloud image must configure itself (users, keys, packages, network) at first boot without a cloud API. Proxmox cloud-init drives (`qm set --ide2 ...:cloudinit`) are covered by `devops-proxmox`; OpenStack metadata by `devops-openstack`.

Version verified: cloud-init 26.2 (docs https://docs.cloud-init.io/en/latest/ report "26.2"; release 2026-07-29, https://github.com/canonical/cloud-init/releases/tag/26.2).

## The four inputs

| File | Purpose | Notes |
|------|---------|-------|
| `meta-data` | Cloud-provided facts; YAML | Must contain `instance-id`; `local-hostname` optional |
| `user-data` | What the owner wants configured | First line `#cloud-config` for cloud-config YAML |
| `vendor-data` | Defaults from the platform operator; user-data can override | Optional; Incus recommends vendor-data in profiles, user-data per instance |
| `network-config` | Network setup; v1 or v2 | If absent, cloud-init brings up an interface with DHCP (typical) |

Files and templates: [user-data](templates/nocloud-user-data.yaml), [meta-data](templates/nocloud-meta-data.yaml), [network-config](templates/nocloud-network-config.yaml).

## How the datasource is found (all verified, NoCloud page)

1. **Labelled drive**: a vfat or iso9660 filesystem labelled `CIDATA` with the files in its root. This is what `virt-install --cloud-init` creates, what Packer builds with `cd_files` + `cd_label = "cidata"`, and what any ISO tool can produce.
2. **Local filesystem**: system config `datasource: NoCloud: meta-data: |, user-data: |` or `seedfrom: file:///path/` in `/etc/cloud/cloud.cfg.d/`.
3. **HTTP(S)/FTP(S)**: kernel command line / DMI serial `ds=nocloud;s=https://host/path/` (trailing slash required) or system config `seedfrom: https://host/path/`. cloud-init fetches `user-data`, `meta-data`, `vendor-data`, `network-config` from that base; missing files are skipped.

Prefer the labelled drive for hypervisor-built guests (no network needed at first boot), HTTP seeds for fleets with a config server over a trusted network.

## Per-instance semantics

Most modules run once per `instance-id`. A clone with the same `instance-id` is treated as the same instance, so first-boot modules are skipped: change `instance-id` per guest (and regenerate the SSH host keys through cloud-init defaults). The Incus docs confirm: cloud-init actions "run only once on the first start" and a reboot does not re-trigger them.

## Network config v2 (https://docs.cloud-init.io/en/latest/reference/network-config-format-v2.html)

Subset of Netplan v2 (`ethernets`, `bonds`, `bridges`, `vlans`). Use `routes: - to: default via: <gw>`; `gateway4`/`gateway6` are marked deprecated. Match by `macaddress` (quoted, lowercase) or `name` glob; `set-name` needs a `macaddress` match. On non-Netplan systems stay inside the documented subset; only the `networkd` renderer is supported for rendering v2.

## Golden image preparation

```bash
# inside the template guest, shut down afterwards
cloud-init clean --logs --machine-id      # removes /var/lib/cloud artifacts and logs, resets /etc/machine-id
```
`clean` "simulates a clean instance" so cloud-init re-runs all stages on next boot; `--machine-id` is documented as best practice when cloning a golden image; `--seed` also removes the seed directory when it must be regenerated; `--configs` removes generated config. Offline alternative: `virt-sysprep` ([virt-customize-builder.md](virt-customize-builder.md)). Do this on the template only, never on a guest that must keep its identity (it can overwrite SSH keys and passwords, per the cloud-init re-run page).

## Validation (before every boot)

```bash
cloud-init schema -c user-data.yaml --annotate                      # cloud-config
cloud-init schema -t network-config -c network-config.yaml          # network config schema type (the "network:" key handling is not verified)
python3 -c 'import yaml,sys; yaml.safe_load(open(sys.argv[1]))' meta-data.yaml
```

## Delivery per platform

| Platform | Delivery |
|----------|----------|
| libvirt/virt-install | `--cloud-init user-data=...,meta-data=...,network-config=...` (ISO CD-ROM, first boot only) |
| Packer QEMU | `cd_files = [...]` + `cd_label = "cidata"` ([packer-images.md](packer-images.md)) |
| Incus | `cloud-init.user-data`, `cloud-init.vendor-data`, `cloud-init.network-config` keys on profile/instance; use `images:<distro>/<release>/cloud` images ([incus-core.md](incus-core.md)) |
| Proxmox | built-in cloud-init drive, see `devops-proxmox` |

## Verification

```bash
cloud-init status --wait --long       # exit 0 ok, 2 = finished with recoverable errors, 1 = crash
cloud-init query --list-keys ; cloud-init query instance_id
```

## Pitfalls

- First line not exactly `#cloud-config`: the file is treated as something else; the schema check catches it.
- Unquoted MAC addresses in YAML may parse as integers: quote them.
- Passwords in user-data are readable by anything that can read the seed or `/var/lib/cloud/instance/user-data.txt`; use keys.
- Reusing the same `instance-id` across clones.

## Sources

https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html , https://docs.cloud-init.io/en/latest/reference/network-config-format-v2.html , https://docs.cloud-init.io/en/latest/reference/cli.html , https://docs.cloud-init.io/en/latest/howto/rerun_cloud_init.html , https://docs.cloud-init.io/en/latest/reference/modules.html (read 2026-11-10).

## Not verified

- That per-instance modules are skipped for a clone with the same `instance-id` (general cloud-init design; the NoCloud page only requires the key).
- `cloud-init schema -t network-config` accepting the file with its top-level `network:` key.
- Distribution-specific cloud image defaults (default user name, preinstalled `qemu-guest-agent`, growpart).
