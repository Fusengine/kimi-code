---
name: kernel-sysctl-limits
description: Persistent kernel tunables via sysctl.d, process limits via systemd and pam_limits, kernel log reading
when-to-use: Tuning memory/VM writeback, raising inotify or file-descriptor limits, "too many open files"
keywords: sysctl, sysctl.d, systemd-sysctl, vm.swappiness, vm.dirty_ratio, inotify, LimitNOFILE, limits.conf, pam_limits
priority: medium
related: systemd-hardening-resources.md, perf-troubleshooting.md
---

# Kernel Parameters and Limits

**Load when:** changing any `/proc/sys` value, or a process hits a resource limit.
Network-stack sysctls (forwarding, rp_filter, conntrack) belong to **devops-networking**.

Sources (read 2026-11-10): https://man7.org/linux/man-pages/man8/sysctl.8.html,
https://www.freedesktop.org/software/systemd/man/latest/sysctl.d.html,
https://docs.kernel.org/admin-guide/sysctl/vm.html, https://docs.kernel.org/admin-guide/sysctl/kernel.html,
https://man7.org/linux/man-pages/man7/inotify.7.html, https://man7.org/linux/man-pages/man5/limits.conf.5.html,
https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html (`LimitNOFILE=`).

## Decision Rules

| Need | Where |
|------|-------|
| Persistent kernel tunable | `/etc/sysctl.d/<NN>-<topic>.conf`, applied at boot by `systemd-sysctl.service` |
| Test a value now (lost at reboot) | `sysctl -w key=value` |
| Limit for a **service** | `LimitNOFILE=` / `LimitNPROC=` in the unit (drop-in) - limits.conf does not apply to services |
| Limit for **interactive logins** | `/etc/security/limits.d/*.conf` (pam_limits: login sessions only) |
| Memory/CPU cap for a service | cgroup settings, see [systemd-hardening-resources.md](systemd-hardening-resources.md) |

Never tune by folklore: record the metric that motivated the change (see [perf-troubleshooting.md](perf-troubleshooting.md))
and re-measure after.

## sysctl.d Precedence

- Directories: `/etc/sysctl.d/` > `/run/sysctl.d/` > `/usr/local/lib/sysctl.d/` > `/usr/lib/sysctl.d/`; a file in `/etc`
  replaces a vendor file **with the same name**.
- All files are then sorted by name across directories; for the same key, **the lexicographically latest file wins**
  (the opposite of sshd, where the first value wins). Prefix files with a number: `90-local-vm.conf`.
- Only `*.conf` files are read.

```text
# /etc/sysctl.d/90-local-vm.conf  - owner: ops, reason: <ticket>, source: docs.kernel.org/admin-guide/sysctl/vm.html
vm.swappiness = 10
fs.inotify.max_user_watches = 524288
```

## Commonly Touched Keys

| Key | Meaning (kernel docs) | Note |
|-----|-----------------------|------|
| `vm.swappiness` | relative IO cost of swap vs page cache, 0-200, default 60 | lower = prefer dropping page cache; workload-dependent |
| `vm.dirty_ratio` | % of available memory at which a writing process must flush itself | lower to cut write stalls on big-RAM hosts |
| `vm.dirty_background_ratio` | % at which background flusher threads start | keep below `dirty_ratio` |
| `fs.inotify.max_user_watches` | max inotify watches per real UID | file watchers, IDE servers, log shippers |
| `kernel.panic` | 0 = loop forever on panic, >0 = reboot after N seconds | servers usually want auto-reboot |

```bash
sysctl vm.swappiness                  # read
sysctl -w vm.swappiness=10            # runtime only
sysctl -p /etc/sysctl.d/90-local-vm.conf   # load one file, prints what it set
sysctl --system                       # reload all directories in precedence order
```

## File-Descriptor Limits

systemd.exec advises against raising `LimitNOFILE=` blindly: raising the soft limit above 1024 breaks
programs using `select(2)` (fds above 1023); the hard limit already defaults to 524288 per the current
man page, and applications that do not use `select()` should raise their own soft limit to the hard one.
Set it in the unit only when the application cannot.

```ini
# systemctl edit myapp.service
[Service]
LimitNOFILE=65536
```

```bash
cat /proc/$(systemctl show -p MainPID --value myapp)/limits   # effective limits of the running process
ulimit -n                                                     # current shell only
```

## Kernel Messages

```bash
journalctl -k -b --no-pager | tail -100      # kernel ring buffer via journald
dmesg -T | tail -50                          # human timestamps (can drift after suspend)
```

## Destructive / Risky Operations

| Change | Effect | Rule |
|--------|--------|------|
| `kernel.panic`, `vm.overcommit_*`, `kernel.sysrq` | alters crash/memory semantics host-wide | propose with the measured reason, wait for the go |
| `vm.drop_caches` | drops page cache - performance cliff, never a fix | do not use as a routine |
| Wrong value in `/etc/sysctl.d/` | applied at every boot | test with `sysctl -w` first, then persist |

## Verification

```bash
sysctl --system 2>&1 | grep -i -E 'error|invalid'   # parse errors
systemctl status systemd-sysctl.service --no-pager
sysctl vm.swappiness fs.inotify.max_user_watches     # value in effect
```

## Pitfalls

- Editing `/usr/lib/sysctl.d/` - overwritten by the next package update
- Two local files setting the same key - the later file name wins silently
- Raising `nofile` in limits.conf for a daemon - ignored for systemd services

## Not verified

- Whether each distro still ships `/etc/sysctl.conf` (prefer `sysctl.d` regardless)
- `vm.overcommit_*` and `kernel.sysrq` semantics were not re-read this session - read vm.html / kernel.html before changing
