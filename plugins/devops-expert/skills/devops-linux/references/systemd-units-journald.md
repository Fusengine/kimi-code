---
name: systemd-units-journald
description: systemd service units, drop-ins, timers replacing cron, and journald retention
when-to-use: Writing or overriding a service, converting a cron job, reading or capping logs
keywords: systemd, unit, drop-in, systemctl edit, timer, OnCalendar, Persistent, journalctl, journald.conf
priority: high
related: systemd-hardening-resources.md, bash-scripting.md
---

# systemd Units, Timers and journald

**Load when:** creating a service, overriding a packaged unit, replacing cron, or sizing the journal.

Sources (read 2026-11-10, systemd 262 pages): https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html,
`systemd.service.html`, `systemd.timer.html`, `systemd.time.html`, `systemctl.html`, `journalctl.html`,
`journald.conf.html`, `systemd-analyze.html`. Shipped versions are older: check `systemctl --version`
against the "Added in version N" line of each directive.

---

## Decision Rules

| Need | Do |
|------|-----|
| Change a packaged unit | `systemctl edit <unit>` (drop-in under `/etc/systemd/system/<unit>.d/`) - never edit `/usr/lib/systemd/system/` |
| Replace the whole unit | `systemctl edit --full <unit>` - only when a drop-in cannot express it |
| Undo local overrides | `systemctl revert <unit>` (removes drop-ins and `/etc` copies) |
| Periodic job | `.timer` + `.service` pair, not cron ([job.timer](templates/job.timer)) |
| One-off delayed/ad-hoc job | `systemd-run --on-calendar=... <cmd>` or `systemd-run --unit=name --wait <cmd>` |
| Stop a unit from ever starting | `systemctl mask` - destructive to availability, see below |

---

## Service Essentials

| Directive | Section | Notes |
|-----------|---------|-------|
| `Type=` | `[Service]` | `simple`/`exec` for foreground daemons, `oneshot` for jobs, `notify` if the daemon supports sd_notify |
| `ExecStart=` / `ExecStartPre=` | `[Service]` | absolute paths; a failing `ExecStartPre=` aborts the start |
| `Restart=` / `RestartSec=` | `[Service]` | `on-failure` for daemons; never on `oneshot` jobs driven by a timer |
| `StartLimitIntervalSec=` / `StartLimitBurst=` | `[Unit]` | stop restart storms |
| `After=` / `Wants=` / `Requires=` | `[Unit]` | ordering (`After=`) is separate from dependency (`Wants=`/`Requires=`) |
| `OnFailure=` | `[Unit]` | trigger an alert unit on failure |
| `EnvironmentFile=` | `[Service]` | `-/path` prefix = optional file; keep secrets out of the unit (see devops-secrets) |

To clear a list-type setting in a drop-in, assign it empty first (`ExecStart=` then `ExecStart=/new/cmd`).

---

## Timers (cron replacement)

| Directive | Effect |
|-----------|--------|
| `OnCalendar=` | wall-clock schedule; `daily` = `*-*-* 00:00:00`, `weekly` = `Mon *-*-* 00:00:00` |
| `Persistent=true` | runs immediately at boot if a run was missed while powered off (only with `OnCalendar=`) |
| `RandomizedDelaySec=` | spreads load across a fleet; `FixedRandomDelay=true` keeps the offset stable per host |
| `AccuracySec=` | coalescing window (default 1 min) |
| `OnBootSec=` / `OnUnitActiveSec=` | monotonic schedules relative to boot / last activation |
| `Unit=` | defaults to the `.service` with the same name |

```bash
systemd-analyze calendar 'Mon..Fri *-*-* 02:30:00'   # normalise + next elapse
systemctl enable --now job.timer                     # enable the TIMER, not the service
systemctl list-timers --all                          # next/last run
systemctl clean --what=state job.timer               # drop the Persistent= stamp
```

---

## journald

| Setting (`/etc/systemd/journald.conf.d/*.conf`) | Effect |
|-------------------------------------------------|--------|
| `Storage=` | `persistent` / `volatile` / `auto` / `none`; the default is set at compile time - check before assuming |
| `SystemMaxUse=` / `SystemKeepFree=` | disk cap for `/var/log/journal` |
| `MaxRetentionSec=` | age cap |
| `RateLimitIntervalSec=` / `RateLimitBurst=` | per-service flood control |
| `ForwardToSyslog=` | forward to a syslog daemon if one is used |

```bash
journalctl -u myapp -b -p warning --since "1 hour ago" --no-pager
journalctl -k -b -1               # kernel log of the previous boot
journalctl --list-boots
journalctl --disk-usage
journalctl --vacuum-size=1G       # deletes archived journal files - propose first
systemd-analyze cat-config systemd/journald.conf   # effective merged config
```

---

## Destructive Operations

| Command | Exact effect | Rule |
|---------|--------------|------|
| `systemctl mask <unit>` | links the unit to `/dev/null`; blocks manual start, enablement and dependency activation; `--runtime` = until reboot, `--now` also stops it | propose with the reason, wait for the go; undo with `unmask` |
| `systemctl revert <unit>` | deletes local drop-ins and `/etc` unit copies | show `systemctl cat <unit>` first |
| `journalctl --vacuum-*` | deletes archived journal files | confirm logs are shipped elsewhere first |

---

## Verification

```bash
systemd-analyze verify /etc/systemd/system/myapp.service   # syntax + referenced units
systemctl daemon-reload && systemctl restart myapp
systemctl is-active myapp && systemctl status myapp --no-pager
systemctl cat myapp            # shows the unit plus every drop-in in effect
systemctl show myapp -p Restart -p ExecMainStatus
```

## Pitfalls

- Enabling the `.service` of a timer job instead of the `.timer` - the job runs once at boot only
- Forgetting `daemon-reload` after writing files by hand (`systemctl edit` does it for you)
- `Restart=always` on a crash-looping daemon without `StartLimit*` - fills the journal
