---
name: packages-updates
description: apt and dnf package management, pinning/holds, history rollback, automatic security updates, reboot detection
when-to-use: Installing/upgrading packages, freezing a version, enabling unattended upgrades, deciding on a reboot
keywords: apt, apt-mark, apt_preferences, unattended-upgrades, dnf, versionlock, dnf-automatic, needs-restarting, reboot-required
priority: high
related: systemd-units-journald.md
---

# Packages and Updates

**Load when:** any package install/upgrade, version freeze, automatic update setup, or "does it need a reboot?".

Sources (read 2026-11-10): https://manpages.debian.org/trixie/apt/apt-get.8.en.html,
https://manpages.debian.org/trixie/apt/apt-mark.8.en.html, https://manpages.debian.org/trixie/apt/apt_preferences.5.en.html,
https://manpages.debian.org/trixie/unattended-upgrades/unattended-upgrade.8.en.html,
https://documentation.ubuntu.com/server/how-to/software/automatic-updates/,
https://raw.githubusercontent.com/mvo5/unattended-upgrades/master/data/50unattended-upgrades.Debian,
https://dnf.readthedocs.io/en/latest/command_ref.html, https://dnf.readthedocs.io/en/latest/automatic.html,
https://dnf5.readthedocs.io/en/latest/dnf5_plugins/automatic.8.html,
https://dnf-plugins-core.readthedocs.io/en/latest/versionlock.html, https://dnf-plugins-core.readthedocs.io/en/latest/needs_restarting.html.

## Side by Side

| Task | Debian / Ubuntu | RHEL family |
|------|-----------------|-------------|
| Refresh metadata | `apt-get update` | `dnf makecache` (or implicit) |
| List pending | `apt list --upgradeable` | `dnf check-update` (exit 100 = updates available) |
| Simulate | `apt-get -s upgrade` | `dnf upgrade --assumeno` |
| Security only | unattended-upgrades origins (below) | `dnf upgrade --security` |
| Install | `apt-get install -y pkg` | `dnf install -y pkg` |
| Who owns a file | `dpkg -S /path` | `rpm -qf /path` |
| Files of a package | `dpkg -L pkg` | `rpm -ql pkg` |
| Freeze version | `apt-mark hold pkg` / `apt-mark showhold` | `dnf versionlock add pkg` (plugin) |
| Undo a transaction | no native undo - reinstall the previous version explicitly | `dnf history` then `dnf history undo <id>` |
| Reboot needed? | `test -f /var/run/reboot-required` | `needs-restarting -r` (exit 1 = reboot needed) |

Check the dnf generation first: `dnf --version`. dnf5 renames parts of the tooling
(`dnf5-automatic.timer`, vendor config `/usr/share/dnf5/dnf5-plugins/automatic.conf`).

## Decision Rules

- Production upgrade window: list -> simulate -> snapshot/backup (devops-storage-backup) -> upgrade -> verify services -> reboot if flagged.
- Pin with `apt_preferences` (`Pin-Priority:`) when you need "prefer this origin"; use `apt-mark hold` when you need "never move this package".
- Never mix distro releases in `sources.list` to get one newer package - use backports or a vendor repo with a pin.
- Automatic updates: security only, automatic reboot off by default; turn reboot on only with a maintenance window and monitoring.

## Pinning (Debian/Ubuntu)

```text
# /etc/apt/preferences.d/pin-perl
Package: perl
Pin: version 5.32*
Pin-Priority: 1001
```

Priority > 1000 allows downgrades to the pinned version. Inspect with `apt-cache policy perl`.

## Automatic Security Updates

**Debian/Ubuntu** - `unattended-upgrades` driven by `apt-daily.timer` and `apt-daily-upgrade.timer`.
Enable via `/etc/apt/apt.conf.d/20auto-upgrades`:

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

Local policy goes in a separate file so package upgrades do not conflict with your edits:
[52unattended-upgrades-local](templates/52unattended-upgrades-local) (keys: `Origins-Pattern`,
`Package-Blacklist`, `Automatic-Reboot`, `Automatic-Reboot-Time`, `Mail`, `Remove-Unused-Dependencies`).

```bash
unattended-upgrade --dry-run --debug          # simulate with the current policy
less /var/log/unattended-upgrades/unattended-upgrades.log
```

**RHEL family** - `dnf-automatic` reads `/etc/dnf/automatic.conf` ([dnf-automatic.conf](templates/dnf-automatic.conf)):
`upgrade_type = security`, `apply_updates = yes`, `reboot = never|when-changed|when-needed`.

```bash
systemctl enable --now dnf-automatic.timer             # behaves as automatic.conf says
systemctl enable --now dnf-automatic-notifyonly.timer  # report only
```

## Destructive Operations

| Command | Exact effect | Rule |
|---------|--------------|------|
| `apt-get purge pkg` / `dnf remove pkg` | removes the package and may remove dependants (apt purge also deletes its config) | simulate first (`-s` / `--assumeno`), show the removal list, wait for the go |
| `apt-get autoremove` | removes packages marked as automatically installed and no longer needed | show the list; old kernels are a fallback |
| `dnf history undo <id>` | reverses a whole transaction | show `dnf history info <id>` first |

## Verification

```bash
apt-get -s upgrade | tail -5 ; apt-mark showhold
dnf check-update; echo "exit=$?"; dnf versionlock list
systemctl list-timers 'apt-daily*' 'dnf*automatic*'
systemctl --failed                                    # services broken by the upgrade
```

## Pitfalls

- `Automatic-Reboot "true"` on a single-node service without a window - unplanned downtime
- `dnf check-update` exit code 100 treated as failure in scripts
- Editing `50unattended-upgrades` directly - conflicts on package upgrade; use a `52...-local` file

## Not verified

- `dpkg -S`/`dpkg -L`/`rpm -qf`/`rpm -ql` were not re-read at a man page this session (standard queries, check `--help` on the host)
- Which dnf generation RHEL 10 ships (docs.redhat.com returned Access Denied) - run `dnf --version`
- Whether `needs-restarting` is installed by default on RHEL 9/10 (it comes from dnf-plugins-core / dnf-utils)
