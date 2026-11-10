---
name: devops-linux
description: Use when administering a Debian/Ubuntu or RHEL-family server - systemd units, timers, journald, sandboxing and resource limits, apt/dnf and unattended upgrades, users/groups/sudo, sshd and ssh client config, partitions/LVM/filesystems/fstab, sysctl and limits, SELinux or AppArmor operation, time sync, CPU/memory/disk/network troubleshooting with the USE method, or robust bash scripts. Not for firewall/DNS/TLS/VPN (devops-networking), ZFS/Ceph/backups (devops-storage-backup), KVM/LXC (devops-virtualization), Ansible (devops-ansible), or security audits and hardening benchmarks (security-expert).
versions:
  debian: "13.7 (trixie)"
  ubuntu: "26.04.1 LTS (resolute)"
  rhel: "10.2 / 9.8"
  systemd-man-pages: "262 (freedesktop latest; shipped versions differ)"
  bash-manual: "5.3"
references:
  - references/systemd-units-journald.md
  - references/systemd-hardening-resources.md
  - references/packages-updates.md
  - references/users-sudo-ssh.md
  - references/storage-lvm-fs.md
  - references/kernel-sysctl-limits.md
  - references/selinux-apparmor.md
  - references/time-sync.md
  - references/perf-troubleshooting.md
  - references/bash-scripting.md
  - references/templates/hardened.service
  - references/templates/job.service
  - references/templates/job.timer
  - references/templates/journald-retention.conf
  - references/templates/sshd-10-hardening.conf
  - references/templates/sudoers-ops
  - references/templates/52unattended-upgrades-local
  - references/templates/dnf-automatic.conf
  - references/templates/script-skeleton.sh
related-skills:
  - devops-networking
  - devops-storage-backup
  - devops-virtualization
  - devops-ansible
  - devops-observability
  - devops-sre-ops
  - devops-secrets
  - devops-docker
---

<objective>
Covers day-2 administration of Debian/Ubuntu and RHEL-family servers: systemd
(units, drop-ins, timers, journald, sandboxing, resource control), apt/dnf and
automatic updates, users/groups/sudo, sshd and ssh client configuration,
partitions/LVM/filesystems/fstab, sysctl and limits, SELinux and AppArmor
operation, time sync, performance troubleshooting (USE method) and robust bash.
Does not cover firewall/DNS/TLS/VPN, ZFS/Ceph/backups, hypervisors, configuration
management, or security audits/benchmarks - see related skills.
</objective>

# DevOps Linux

## Agent Workflow (MANDATORY)

Before ANY change, spawn in parallel, one `Agent` call each with a `name`:

1. **explore-codebase** - Find existing units, scripts, configs in the repo
2. **research-expert** - Verify every directive/flag at the official man page for the target release
3. **mcp__fuse-browser__browser_fetch** - Fast-path read of freedesktop.org / man7.org / distro docs

On a live host: discovery (read-only) -> proposal with rollback -> owner's go -> change -> verify.
After file changes, run **sniper**.

## Overview

| Area | Debian / Ubuntu | RHEL family |
|------|-----------------|-------------|
| Packages | `apt`, `apt-mark hold`, `unattended-upgrades` | `dnf`, `dnf versionlock`, `dnf-automatic` (dnf5: `dnf5-automatic.timer`) |
| MAC | AppArmor (`aa-status`) | SELinux (`getenforce`, `semanage`) |
| Admin group (convention - read `/etc/sudoers`) | `sudo` | `wheel` |
| Services, logs, timers | systemd + journald (both) | systemd + journald (both) |

