#!/usr/bin/env bash
# Template: operational script skeleton (strict mode, traps, lock, dry-run).
# Sources: GNU Bash manual 5.3 (set, shopt, trap, BASH_COMMAND), mktemp(1), flock(1),
#          the ShellCheck wiki pages SC2155, SC2086, SC2164. See ../bash-scripting.md.
# Usage:   ./script-skeleton.sh [--apply] [--verbose] <target>
#          Without --apply nothing is changed (dry run is the default).

set -Eeuo pipefail
# inherit_errexit exists from bash 4.4; ignore on older shells.
shopt -s inherit_errexit 2>/dev/null || true

readonly SCRIPT_NAME="${0##*/}"
readonly LOCK_FILE="${LOCK_FILE:-/run/lock/${SCRIPT_NAME%.sh}.lock}"
DRY_RUN=1
VERBOSE=0
TARGET=""
TMPDIR_WORK=""

log() { printf '%s %s: %s\n' "$(date -u +%FT%TZ)" "$SCRIPT_NAME" "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }
debug() { if [[ $VERBOSE -eq 1 ]]; then log "DEBUG: $*"; fi; }

# Print the command in dry-run mode, execute it otherwise.
run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    log "DRY-RUN: $*"
  else
    debug "exec: $*"
    "$@"
  fi
}

cleanup() {
  local status=$?
  if [[ -n $TMPDIR_WORK && -d $TMPDIR_WORK ]]; then
    rm -rf -- "$TMPDIR_WORK"
  fi
  exit "$status"
}

on_err() {
  local line=$1
  log "failed at line ${line}: ${BASH_COMMAND}"
}

trap cleanup EXIT
trap 'on_err $LINENO' ERR
trap 'exit 130' INT
trap 'exit 143' TERM

usage() {
  cat >&2 <<EOF
Usage: ${SCRIPT_NAME} [--apply] [--verbose] <target>
  --apply     perform changes (default: dry run, prints what would change)
  --verbose   debug logging
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --apply) DRY_RUN=0 ;;
      --verbose) VERBOSE=1 ;;
      -h|--help) usage; exit 0 ;;
      --) shift; break ;;
      -*) usage; die "unknown option: $1" ;;
      *) TARGET=$1 ;;
    esac
    shift
  done
  [[ -n $TARGET ]] || { usage; die "missing <target>"; }
}

acquire_lock() {
  # flock(1) ships with util-linux; fail loudly instead of reporting a false "already running".
  command -v flock >/dev/null 2>&1 || die "flock not found (install util-linux)"
  exec 9>"$LOCK_FILE" || die "cannot open lock file $LOCK_FILE"
  if ! flock -n 9; then
    log "another instance holds $LOCK_FILE - exiting"
    exit 0
  fi
}

main() {
  parse_args "$@"
  acquire_lock

  TMPDIR_WORK=$(mktemp -d)
  debug "workdir: $TMPDIR_WORK"

  # 1. Discovery (read-only): check current state before changing anything.
  if [[ -e $TARGET ]]; then
    log "target exists: $TARGET"
  else
    log "target missing: $TARGET"
  fi

  # 2. Change (idempotent): only act when the state differs from the desired one.
  #    Replace with real work; keep every mutating command behind run().
  run touch -- "$TARGET"

  # 3. Verify: re-check the state that motivated the change.
  if [[ $DRY_RUN -eq 0 ]]; then
    [[ -e $TARGET ]] || die "verification failed: $TARGET not present"
  fi
  log "done (dry_run=${DRY_RUN})"
}

main "$@"
