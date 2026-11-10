---
name: cloud-init-template
description: Complete qm sequence to build a cloud-init VM template from a distribution cloud image and deploy clones from it
keywords: qm create, import-from, cloudinit, qm template, qm clone, sshkeys, ipconfig0, cicustom, snippets
---

# Template: Cloud-Init VM Template and Clones

## Usage

Run on one PVE node as root after Phase A discovery ([../safe-change-protocol.md](../safe-change-protocol.md)). Replace every `<...>`. Commands and options are those of https://pve.proxmox.com/pve-docs/qm.1.html (section "Cloud-Init Support", docs 9.2.13). The image URL is an example: take the current one from the distribution's cloud-image page and verify its checksum.

## Variables

```bash
TPL=9000                       # free VMID for the template (check: qm list; pct list)
STORE=local-lvm                # storage with content "images" (pvesm status)
BRIDGE=vmbr0
IMG=/var/lib/vz/template/cloud/<distro>-cloudimg-amd64.img
```

## 1. Fetch and check the image (on the node)

```bash
mkdir -p /var/lib/vz/template/cloud
wget -O "$IMG" <official-cloud-image-url>
sha256sum "$IMG"               # compare with the distribution's published SHA256SUMS
```

## 2. Build the template

```bash
qm create $TPL --name tpl-<distro> --memory 2048 --cores 2 \
  --net0 virtio,bridge=$BRIDGE --scsihw virtio-scsi-pci --ostype l26 --agent enabled=1
qm set $TPL --scsi0 $STORE:0,import-from=$IMG       # import the image as the boot disk
qm set $TPL --ide2 $STORE:cloudinit                 # cloud-init drive
qm set $TPL --boot order=scsi0
qm set $TPL --serial0 socket --vga serial0          # revert to default VGA if the image does not boot
qm set $TPL --ciuser <admin-user> --ciupgrade 1
qm cloudinit dump $TPL user                         # review generated user-data
qm template $TPL
```

`qm template` makes the base disks read-only. A template cannot be deleted while linked clones exist.

## 3. Deploy a clone

```bash
NEW=<new-vmid>
qm clone $TPL $NEW --name <hostname>                # linked clone by default from a template
# qm clone $TPL $NEW --name <hostname> --full 1 --storage <id>   # independent full copy
qm set $NEW --sshkeys /root/keys/<user>.pub         # one OpenSSH public key per line
qm set $NEW --ipconfig0 ip=10.0.10.123/24,gw=10.0.10.1
# or: qm set $NEW --ipconfig0 ip=dhcp
qm set $NEW --nameserver 10.0.10.1 --searchdomain <domain>
qm disk resize $NEW scsi0 +18G                      # optional: grow before first boot (shrinking unsupported)
qm start $NEW
```

## 4. Optional custom user-data (snippets)

```bash
pvesm set local --content iso,vztmpl,backup,snippets   # keep the storage's existing content types in this list
cp user.yaml /var/lib/vz/snippets/user.yaml
qm set $NEW --cicustom "user=local:snippets/user.yaml"
qm cloudinit update $NEW
```

The snippet storage must exist on every node the VM can migrate to, otherwise the VM will not start there.

## Verification

```bash
qm config $NEW | grep -E 'ide2|ipconfig0|sshkeys|ciuser'
qm guest cmd $NEW ping                              # after the agent is installed in the guest
ssh <admin-user>@10.0.10.123 'cloud-init status --wait'
```

## Rollback

Clone wrong: `qm stop $NEW` then (after the user's go) `qm destroy $NEW --purge 1`. The template is untouched.

## Not verified

- Whether the image already contains `qemu-guest-agent` depends on the distribution image.
