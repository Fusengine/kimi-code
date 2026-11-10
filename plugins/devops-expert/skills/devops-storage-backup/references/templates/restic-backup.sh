#!/usr/bin/env bash
# Nightly restic backup. Install as /usr/local/sbin/restic-backup.sh (mode 0750, root).
# Reads RESTIC_REPOSITORY / RESTIC_PASSWORD_FILE (and S3 keys if used) from the
# environment, which systemd loads from /etc/backup/restic.env (mode 0600).
# This script never prints secrets and never deletes snapshots (see restic-maintenance.sh).
set -Eeuo pipefail
umask 077

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is not set}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE is not set}"

SOURCES=("/etc" "/srv" "/home")          # replace: paths to protect
EXCLUDES="/etc/backup/excludes.txt"       # one pattern per line
TAG="host-daily"
LOCKFILE="/run/restic-backup.lock"
STATUS_FILE="/var/lib/backup/restic.last_success"   # timestamp for freshness alerts

log() { printf '%s restic-backup: %s\n' "$(date -u +%FT%TZ)" "$*"; }

exec 9>"$LOCKFILE"
if ! flock -n 9; then
  log "another run holds the lock, exiting"
  exit 75
fi

command -v restic >/dev/null 2>&1 || { log "restic not found"; exit 127; }
[[ -r "$RESTIC_PASSWORD_FILE" ]] || { log "password file unreadable"; exit 1; }

log "repository reachable?"
restic snapshots --latest 1 --retry-lock 10m >/dev/null

log "backup start"
restic backup \
  --one-file-system \
  --tag "$TAG" \
  --retry-lock 10m \
  ${EXCLUDES:+--exclude-file "$EXCLUDES"} \
  "${SOURCES[@]}"

log "structure check"
restic check --retry-lock 10m

mkdir -p "$(dirname "$STATUS_FILE")"
date -u +%s >"$STATUS_FILE"
log "done"
