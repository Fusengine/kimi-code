# Rollback checklist (snapshots.html, backups.html, read 2026-11-10)

- [ ] Decide which: ZFS snapshot (GUI System > Snapshots, or boot menu option 8), VM snapshot, config history revert, or full config restore
- [ ] ZFS: activate the known-good snapshot and reboot; at boot press Space, option 8, option 2 to cycle, ENTER
- [ ] Config history revert restarts no service: reboot or re-apply for a clean state
- [ ] Config restore on different hardware: fix interface assignments when prompted; console settings are excluded by default
- [ ] Proof: GUI reachable, gateways up, new sessions pass, HA roles correct
- [ ] Record what failed before retrying (never the same change twice)
