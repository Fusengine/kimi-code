#!/usr/bin/env bash
# Retention for a restic repository. Default is a PREVIEW: nothing is removed.
# Removal needs --apply, which a human (or an approved change) passes explicitly.
# Run from a trusted admin host with credentials that may delete; NOT from the
# backup client when the repository is served append-only.
#   restic-maintenance.sh            -> forget --dry-run, prints keep/remove lists
#   restic-maintenance.sh --apply    -> forget --prune, then check
set -Eeuo pipefail
umask 077

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is not set}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE is not set}"

# Policy: replace with the values from the backup policy table.
POLICY=(--keep-daily 7 --keep-weekly 4 --keep-monthly 12 --keep-yearly 3)

APPLY=0
case "${1:-}" in
  "") ;;
  --apply) APPLY=1 ;;
  *) echo "usage: $0 [--apply]" >&2; exit 2 ;;
esac

log() { printf '%s restic-maintenance: %s\n' "$(date -u +%FT%TZ)" "$*"; }

log "check before"
restic check --retry-lock 10m

log "preview (dry run)"
restic forget "${POLICY[@]}" --group-by host,paths --dry-run --retry-lock 10m

if [[ "$APPLY" -eq 1 ]]; then
  log "applying: forget --prune"
  restic forget "${POLICY[@]}" --group-by host,paths --prune --retry-lock 10m
  log "check after"
  restic check --retry-lock 10m
else
  log "preview only; re-run with --apply after the go"
fi
