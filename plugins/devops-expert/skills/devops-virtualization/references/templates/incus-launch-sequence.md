---
name: incus-launch-sequence
description: Ordered Incus sequence - initialise, storage pool, bridge, profile with cloud-init, launch a container and a VM, verify, snapshot, and roll back
keywords: incus admin init, incus storage create, incus network create, incus profile edit, incus init, incus launch, cloud-init, snapshot
---

# Template: Incus Host to Running Instances

## Usage

Run as root or an `incus-admin` member on a host with Incus installed (LTS 7.0.x for production; see [../incus-core.md](../incus-core.md)). Every command is from the Incus docs read on 2026-11-10. Replace `<...>`. Run the read-only block first and show its output before any change.

## 0. Read-only state

```bash
incus --version ; incus list ; incus storage list ; incus network list ; incus profile list
lsblk -f                                    # the device you plan to give to a pool must be empty and unmounted
```

## 1. Initialise (new host only)

```bash
incus admin init                            # interactive; production: pick zfs or btrfs on a dedicated device
# or review a preseed file in Git, then:  incus admin init --preseed < incus-preseed.yaml
```
Do not run `init`/`--preseed` on a host that already runs instances without a backup (preseed merges into existing entities and its rollback "might potentially fail").

## 2. Extra storage and network (optional)

```bash
incus storage create fast zfs source=/dev/<empty-device>        # DESTRUCTIVE to that device: user's go, device named
incus network create labbr0 --type=bridge ipv4.address=10.20.0.1/24 ipv4.nat=true
```

## 3. Profile

```bash
incus profile create web-base
incus profile edit web-base < incus-profile.yaml     # sibling template; set pool and network names to yours
incus profile show web-base
```

## 4. Create, configure, then start (cloud-init runs once)

```bash
# instance-config.yaml (the docs' "pass a configuration file" form; value in YAML literal style):
#   config:
#     cloud-init.user-data: |
#       #cloud-config
#       users:
#         - name: <admin-user>
#           ssh_authorized_keys:
#             - <ssh-ed25519 AAAA... public key>
incus init images:debian/12/cloud web01 --profile default --profile web-base < instance-config.yaml   # container, not started
incus config show web01 --expanded | grep -A8 cloud-init                           # confirm the data landed
incus start web01
# virtual machine variant
incus init images:debian/12/cloud vm01 --vm --profile default --profile web-base --device root,size=30GiB
incus config set vm01 security.protection.delete=true
incus start vm01
```

The VM variant takes the same `< instance-config.yaml`.

## 5. Verify

```bash
incus list ; incus exec web01 -- cloud-init status --wait --long
incus exec vm01 -- cloud-init status --wait --long       # VM needs incus-agent (present in images: images)
incus info vm01 --show-log
```

## 6. Restore point and rollback

```bash
incus snapshot create web01 pre-change
# ... change ...
incus snapshot restore web01 pre-change          # destructive to post-snapshot state: user's go
# wrong instance entirely (stopped): incus delete web01  -> user's go; clear security.protection.delete first only on their go
```

## Not verified

- That the YAML passed on stdin is merged with `--profile` flags exactly as with flags alone (docs show the file form with an image only); check `incus config show --expanded`.
- The image alias `debian/12/cloud` on the day you run it (`incus image list images: debian`).
- The pool name `default` and network `incusbr0` exist only if created by `incus admin init`.
