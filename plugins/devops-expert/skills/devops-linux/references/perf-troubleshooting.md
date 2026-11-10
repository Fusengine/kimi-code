---
name: perf-troubleshooting
description: USE-method triage of CPU, memory, disk and network on a Linux host, plus full-disk, OOM and failed-service playbooks
when-to-use: "The server is slow", load spikes, OOM kills, disk full, a service keeps failing
keywords: USE method, utilization, saturation, errors, vmstat, mpstat, pidstat, iostat, sar, PSI, free, df, lsof, ss, OOM
priority: high
related: kernel-sysctl-limits.md, storage-lvm-fs.md, systemd-hardening-resources.md
---

# Performance and Troubleshooting

**Load when:** any "slow / down / full / killed" report on a host. Everything here is read-only;
fixes are proposed with the measurement that justifies them. Fleet dashboards and alerting are
**devops-observability**; incident process is **devops-sre-ops**; deep network captures are **devops-networking**.

Sources (read 2026-11-10): https://www.brendangregg.com/usemethod.html,
https://www.brendangregg.com/USEmethod/use-linux.html, https://docs.kernel.org/accounting/psi.html,
man7.org pages for `vmstat(8)`, `mpstat(1)`, `pidstat(1)`, `iostat(1)`, `sar(1)`, `free(1)`, `df(1)`,
`ss(8)`, `lsof(8)`, `dmesg(1)`. sysstat (`mpstat`, `pidstat`, `iostat`, `sar`) may need installing.

---

## The USE Method

"For every resource, check utilization, saturation, and errors." - Utilization: time busy (%).
Saturation: queued work it cannot service. Errors: count of error events. Walk every resource
before blaming one; a 100%-utilized resource with no saturation is not necessarily the problem.

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| CPU | `mpstat -P ALL 1` (all but idle/iowait); `pidstat 1` per process | `vmstat 1` column `r` > CPU count; `/proc/pressure/cpu` | `journalctl -k` MCE lines |
| Memory | `free -m` (use `available`, not `free`) | `vmstat 1` `si`/`so` > 0 (swapping); `/proc/pressure/memory`; OOM kills | `journalctl -k` for hardware errors |
| Disk | `iostat -xz 1` `%util` (misleading on SSD/RAID that serve in parallel) | `iostat -xz 1` `aqu-sz`, high await; `/proc/pressure/io` | `journalctl -k` I/O errors; SMART (devops-storage-backup) |
| Network | `sar -n DEV 1` throughput vs link speed | `sar -n EDEV 1` drops; `ss -s`; TCP retransmits (`sar -n ETCP 1`) | `ip -s link` errors |
| Software limits | fds (`/proc/<pid>/limits`), `TasksMax=`, cgroup memory | throttling in `systemd-cgtop` | `EMFILE`/`ENOMEM` in the journal |

PSI: "some" = share of time at least some tasks stalled on the resource; "full" = all non-idle tasks stalled.

---

## First 60 Seconds (read-only)

```bash
uptime                                  # load averages trend
journalctl -k -b --no-pager | tail -30  # OOM, I/O errors, segfaults
vmstat 1 5                              # r, b, si/so, wa, st (steal = noisy neighbour on a VM)
mpstat -P ALL 1 3                       # one hot CPU = single-threaded bottleneck
pidstat 1 3                             # who is using CPU
iostat -xz 1 3                          # per-device await, aqu-sz, %util
free -m; cat /proc/pressure/{cpu,memory,io}
sar -n DEV 1 3; ss -s
systemctl --failed
```

---

## Playbooks

**Disk full**
```bash
df -hT; df -i                                    # space vs inodes
du -xh --max-depth=1 /var | sort -h | tail       # -x stays on one filesystem
lsof +L1                                         # deleted-but-open files still holding space
journalctl --disk-usage
```
Fix: rotate/vacuum logs, restart the process holding deleted files, grow the volume
([storage-lvm-fs.md](storage-lvm-fs.md)). Never delete files under `/var/lib/<db>` to free space.

**OOM kills**
```bash
journalctl -k -b | grep -iE 'out of memory|oom-kill|killed process'
systemctl show <unit> -p MemoryMax -p MemoryHigh
```
Decide: leak (memory grows until kill) -> app fix; legitimate peak -> `MemoryHigh=`/`MemoryMax=` per unit,
more RAM, or swap ([systemd-hardening-resources.md](systemd-hardening-resources.md)).

**Service keeps failing**
```bash
systemctl status <unit> --no-pager -l
journalctl -u <unit> -b -n 200 --no-pager
systemctl show <unit> -p NRestarts -p ExecMainStatus -p Result
```
Then check MAC denials ([selinux-apparmor.md](selinux-apparmor.md)) and sandbox directives.

**What listens where**
```bash
ss -tlnp                       # TCP listeners with owning process
ss -tunp state established     # live connections
```

---

## Risky "Fixes" to Refuse

| Action | Why not |
|--------|---------|
| `kill -9` on a database or the heaviest process | data loss, hides the cause - capture state first (`pidstat`, journal) |
| `echo 3 > /proc/sys/vm/drop_caches` | kernel docs: not a cache control and can cause performance problems |
| Deleting logs with `rm` while the writer holds them | space not freed; use `journalctl --vacuum-*` or logrotate |
| Rebooting before collecting evidence | the cause disappears with it - save the journal and the commands above first |

---

## Verification

Re-run the same measurement that showed the problem (same command, same interval) and report before/after numbers.

## Pitfalls

- Reading `free` "free" column as available memory - Linux uses spare RAM for cache
- `%util` 100% on an NVMe/RAID device - may still have headroom; look at await and queue
- Load average counts tasks in uninterruptible I/O wait - high load with idle CPU = I/O or NFS stall

## Not verified

- The `du -x`, `ss state established`, `systemctl show -p NRestarts` details were not re-read at a man page this session
- Brendan Gregg's 60-second checklist article itself was not fetched; the command list follows the USE Linux checklist page
- Load average including uninterruptible tasks: general Linux knowledge, not sourced this session
