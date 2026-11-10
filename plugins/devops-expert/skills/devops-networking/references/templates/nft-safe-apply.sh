#!/usr/bin/env bash
# Apply an nftables ruleset with an automatic revert if you do not confirm.
# Run it from a session you can lose; keep a SECOND SSH session open.
#   usage: nft-safe-apply.sh /etc/nftables.conf [revert-seconds]
#   confirm (inside the window): systemctl stop nft-revert.timer
set -euo pipefail

NEW=${1:?usage: nft-safe-apply.sh <ruleset-file> [revert-seconds]}
WINDOW=${2:-120}
BACKUP=/root/nft-before-$(date +%Y%m%d-%H%M%S).conf

# 1. syntax check, changes nothing (nft --check)
nft -c -f "$NEW"

# 2. backup of the live ruleset, loadable as-is: `flush ruleset` first,
#    otherwise reloading it would be merged on top of the new rules
{ echo 'flush ruleset'; nft list ruleset; } > "$BACKUP"
echo "backup: $BACKUP"

# 3. schedule the revert BEFORE touching the firewall (systemd transient timer + service)
systemd-run --unit=nft-revert --on-active="${WINDOW}s" /usr/sbin/nft -f "$BACKUP"
echo "auto-revert in ${WINDOW}s"

# 4. atomic apply (nft -f swaps old and new ruleset in one transaction)
nft -f "$NEW"
echo "applied. From ANOTHER terminal open a new SSH session now."
echo "If it works:  systemctl stop nft-revert.timer   (cancels the revert)"
