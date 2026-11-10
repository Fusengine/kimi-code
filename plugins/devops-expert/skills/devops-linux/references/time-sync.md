---
name: time-sync
description: Clock synchronisation with chrony or systemd-timesyncd, drift diagnosis, time zone
when-to-use: Clock skew errors (TLS, Kerberos, cluster quorum, log correlation), choosing or checking the NTP client
keywords: chrony, chronyc, tracking, sources, makestep, iburst, nts, timedatectl, set-ntp, timesync-status, systemd-timesyncd
priority: medium
related: systemd-units-journald.md
---

# Time Synchronisation

**Load when:** certificates "not yet valid", Kerberos/etcd/Ceph complaining about skew, logs out of order across hosts,
or a new host is provisioned. Serving NTP to a network (firewall, VLANs) is **devops-networking** territory.

Sources (read 2026-11-10): https://chrony-project.org/doc/latest/chrony.conf.html,
https://chrony-project.org/doc/latest/chronyc.html,
https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html.

---

## Decision Rules

| Situation | Choice |
|-----------|--------|
| Server, VM, cluster node | chrony - full NTP client/server, NTS authentication, step + slew control |
| Minimal client, no serving | systemd-timesyncd is acceptable (syncs the local clock from a remote NTP server) |
| Two clients enabled | pick one; disable the other - they fight over the clock |
| Cluster (etcd, Ceph, Corosync, Kerberos) | all nodes on the same internal sources; monitor offset |

Which daemon is present depends on the distro release and image - detect, do not assume:

```bash
timedatectl                                   # "System clock synchronized" + "NTP service"
systemctl is-active chronyd chrony systemd-timesyncd 2>/dev/null
```

---

## chrony

Key `chrony.conf` directives (verified on chrony-project.org):

| Directive | Effect |
|-----------|--------|
| `server <host> iburst` | one source; `iburst` sends a burst of 4-8 requests at start for a faster first sync |
| `pool <name> iburst` | a DNS pool of sources |
| `nts` (option on `server`/`pool`) | Network Time Security authentication |
| `makestep <threshold> <limit>` | step the clock if the offset exceeds threshold during the first `limit` updates (e.g. `makestep 1.0 3`); otherwise slew |
| `rtcsync` | keep the hardware RTC in sync from the kernel |

```text
# drop-in example (path depends on distro packaging - check "confdir"/"sourcedir" in the main chrony.conf)
server ntp1.internal.example iburst
server ntp2.internal.example iburst
makestep 1.0 3
```

```bash
chronyc tracking            # offset, frequency, stratum, leap status
chronyc sources -v          # per-source state, reachability, last sample
chronyc sourcestats         # drift statistics per source
chronyc makestep            # step NOW - see Destructive Operations
```

---

## systemd-timesyncd / timedatectl

```bash
timedatectl set-ntp true            # enable and start the first available sync service
timedatectl timesync-status         # timesyncd only: server, offset, poll interval
timedatectl show-timesync           # timesyncd properties
timedatectl set-timezone UTC        # servers: UTC simplifies log correlation
```

---

## Destructive / Risky Operations

| Command | Exact effect | Rule |
|---------|--------------|------|
| `chronyc makestep` / large `makestep` threshold | jumps the clock; timers, TOTP, DB replication and cluster leases can misbehave | on a cluster node, propose, wait for the go, one node at a time |
| `timedatectl set-time` | sets the clock manually (only with NTP off) | almost never on a server |
| Disabling the NTP client | clock drifts silently | never without a replacement |

---

## Verification

```bash
timedatectl | grep -E 'synchronized|NTP service'
chronyc tracking | grep -E 'System time|Leap status'   # offset small, "Normal"
chronyc sources -v | head -20                           # at least one '*' (selected) source
```

## Pitfalls

- chrony and systemd-timesyncd both enabled
- VM snapshots/restores jump the guest clock - allow `makestep` at start, verify after restore
- Firewall blocking UDP/123 outbound - sources show unreachable (fix in devops-networking)

## Not verified

- The chrony service unit name per distro (`chronyd.service` vs `chrony.service`) and the default client per release - detect on the host
- Drop-in directory for chrony (`confdir`/`sourcedir` usage differs per packaging)
- That systemd-timesyncd cannot serve time to other hosts (its man page describes only client sync)
