---
name: cloud-init-debug
description: Debugging cloud-init - status and extended_status, the stage services and logs, ds-identify, schema validation, blocked boots, collecting logs, and the safe way to re-run
when-to-use: A guest ignored its user-data, never finished booting config, cannot be logged into, or cloud-init reports degraded or error
keywords: cloud-init status --long, extended_status, boot_status_code, ds-identify.log, cloud-init.log, cloud-init-output.log, collect-logs, analyze blame, clean, single, schema
priority: medium
related: cloud-init-nocloud.md, libvirt-domains.md, incus-core.md
---

# Debugging cloud-init

**Load when:** first-boot configuration did not happen as written. Work read-only first; re-running cloud-init is destructive on a live guest.

## Triage in order (https://docs.cloud-init.io/en/latest/howto/debugging.html)

1. **Did it run?**
   ```bash
   cloud-init status --long                      # read extended_status, boot_status_code, errors, recoverable_errors
   cat /run/cloud-init/ds-identify.log           # platform detection: why a datasource was or was not chosen
   systemctl status cloud-init-local.service cloud-init-network.service cloud-config.service cloud-final.service
   ```
   Statuses: `not started`, `running`, `done`, `error - done`, `error - running`, `degraded done`, `degraded running`, `disabled`. `status` exits 1 on crash, 2 for recoverable errors, 0 clean.
2. **Is the data valid?** `cloud-init schema --system --annotate` (on the guest, validates the user-data it received) or `cloud-init schema -c file.yaml --annotate` (a file). The two most common faults: broken YAML, first line not `#cloud-config`.
3. **What did it do?** `/var/log/cloud-init.log` and `/var/log/cloud-init-output.log`; read the lines before each error. The processed config is in `/var/lib/cloud/instance/cloud-config.txt` and `user-data.txt`.
4. **What was it given?** `cloud-init query --all` / `cloud-init query instance_id` shows instance-data; for NoCloud verify the seed drive label is exactly `CIDATA` and the files are in its root, or that the HTTP seed URL ends with `/`.

## Cannot log in

- Read the serial console / `virsh console <dom>` (needs a serial console in the guest) for cloud-init errors.
- Create a user with password access in user-data for the lab, log in on the console (works only if the users module ran).
- Mount the disk image offline and read the logs: `virt-customize` guidance in [virt-customize-builder.md](virt-customize-builder.md) (guest off).

## Boot never finishes

```bash
systemctl --failed ; dmesg -T | grep -i -e warning -e error -e fatal -e exception
systemctl list-jobs --after           # a blocking unit ordered before cloud-final.service
pstree <PID>                          # a bootcmd/runcmd child that never returns blocks completion
```
A `runcmd` that waits on `cloud-init status --wait` deadlocks itself.

## Performance of boot

`cloud-init analyze blame` (most costly operations), `analyze show` (time-ordered per stage), `analyze boot` (kernel vs cloud-init timestamps).

## Collect for a bug report

`cloud-init collect-logs` tars `/var/log/cloud-init*.log`, `/run/cloud-init`, user-data and package version. Redact before sharing: user-data can hold secrets.

## Re-running (destructive on a live guest)

| ACTION | EFFECT | PROOF | WAIT-FOR-GO |
|--------|--------|-------|-------------|
| `cloud-init clean --logs --reboot` | Removes artifacts and logs so the next boot re-runs every stage; keys and passwords may be overwritten ("must never be done on a production system") | Guest is a lab clone or a snapshot exists | Required |
| `cloud-init single --name cc_ssh --frequency always` | Runs one module again from cached instance-data | Module identified from the logs | Required |
| `cloud-init --all-stages` by hand | Not stable outside the init system | Do not use | n/a |

## Verification

After a fix and a clean boot: `cloud-init status --wait --long` shows `done` with empty `errors`, and the intended effect is observable (user, package, IP address).

## Pitfalls

- Editing user-data on a booted guest and rebooting does nothing: per-instance modules already ran.
- The image has no cloud-init (or a different datasource list): `ds-identify.log` says so.
- Network config applied late can make SSH appear "down" for the first seconds after boot.

## Sources

https://docs.cloud-init.io/en/latest/howto/debugging.html , .../howto/status.html , .../howto/debug_user_data.html , .../howto/rerun_cloud_init.html , .../reference/cli.html (read 2026-11-10; cloud-init 26.2).

## Not verified

- `virsh console` availability depends on a serial console configured in the guest (general libvirt practice).
- Exit codes beyond those in the CLI page for older cloud-init versions in long-lived images.
