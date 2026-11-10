---
name: virt-customize-builder
description: The libguestfs route for images - virt-customize (edit a disk image offline), virt-sysprep (unconfigure before cloning), virt-builder (fetch and customise a template) - and when it beats Packer
when-to-use: Adding packages, keys, files or a hostname to an existing image without booting a build VM, sealing a template, or reading logs from a guest that cannot boot
keywords: virt-customize, virt-sysprep, virt-builder, libguestfs, --install, --run-command, --ssh-inject, --firstboot, --selinux-relabel, --dry-run, golden image, offline image edit
priority: medium
related: packer-images.md, cloud-init-nocloud.md, qemu-img-formats.md, guest-agent.md
---

# virt-customize, virt-sysprep, virt-builder

**Load when:** a small, scriptable change to a disk image is enough. Packer ([packer-images.md](packer-images.md)) is for multi-step, repeatable pipelines that boot a VM; these tools edit the image through a temporary libguestfs appliance.

Docs: https://libguestfs.org/virt-customize.1.html , virt-sysprep.1.html , virt-builder.1.html (read 2026-11-10).

## Safety rules (from the man pages)

- "The virtual machine must be shut down before you use virt-customize"; using it on live VMs or concurrently with other disk-editing tools "can be dangerous, potentially causing disk corruption".
- Both virt-customize and virt-sysprep "modify the guest or disk image in place": "If you want to preserve the existing contents of the guest, you must snapshot, copy or clone the disk first."
- Run as a normal user where possible ("we'd generally recommend that you don't [run as root]").
- `-n` / `--dry-run` (virt-customize and virt-sysprep) "runs the operation, but throws away any changes to the disk at the end": a real rehearsal. Run it first, then run for real.

Working copy pattern:

```bash
cp --reflink=auto base.qcow2 work.qcow2          # or a thin overlay: see qemu-img-formats.md (check the backing-format flag letter)
virt-customize -a work.qcow2 -n --install qemu-guest-agent    # rehearsal, changes discarded
virt-customize -a work.qcow2 --install qemu-guest-agent       # real run on the copy
```

## virt-customize

Verified options (synopsis): `-a disk.img` or `-d domain`, `--network|--no-network` (package installs need network access from the appliance), `--install PKG,PKG`, `--uninstall`, `--update`, `--run-command 'CMD'`, `--run SCRIPT`, `--copy-in LOCAL:REMOTEDIR`, `--upload FILE:DEST`, `--write FILE:CONTENT`, `--append-line FILE:LINE`, `--mkdir`, `--edit FILE:EXPR`, `--hostname`, `--timezone`, `--ssh-inject USER[:SELECTOR]`, `--root-password SELECTOR`, `--password USER:SELECTOR`, `--firstboot SCRIPT`, `--firstboot-command`, `--firstboot-install PKG`, `--truncate FILE`, `--scrub FILE`, `--selinux-relabel` (RHEL-family guests, avoids unlabelled files), `--inject-qemu-ga METHOD` (Windows).

```bash
virt-customize -a work.qcow2 \
  --install qemu-guest-agent,openssh-server \
  --ssh-inject <admin-user>:file:/path/to/admin.pub \
  --hostname golden \
  --run-command 'systemctl enable qemu-guest-agent'
```

`--ssh-inject USER:file:FILENAME` reads the key from a `.pub` file; `USER:string:KEY_STRING` passes it inline; the user "must exist already in the guest" (create it first with `--run-command 'useradd ...'`, or inject for `root`). Password selectors are defined in the man page ("ROOT PASSWORD"/"USER PASSWORDS" sections, not read here): prefer a file-based selector so secrets do not appear in process lists or shell history.

## virt-sysprep (seal a template)

"Reset or unconfigure a virtual machine so that clones can be made from it": removes SSH host keys, persistent network MAC configuration, machine-id and more (does not work on Windows). `virt-sysprep --list-operations` shows the operations; `--operations OPERATIONS`/`--enable` select them; `-n` previews.

```bash
virt-sysprep --list-operations | head -40
virt-sysprep -a work.qcow2 -n                     # dry run, then run for real on the copy
```
For cloud-init images prefer `cloud-init clean --logs --machine-id` inside the guest ([cloud-init-nocloud.md](cloud-init-nocloud.md)); use virt-sysprep when the guest cannot boot or has no cloud-init.

## virt-builder (template + customisation in one step)

`virt-builder -l` lists available OS templates (`--list-format short|long|json`); `virt-builder --notes <os-version>` prints image-specific notes; `-o DISK`, `--size SIZE`, `--format raw|qcow2`, plus the same customisation options as virt-customize; the tool downloads signed templates (`--check-signature` / `--no-check-signature`: keep signature checking on).

```bash
virt-builder --list | head
virt-builder <os-version> -o web01.qcow2 --format qcow2 --size 20G \
  --install qemu-guest-agent --ssh-inject root:file:/path/to/admin.pub --hostname web01
```
Treat the downloaded template as untrusted input like any cloud image: verify signatures, then import with [libvirt-domains.md](libvirt-domains.md).

## Decision

| Case | Use |
|------|-----|
| Add a few packages/keys/files to an image, no pipeline | virt-customize |
| Prepare a clone source from a non-cloud-init guest | virt-sysprep |
| Fresh lab image from a known OS template | virt-builder |
| Repeatable builds with tests, provisioning stages, CI | Packer |

## Verification

```bash
qemu-img check work.qcow2
virt-ls -a work.qcow2 /etc/ssh | head      # libguestfs read-only listing (virt-ls: not verified, see below)
# boot a throwaway guest from work.qcow2 and run the application checks
```

## Pitfalls

- Editing an image attached to a running guest (see the WARNING above).
- Network disabled in the appliance: `--install` fails; check `--network`.
- SELinux labels: virt-builder relabels by default (`--no-selinux-relabel` disables it); for virt-customize the `--selinux-relabel` option exists, check its man page before editing RHEL-family images.
- A secret baked into an image is a secret in every clone: inject keys at first boot (cloud-init) instead.

## Not verified

- Password selector syntax (sections not read).
- `virt-ls` (named from libguestfs knowledge, man page not fetched).
- Which OS templates `virt-builder --list` offers today.
- The `--install` behaviour on each distribution (package manager detection is libguestfs's; not tested).
