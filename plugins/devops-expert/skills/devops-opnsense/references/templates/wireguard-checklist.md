# WireGuard on OPNsense checklist (docs.opnsense.org wireguard how-tos, read 2026-11-10)

- [ ] Plugin `os-wireguard` installed if the release still ships it as a plugin (verify on the box)
- [ ] Out-of-band/console path known; the admin path is NOT only through this tunnel
- [ ] Instance: unique tunnel subnet in CIDR (never /32 or /128), listen port set, MTU 1420 (1412 for PPPoE)
- [ ] Instance DNS server left blank
- [ ] Keys generated with the cogwheel; private key never pasted in chat or Git
- [ ] Peer: public key, unique tunnel IP in allowed IPs (plus the remote LAN for site-to-site)
- [ ] WAN rule allows the listen port (UDP); rules on the WireGuard interface allow intended traffic
- [ ] HA: "Depend on (CARP)" set on each instance
- [ ] Proof: handshake seen, ping through tunnel, new session to the target LAN
- [ ] Rollback: disable the instance (do not delete) first; config backup downloaded
