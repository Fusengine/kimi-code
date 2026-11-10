---
name: incus-profiles-lxd-migration
description: Incus profiles with cloud-init, instance backup and export, and migrating from LXD (lxd-to-incus), plain LXC (lxc-to-incus) and physical or foreign VMs (incus-migrate) with the gates a migration needs
when-to-use: Standardising instance configuration with profiles, moving workloads off LXD or LXC, or importing an existing machine into Incus
keywords: incus profile, cloud-init.user-data, cloud-init.vendor-data, lxd-to-incus, lxc-to-incus, incus-migrate, LXD fork, incus export, profile edit, instance_backup
priority: high
related: incus-core.md, cloud-init-nocloud.md, safe-change-protocol.md
---

# Incus Profiles and Migration

**Load when:** sharing configuration across Incus instances or moving to Incus from LXD/LXC/another hypervisor. Core CLI usage: [incus-core.md](incus-core.md).

## Profiles (https://linuxcontainers.org/incus/docs/main/profiles/)

A profile stores instance options and devices; several can apply to one instance, "applied in the order they are specified, so the last profile to specify a specific key takes precedence", and instance-specific config overrides profiles. Without `--profile`, the `default` profile applies (a NIC and the root disk; it cannot be renamed or removed). Editing a profile changes every instance using it immediately.

```bash
incus profile create web-base
incus profile edit web-base < templates/incus-profile.yaml      # full YAML (config + devices)
incus profile set web-base limits.memory=1GiB                   # single option
incus profile device add web-base eth1 nic network=labbr0       # single device: <profile> <device> <type> <key>=<value>
incus profile show web-base
incus launch images:debian/12/cloud web01 --profile default --profile web-base
incus profile add web01 web-base ; incus profile remove web01 web-base     # on an existing instance
```

Template: [templates/incus-profile.yaml](templates/incus-profile.yaml). Convention (Incus docs): vendor-data in profiles for defaults, user-data on the instance for specifics; both merge in cloud-init, and identical keys may not merge (set cloud-init merge rules then).

Cloud-init keys: `cloud-init.vendor-data`, `cloud-init.user-data`, `cloud-init.network-config` (newer images) or `user.vendor-data`, `user.user-data`, `user.network-config` (older images). The value must use YAML literal style (`|`) and start with `#cloud-config`. cloud-init runs only on first start, so create with `incus init`, set the config, then `incus start`.

Changing a shared profile is a fleet change: `incus profile show` the users (`used_by`), apply to one canary instance first (`incus profile add canary new-profile`), verify, then edit the shared one.

## Backup and export

Snapshots live in the same storage pool and are not a backup. Instance export/import and volume backup: https://linuxcontainers.org/incus/docs/main/howto/instances_backup/ (snapshot create/restore/delete, scheduled snapshots, export). Read it before choosing; backup design and restore tests are `devops-storage-backup`.

## Migrating from LXD (the fork relationship)

Incus ships `lxd-to-incus`, an in-place migration tool (news 2023-10 and 2024-04 on https://linuxcontainers.org/incus/news/). Facts read 2026-11-10 (Context7 over the Incus news pages):

| Fact | Detail |
|------|--------|
| Supported source | LXD 4.0 up to the latest 5.21 bugfix release (tested); clusters supported since Incus 0.2 |
| Handles | Ceph storage pools, OVN networks; writes a log file; takes backups of the database and OVN data |
| Binary | A static `lxd-to-incus` binary is published on GitHub for fixing bugs between Incus releases |
| Docs | The how-to page `howto/server_migrate_lxd/` returned 404 on 2026-11-10; run `lxd-to-incus --help` and read its prompts instead of relying on remembered flags |

Gate (it converts the host that holds the production instances):

```
ACTION   lxd-to-incus            (on <host>, after Incus is installed beside LXD)
EFFECT   LXD data and configuration are converted to an Incus installation on this host; LXD is no longer the manager afterwards; instances see downtime
PROOF    lxc list captured to a file; LXD version within 4.0-5.21; independent backup of every storage pool and the LXD database; free disk space checked; maintenance window agreed; test migration done on a lab clone
WAIT-FOR-GO
```
After: `incus list`, start each instance, run the application checks, keep the pre-migration backup until a restore was tested. Do not stack a second tool run on a half-migrated host: stop and read the tool's log.

## From LXC and from other machines

- **LXC to Incus on the same machine**: `lxc-to-incus` "analyzes the LXC configuration and copies the data and configuration of your existing LXC containers into new Incus containers" (https://linuxcontainers.org/incus/docs/main/howto/migrate_from_lxc/). The originals are copied, not removed by that description; verify before deleting them.
- **Physical machine, VM or foreign container**: `incus-migrate` copies a partition, disk or image into an Incus storage pool and builds an instance around it (https://linuxcontainers.org/incus/docs/main/migration/). For KVM disks you already have, convert with [qemu-img-formats.md](qemu-img-formats.md) first.
- **Between Incus servers**: `incus move` / `incus copy` with a remote ([incus-core.md](incus-core.md)).

## Verification

```bash
incus profile show web-base ; incus config show web01 --expanded | grep -E "limits|cloud-init"
incus exec web01 -- cloud-init status --wait --long
incus list ; incus info <inst> --show-log
```

## Pitfalls

- A profile option that does not apply to the instance type is silently ignored.
- `incus config show` hides profile-provided keys unless `--expanded`.
- Debian/Ubuntu packages may lag the feature release; the tool you run must match the installed Incus.

## Sources

https://linuxcontainers.org/incus/docs/main/profiles/ , .../cloud-init/ , .../migration/ , .../howto/migrate_from_lxc/ , .../howto/instances_backup/ , Context7 `/websites/linuxcontainers` (Incus news items 2023-10-07, 2023-10-28, 2023-11-27, 2024-03-26, 2024-04-04) (read 2026-11-10).

## Not verified

- Current interactive prompts, flags and the post-migration state of `lxd-to-incus` in Incus 7.x (how-to page 404; tool never run).
- Whether LXD releases newer than 5.21 are accepted as a source.
- That `lxc-to-incus` leaves the LXC originals untouched (inferred from "copies").
- Export/import command syntax in `instances_backup` (page not fully read).