Releases verified 2026-11-10: Debian 13.7 "trixie" (https://www.debian.org/releases/),
Ubuntu 26.04.1 LTS (https://releases.ubuntu.com/), RHEL 10.2 and 9.8
(https://access.redhat.com/articles/3078). systemd man pages are read at
https://www.freedesktop.org/software/systemd/man/latest/ (systemd 262); every
directive there carries "Added in version N" - compare with `systemctl --version`.

## Critical Rules

1. **Discover before you touch** - `systemctl status`, `journalctl -u`, `cat /etc/os-release`, `systemctl --version` first; never assume the distro or systemd version
2. **Never edit vendor files** - units via `systemctl edit` drop-ins, sshd via `sshd_config.d/`, sudo via `visudo -f /etc/sudoers.d/<name>`, sysctl via `/etc/sysctl.d/`
3. **Validate before reload** - `systemd-analyze verify`, `sshd -t`, `visudo -c`, `findmnt --verify`, `sysctl -p <file>`
4. **Lock-out risk = second session open** - touching `sshd`, `sudoers`, PAM, network or firewall: keep a working root session open until the new login is proven
5. **Destructive = propose, then the owner's go** - `rm -rf`, filesystem creation, `dd`, `wipefs`, `lvremove`, `userdel -r`, `systemctl mask`, partition tools: state the exact effect and target, wait for the go
6. **Never disable SELinux/AppArmor to "fix" a denial** - read the denial, fix the label/boolean/profile
7. **Never invent a directive** - verify at the man page of the shipped version; unverified -> "I don't know"

## Reference Guide

### Concepts

| Topic | Reference | When to Consult |
|-------|-----------|-----------------|
| **Units, timers, journald** | [systemd-units-journald.md](references/systemd-units-journald.md) | Writing a service, cron -> timer, log retention |
| **Sandboxing, resources** | [systemd-hardening-resources.md](references/systemd-hardening-resources.md) | `ProtectSystem=`, `MemoryMax=`, `systemd-analyze security` |
| **Packages, updates** | [packages-updates.md](references/packages-updates.md) | apt/dnf, pinning, holds, unattended upgrades |
| **Users, sudo, SSH** | [users-sudo-ssh.md](references/users-sudo-ssh.md) | Accounts, sudoers drop-ins, sshd/ssh config |
| **Storage** | [storage-lvm-fs.md](references/storage-lvm-fs.md) | Disks, LVM grow, ext4/xfs, fstab, swap |
| **Kernel, limits** | [kernel-sysctl-limits.md](references/kernel-sysctl-limits.md) | sysctl drop-ins, `LimitNOFILE=`, limits.conf |
| **SELinux, AppArmor** | [selinux-apparmor.md](references/selinux-apparmor.md) | Denials, labels, booleans, profile modes |
| **Time sync** | [time-sync.md](references/time-sync.md) | chrony / timesyncd, clock drift |
| **Troubleshooting** | [perf-troubleshooting.md](references/perf-troubleshooting.md) | Slow host, OOM, full disk, USE method |
| **Bash** | [bash-scripting.md](references/bash-scripting.md) | Strict mode, traps, locking, shellcheck |

### Templates

| Template | When to Use |
|----------|-------------|
| [hardened.service](references/templates/hardened.service) | Long-running daemon with sandboxing |
| [job.service](references/templates/job.service) + [job.timer](references/templates/job.timer) | Replace a cron job |
| [journald-retention.conf](references/templates/journald-retention.conf) | Persistent journal with a size cap |
| [sshd-10-hardening.conf](references/templates/sshd-10-hardening.conf) | Key-only sshd drop-in |
| [sudoers-ops](references/templates/sudoers-ops) | Group-scoped sudo rules |
| [52unattended-upgrades-local](references/templates/52unattended-upgrades-local) | Debian/Ubuntu automatic security updates |
| [dnf-automatic.conf](references/templates/dnf-automatic.conf) | RHEL-family automatic security updates |
| [script-skeleton.sh](references/templates/script-skeleton.sh) | Any new operational script |

## Quick Reference

```bash
# Discovery (read-only)
cat /etc/os-release; systemctl --version | head -1; uptime
systemctl --failed; journalctl -p err -b --no-pager | tail -50
df -hT; df -i; lsblk -f; free -h

# Unit change with validation
systemctl edit myapp.service            # drop-in, then:
systemd-analyze verify /etc/systemd/system/myapp.service
systemctl restart myapp.service && systemctl status myapp.service

# sshd change with lock-out guard (keep current session open)
sshd -t && systemctl reload ssh         # Debian/Ubuntu unit name; RHEL: sshd
```

## Best Practices

### DO
- Ship every change as a drop-in file with a comment naming its owner and source URL
- Prefer timers over cron: logs in the journal, `Persistent=`, dependency ordering
- Score services with `systemd-analyze security <unit>` and tighten iteratively
- Grow storage online (`lvextend -r`), verify with `df -h` and `findmnt`

### DON'T
- Run `systemctl daemon-reload` and walk away - check `systemctl status` and the journal
- Use `setenforce 0` / `aa-complain` as a permanent state
- Put a `.` in a `/etc/sudoers.d/` file name - sudo skips it silently
- Plan on shrinking XFS - only shrinking inside the last allocation group is implemented; treat it as grow-only
