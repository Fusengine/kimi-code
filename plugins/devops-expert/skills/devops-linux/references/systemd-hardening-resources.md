---
name: systemd-hardening-resources
description: systemd sandboxing directives and cgroup resource control for services
when-to-use: Confining a daemon, capping memory/CPU/tasks, reading systemd-analyze security output
keywords: ProtectSystem, NoNewPrivileges, DynamicUser, CapabilityBoundingSet, SystemCallFilter, MemoryMax, CPUQuota, TasksMax
priority: high
related: systemd-units-journald.md, kernel-sysctl-limits.md
---

# systemd Sandboxing and Resource Control

**Load when:** writing a new daemon unit, tightening an existing one, or a service eats the host.

Sources (read 2026-11-10): https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html,
https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html,
https://www.freedesktop.org/software/systemd/man/latest/systemd-analyze.html.
This is service confinement, not a host audit - benchmarks belong to `security-expert`.

---

## Method

1. Start from [hardened.service](templates/hardened.service).
2. `systemd-analyze security myapp.service` - exposure score per setting.
3. Restart, exercise every code path, read `journalctl -u myapp` for `EPERM`/`EACCES`/`SIGSYS`.
4. Loosen only the one directive that blocks, with a comment saying why.

Directives below appeared in the systemd version shown; RHEL 9 ships an older systemd than
RHEL 10 and Debian 13 - compare with `systemctl --version` (not verified per distro here).

---

## Sandboxing Directives (`[Service]`)

| Directive | Effect | Added in |
|-----------|--------|----------|
| `NoNewPrivileges=yes` | setuid/file caps cannot raise privileges | 187 |
| `ProtectSystem=strict` | whole FS read-only except `/dev`, `/proc`, `/sys`; open holes with `ReadWritePaths=` or `StateDirectory=` | 214 |
| `ProtectHome=yes` | `/home`, `/root`, `/run/user` empty; `read-only` / `tmpfs` variants | 214 |
| `PrivateTmp=yes` | private `/tmp` and `/var/tmp` | 209 |
| `PrivateDevices=yes` | minimal `/dev`, no raw devices | 209 |
| `ProtectKernelTunables=yes` | `/proc/sys`, `/sys` read-only | 232 |
| `ProtectKernelModules=yes` | no module loading | 232 |
| `ProtectKernelLogs=yes` | no kernel log access | 244 |
| `ProtectControlGroups=yes` | cgroup tree read-only | 232 |
| `ProtectClock=yes` | no clock changes | 245 |
| `ProtectHostname=yes` | no hostname changes | 242 |
| `RestrictNamespaces=yes` | no new namespaces | 233 |
| `RestrictRealtime=yes` | no realtime scheduling | 231 |
| `RestrictSUIDSGID=yes` | cannot create setuid/setgid files | 242 |
| `LockPersonality=yes` | locks execution domain | 235 |
| `MemoryDenyWriteExecute=yes` | no W+X memory - breaks JITs (Node, Java, LuaJIT) | 231 |
| `RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6` | socket family allow-list | 211 |
| `SystemCallArchitectures=native` | blocks foreign-ABI syscalls | 209 |
| `SystemCallFilter=@system-service` | syscall allow-list by group; list groups with `systemd-analyze syscall-filter` | - |
| `CapabilityBoundingSet=` | empty = no capabilities; `CAP_NET_BIND_SERVICE` for ports < 1024 | 229 |
| `ProtectProc=invisible` / `ProcSubset=pid` | hide other processes in `/proc` | 247 |
| `DynamicUser=yes` | transient UID; implies `ProtectSystem=strict`, `ProtectHome=read-only`, `RemoveIPC=` and a private `/tmp` unless `PrivateTmp=` is set | 232 |
| `UMask=0077` | file creation mask | 246 |

Writable state the sandbox-friendly way: `StateDirectory=myapp` (`/var/lib/myapp`),
`LogsDirectory=`, `RuntimeDirectory=` - created and owned by systemd for the service user.
Secrets: `LoadCredential=name:/path` exposes them under `$CREDENTIALS_DIRECTORY`.

Note from the man page: with `ProtectSystem=strict` plus `PrivateTmp=`, `/tmp` and `/var/tmp` stay writable;
`ReadWritePaths=` cannot make a read-only superblock writable.

---

## Resource Control (cgroup v2)

| Directive | Effect |
|-----------|--------|
| `MemoryHigh=` | throttle point - reclaim pressure before the hard limit |
| `MemoryMax=` | hard limit - OOM kill inside the unit above it |
| `MemorySwapMax=` | swap cap for the unit |
| `CPUQuota=` | e.g. `200%` = two CPUs worth |
| `CPUWeight=` / `IOWeight=` | relative share under contention |
| `TasksMax=` | process/thread cap - stops fork bombs |
| `IPAddressDeny=` / `IPAddressAllow=` | per-unit IP ACL (firewall design stays in devops-networking) |

```bash
systemctl set-property myapp.service MemoryMax=2G             # persistent drop-in
systemctl set-property --runtime myapp.service CPUQuota=50%   # until reboot
systemd-cgtop                                                 # live per-unit usage
systemd-run --scope -p MemoryMax=1G -- /usr/local/bin/heavy-task   # cap an ad-hoc command
```

---

## Verification

```bash
systemd-analyze security myapp.service     # exposure score, lower is better
systemctl show myapp -p MemoryMax -p MemoryHigh -p TasksMax
journalctl -u myapp -b --no-pager | grep -Ei 'denied|EPERM|EACCES|SIGSYS'
```

## Pitfalls

- `ProtectSystem=strict` without `StateDirectory=`/`ReadWritePaths=` - the app cannot write its data
- `MemoryDenyWriteExecute=` on a JIT runtime - instant crash, read the journal
- `MemoryMax=` without `MemoryHigh=` - abrupt OOM kills instead of gradual throttling
- `DynamicUser=` with pre-existing files owned by a fixed UID - ownership mismatch

## Not verified

- Exact systemd version shipped by each distro release (packages.debian.org was behind a challenge page)
