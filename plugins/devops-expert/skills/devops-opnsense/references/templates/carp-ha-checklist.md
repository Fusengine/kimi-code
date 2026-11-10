# CARP / HA checklist (docs.opnsense.org hacarp + carp how-to, read 2026-11-10)

- [ ] Both nodes on the same OPNsense version ("Sync compatibility" for pfsync)
- [ ] Interface assignments identical on both nodes; same NIC driver type (or LAGG)
- [ ] Pass rules for CARP (protocol 112) on every CARP interface
- [ ] Real address per node per network + one CARP VIP per network, unique vhid, master skew 0
- [ ] Dedicated pfsync interface with its own rule
- [ ] Config sync (XMLRPC) set on the master ONLY; the backup holds no sync settings
- [ ] Services to synchronize reviewed (e.g. Kea)
- [ ] Order: change the master, then System > High Availability > Status > synchronize to the backup
- [ ] Proof: all CARP VIPs MASTER on one node and BACKUP on the other; state table filling on the backup
- [ ] Failover test announced and approved (ACTION / EFFECT / PROOF / ROLLBACK / WAIT-FOR-GO), console on both nodes
