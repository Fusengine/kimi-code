#!/usr/bin/env bash
# Pull the OPNsense config off-box and keep a dated, encrypted copy.
# Read-only on the firewall. Host, user and recipient are placeholders.
set -euo pipefail
FW_HOST="${FW_HOST:?set FW_HOST}"          # e.g. fw.example.net
FW_USER="${FW_USER:-backup-admin}"         # key-based SSH user
GPG_RECIPIENT="${GPG_RECIPIENT:?set GPG_RECIPIENT}"
DEST="${DEST:-$HOME/opnsense-backups}"
umask 077
mkdir -p "$DEST"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
# /conf/config.xml is the live config path (not re-read in the docs today)
scp -q "${FW_USER}@${FW_HOST}:/conf/config.xml" "$DEST/config-${stamp}.xml"
gpg --yes --encrypt --recipient "$GPG_RECIPIENT" -o "$DEST/config-${stamp}.xml.gpg" "$DEST/config-${stamp}.xml"
rm -f "$DEST/config-${stamp}.xml"
echo "saved $DEST/config-${stamp}.xml.gpg"
