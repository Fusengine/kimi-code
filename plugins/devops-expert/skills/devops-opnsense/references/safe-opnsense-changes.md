---
name: safe-opnsense-changes
description: Lock-out-proof procedure for any OPNsense change that can cut management access or lose state
when-to-use: Before ANY change on the interface you are connected through, any restore, upgrade, HA action or API reconfigure
keywords: lock-out, anti-lockout, console, snapshot, config history, ACTION EFFECT PROOF ROLLBACK, WAIT-FOR-GO
priority: critical
related: backup-restore-api.md, upgrade-rollback.md, ha-carp.md, multiwan.md
---

# Safe OPNsense Changes

**Load when:** the change touches the path your own session uses, or loses state. Read-only inspection (GUI views, `GET` API calls, `pfctl -s ...`, logs) needs no go.

## Rules

1. **Out-of-band path first.** Know and test a console path (VGA, serial, IPMI, hypervisor console) before the change. Major upgrades run offline: "no web or SSH server is running" during them (updates.html).
2. **Rollback stated first, and it must fire without you.** Prepare one of: a config backup downloaded off the box, a ZFS snapshot (ZFS installs only), a hypervisor VM snapshot (virtual install), or the config history entry to revert to. A GUI "revert" of a config history item restarts no service; a reboot may be needed for a clean state (backups.html).
3. **Propose, then wait for the user's go.** Never apply a listed risky operation on your own initiative.
4. **Second session + new-connection test.** Established states survive many rule changes; the real test is a new connection from a new session.
5. **One change, verify, next.** Never combine interface IP + rule + gateway changes in one apply.

## Format of every risky operation

```
ACTION   <exact click path or command or API call>
EFFECT   <what stops, what is lost, who is cut>
PROOF    <new session / ping / state check that shows it worked; backup path>
ROLLBACK <console path first, then timed or snapshot rollback>
WAIT-FOR-GO
```

## Operations that need this format

| Operation | Why it can lock you out or lose state | Out-of-band and rollback to state first |
|-----------|---------------------------------------|-----------------------------------------|
| Change LAN / management interface or its IP | The address you connect to disappears | Console menu to reassign/reset interface IP (console menu option names: not verified); VM or ZFS snapshot |
| Rule change on the interface you connect through | Block rule before your pass rule drops new sessions | Console access; config history revert (restarts nothing: reboot or re-apply) |
| Disable anti-lockout rule | Docs: on LAN a hidden anti-lockout rule keeps GUI access; on other interfaces rules must be explicit (caddy how-to) | Never disable on the only management path without console |
| Restrict web GUI / SSH "Listen interfaces" | Docs warn misconfiguration "likely lead to a non-accessible web interface and/or missing ssh access" | Leave on default "all"; or bind a loopback alias reachable through the firewall |
| Change GUI TCP port / enable redirect off | GUI moves off 443 | Add the explicit rule first, test new port from a new session |
| `pfctl -d`, flushing states (Firewall > Diagnostics > States reset) | `pfctl -d` disables pf and with it NAT (nat.html); state reset drops every live connection incl. yours | Do not disable pf on a remote box; states reset only after the pass rule is proven |
| Restore a `config.xml` | Whole config replaced; interface names may not match: "you will be prompted to fix the interface assignments"; console settings excluded by default (backups.html) | Download current config first; VM snapshot; console |
| Factory reset (System > Configuration > Defaults) | Config erased, firewall shuts down (backups.html) | Off-box backup, console |
| Firmware major upgrade | Offline install, no web/SSH during it (updates.html) | Console/serial, ZFS snapshot or VM snapshot first |
| HA failover / maintenance mode / config sync | Active role moves; sync overwrites the backup; a backup node must never hold sync settings (hacarp.html) | See ha-carp.md |
| Delete a gateway, VPN instance or gateway group | Routes, rules using it and tunnels vanish; tunnels may be your admin path | Export config; keep the VPN path plus a non-VPN path |
| API apply: `POST firewall/filter/apply` (rules), `POST firewall/alias/reconfigure` or `firewall/group/reconfigure` | Reloads the live ruleset immediately; no timed rollback exists in the core API | Same as GUI apply: console path and config backup first |

## Not verified
- Console menu option numbers other than 8 (boot environments, snapshots.html) and 12 (upgrade, updates.html).
- A timed auto-revert mechanism for rule changes on OPNsense (none read in the docs today; use snapshots/backup + console).

## Sources
- https://docs.opnsense.org/manual/updates.html (read 2026-11-10)
- https://docs.opnsense.org/manual/backups.html (read 2026-11-10)
- https://docs.opnsense.org/manual/settingsmenu.html (read 2026-11-10)
- https://docs.opnsense.org/manual/nat.html (read 2026-11-10)
- https://docs.opnsense.org/manual/hacarp.html (read 2026-11-10)
- https://docs.opnsense.org/manual/how-tos/caddy.html (read 2026-11-10)
- https://docs.opnsense.org/manual/snapshots.html (read 2026-11-10)
