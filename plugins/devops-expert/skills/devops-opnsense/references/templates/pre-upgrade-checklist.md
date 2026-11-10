# Pre-upgrade checklist (updates.html, snapshots.html, read 2026-11-10)

- [ ] Release page of the target series read (removed features, plugin changes)
- [ ] Config backup downloaded and stored off-box
- [ ] ZFS snapshot named (e.g. known-good) OR VM snapshot taken
- [ ] Console/serial/IPMI access tested; maintenance window agreed
- [ ] Release type is Production
- [ ] HA: version plan for both nodes written; never leave the nodes on different versions
- [ ] Plugins up to date; third-party plugins checked
- [ ] ACTION / EFFECT / PROOF / ROLLBACK / WAIT-FOR-GO written, user's go received
