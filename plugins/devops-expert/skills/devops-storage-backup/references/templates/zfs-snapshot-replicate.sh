#!/usr/bin/env bash
# Snapshot a dataset and replicate it incrementally to another host.
# DRY_RUN=1 (default) only prints what would run. Set DRY_RUN=0 after review.
# Never destroys anything: old snapshots are only listed (see prune_preview).
#   DATASET=tank/data TARGET_HOST=backup1 TARGET_DS=backup/data ./zfs-snapshot-replicate.sh
# The target dataset is received unmounted (-u) and resumable (-s). Do not take
# snapshots on the target by hand: an incremental receive needs its newest
# snapshot to match the stream source.
set -Eeuo pipefail

: "${DATASET:?DATASET is required, e.g. tank/data}"
: "${TARGET_HOST:?TARGET_HOST is required}"
: "${TARGET_DS:?TARGET_DS is required, e.g. backup/data}"
PREFIX="${PREFIX:-auto}"
DRY_RUN="${DRY_RUN:-1}"
KEEP="${KEEP:-48}"                       # newest auto snapshots kept on the source
SSH=(ssh -o BatchMode=yes "$TARGET_HOST")

log() { printf '%s zfs-replicate: %s\n' "$(date -u +%FT%TZ)" "$*"; }
run() {
  if [[ "$DRY_RUN" == "1" ]]; then log "DRY-RUN: $*"; else "$@"; fi
}

NEW="${PREFIX}-$(date -u +%Y%m%dT%H%M%SZ)"

# Newest snapshot present on the target (empty on first run).
LAST_REMOTE="$("${SSH[@]}" zfs list -H -t snapshot -o name -s creation -d 1 "$TARGET_DS" 2>/dev/null | tail -n 1 || true)"
LAST_SHORT="${LAST_REMOTE##*@}"

log "snapshot $DATASET@$NEW"
run zfs snapshot "$DATASET@$NEW"

if [[ -n "$LAST_SHORT" ]] && zfs list -H -t snapshot -o name "$DATASET@$LAST_SHORT" >/dev/null 2>&1; then
  log "incremental from @$LAST_SHORT"
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY-RUN: zfs send -I @$LAST_SHORT $DATASET@$NEW | ssh $TARGET_HOST zfs receive -s -u $TARGET_DS"
  else
    zfs send -I "@$LAST_SHORT" "$DATASET@$NEW" | "${SSH[@]}" zfs receive -s -u "$TARGET_DS"
  fi
else
  log "no common snapshot: full send (first run, or target was reset)"
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY-RUN: zfs send $DATASET@$NEW | ssh $TARGET_HOST zfs receive -s -u $TARGET_DS"
  else
    zfs send "$DATASET@$NEW" | "${SSH[@]}" zfs receive -s -u "$TARGET_DS"
  fi
fi

prune_preview() {
  log "snapshots beyond the newest $KEEP (candidates only, nothing destroyed):"
  zfs list -H -t snapshot -o name -s creation -d 1 "$DATASET" \
    | grep "@${PREFIX}-" | head -n "-${KEEP}" || true
  log "to remove after approval: zfs destroy -nv <snapshot> first, then the real destroy"
}
prune_preview
log "finished"
