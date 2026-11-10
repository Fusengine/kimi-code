---
name: upgrade-rollback
description: OPNsense release line, cadence, editions, minor and major upgrades, snapshots, opnsense-update and bootstrap
when-to-use: Planning or running a firmware update, a major upgrade or a rollback
keywords: 26.7, FreeBSD 15.1, opnsense-update, opnsense-bootstrap, snapshots, ZFS, boot environment, console option 12
priority: high
related: safe-opnsense-changes.md, backup-restore-api.md
---

# Release Line, Upgrades, Snapshots

## Release facts (read 2026-11-10)

| Fact | Value | Source |
|------|-------|--------|
| Cadence | Two majors a year, minor updates about every two weeks; version = year.month, minors add a third number | updates.html |
| Community Edition latest series | 26.7 "Xenial Xenops"; latest patch listed 26.7.8 (2026-10-30); previous series 26.1 | releases.html, CE_26.7.html |
| FreeBSD base of 26.7 | FreeBSD 15.1 (also OpenSSL 3.5, OpenVPN 2.7, PHP 8.5, Python 3.13) | CE_26.7.html |
| Business Edition | Separate series list: latest 26.10, then 26.4, 25.10 | releases.html |
| Release type setting | System > Firmware > Settings: Production (default, keep) or Development | updates.html |
| 26.7 changes that affect operations | firewall rules default to MVC/API; interface assignments and gateway groups via MVC/API; outbound NAT to source NAT migration assistant; Kea DDNS, custom options, dynamic prefix delegation | CE_26.7.html |
| 26.7.8 notes | IKEv1 deprecation in strongSwan is more visible; certificate storage limited to a single certificate per entry; ML-DSA OpenSSH host keys regenerate once | CE_26.7.html |

Edition differences beyond the series numbering (support, features, price) were not read: see "Not verified".

## Minor updates
System > Firmware > Status > Check for updates, then install (updates.html). Read the changelog first; services may restart.

## Major upgrades (high risk)
- Recommended over VGA or serial console; installed offline, no web or SSH meanwhile (updates.html).
- Console menu option 12 asks for the newest version or the next major (type e.g. "19.1"); the box downloads sets, reboots, installs, reboots again.
- Before: config backup off-box, snapshot (below), read the series release page for removed features, check plugins and their migrations.

```
ACTION   console menu option 12, target major <NN.N>
EFFECT   offline upgrade, two reboots, no GUI/SSH during it; firewall down for the duration
PROOF    GUI reachable, version shown, gateways up, a new session through each rule path works
ROLLBACK console boot menu option 8 to the known-good snapshot (ZFS) or VM snapshot restore
WAIT-FOR-GO
```

## Snapshots / boot environments
- Require ZFS; UFS cannot. Create in System > Snapshots (name e.g. `known-good`) before the risky change. Activate the snapshot in the GUI then reboot, or at boot press Space, option 8 (Boot Environments), option 2 to cycle, ENTER to boot (snapshots.html).
- On a virtual install the docs point to hypervisor VM snapshots instead.

## CLI tools (opnsense/update README)
- `opnsense-update(8)`: single CLI for packages plus base and kernel sets, signature-verified; major version upgrade supported.
- `opnsense-bootstrap(8)`: reinstalls a running system in place (factory-reset class, can restore file consistency), or turns a stock FreeBSD into OPNsense: example in README is a FreeBSD 15.1-RELEASE image with `sh ./opnsense-bootstrap.sh.in -r 26.7`. It can wipe the config directory but does not by default. Treat as destructive: ACTION/EFFECT/PROOF/ROLLBACK format.
- `opnsense-revert`: reverts a package to its state in a given OPNsense release, as long as the package mirrors still carry that package (update README). Flags were not read: do not state any flag.

## Not verified
- `opnsense-revert` syntax and scope; `opnsense-update` flags.
- Community vs Business edition feature and support differences.
- HA upgrade order beyond the generic rule in ha-carp.md.

## Sources
- https://docs.opnsense.org/manual/updates.html (2026-11-10)
- https://docs.opnsense.org/releases.html (2026-11-10)
- https://docs.opnsense.org/releases/CE_26.7.html (2026-11-10)
- https://docs.opnsense.org/manual/snapshots.html (2026-11-10)
- https://docs.opnsense.org/manual/virtuals.html (2026-11-10)
- https://raw.githubusercontent.com/opnsense/update/master/README.md (2026-11-10)
