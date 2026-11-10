---
name: ha-carp
description: OPNsense high availability - CARP virtual IPs, pfsync, XMLRPC config sync, maintenance and upgrade care
when-to-use: Building or operating a two-node firewall cluster
keywords: CARP, vhid, skew, pfsync, XMLRPC sync, preempt, HA status, sync compatibility
priority: high
related: safe-opnsense-changes.md, dns-dhcp.md, vpn.md, upgrade-rollback.md
---

# High Availability (CARP)

## Concepts (carp.html, hacarp.html)
- CARP = IP protocol 112, multicast advertisements; each virtual IP has a unique vhid shared across nodes; lower advertised skew wins (master uses 0). Every interface must be able to receive CARP packets (pass rule).
- Virtual IPs of type CARP are required for automatic failover. Each node also has its own real address per network plus the shared virtual IP.
- **pfsync** replicates the state table over a dedicated interface (security: state injection; performance). Since 24.7 a "Sync compatibility" selector exists: both nodes must run the same version.
- **XMLRPC sync** (System > High Availability > Settings) pushes config on demand from the master to the backup; services to synchronize include Kea.
- Interface assignments must be identical on both nodes. Different NIC drivers (physical master + VM backup) prevent state sync because interface names differ; workaround is a LAGG.
- Preempt: default is enabled-behaviour (option "Disable preempt" unchecked), so CARP interfaces act as a group.
- "Disconnect dialup interfaces": a CARP backup drops PPP interfaces and reconnects on becoming master.

## Operating rules
- Configure the master first, commit, then update the backup from System > High Availability > Status ("Synchronize and reconfigure all"); the backup stays in a known-good state meanwhile.
- A backup node must never hold configuration-synchronization settings, or it can overwrite the master. Use a different theme per node.
- Optional cron "HA update and reconfigure backup" runs only if all CARP interfaces are MASTER.
- WireGuard: "Depend on (CARP)" per instance.

## Failover, maintenance, upgrade (lock-out/state-loss format)
```
ACTION   put the master in CARP persistent maintenance / disable CARP (exact menu: not verified)
EFFECT   traffic moves to the backup; states survive only if pfsync is healthy and versions match
PROOF    backup shows MASTER on all CARP VIPs; new sessions pass; state count rising on the backup
ROLLBACK re-enable CARP on the master (console available), config unchanged on backup
WAIT-FOR-GO
```
HA upgrade order (backup first, then master, or the reverse) is not stated in the pages read: not verified. Keep versions equal after the upgrade because of sync compatibility.

## Not verified
- Maintenance-mode menu names and HA upgrade order.
- pfsync/CARP sysctl tunables.

## Sources
- https://docs.opnsense.org/manual/hacarp.html (2026-11-10)
- https://docs.opnsense.org/manual/how-tos/carp.html (2026-11-10)
- https://docs.opnsense.org/manual/kea.html (2026-11-10)
- https://docs.opnsense.org/manual/how-tos/wireguard-s2s.html (2026-11-10)
