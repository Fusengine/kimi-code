#!/usr/bin/env bash
# tts-healthcheck.sh - PATTERN, not a Hermes built-in (Hermes 0.23.0 has no TTS fallback chain).
# Probes the primary TTS provider; after FAIL_THRESHOLD consecutive failures switches
# tts.provider to the secondary, after RECOVER_THRESHOLD successes switches back.
# Prints ONE line only when it switches, so a no-agent cron job stays silent otherwise.
#
# Install (per profile):
#   cp tts-healthcheck.sh ~/.hermes/scripts/   # or the profile home's scripts/ dir
#   chmod 700 ~/.hermes/scripts/tts-healthcheck.sh
#   hermes -p <PROFILE> cron create "every 15m" --no-agent \
#     --script tts-healthcheck.sh --deliver <NOTIFY_TARGET> --name tts-healthcheck
# Edit the CONFIG block and the two probe functions before the first run.
set -euo pipefail

# ---- CONFIG -------------------------------------------------------------
PROFILE="${TTS_HC_PROFILE:-<profile-name>}"          # Hermes profile to manage
PRIMARY="${TTS_HC_PRIMARY:-edge}"                   # tts.provider when healthy
SECONDARY="${TTS_HC_SECONDARY:-piper}"              # tts.provider during an outage
FAIL_THRESHOLD="${TTS_HC_FAIL_THRESHOLD:-2}"
RECOVER_THRESHOLD="${TTS_HC_RECOVER_THRESHOLD:-3}"
RESTART_AFTER_SWITCH="${TTS_HC_RESTART:-0}"         # 1 if your version does not reload tts per call
STATE_DIR="${TTS_HC_STATE_DIR:-$HOME/.hermes/cache/tts-healthcheck}"
PROBE_TEXT="Voice check."
PROBE_TIMEOUT=30
# -------------------------------------------------------------------------

mkdir -p "$STATE_DIR"
STATE_FILE="$STATE_DIR/$PROFILE.state"
LOG_FILE="$STATE_DIR/$PROFILE.log"
WORK_DIR="$(mktemp -d "$STATE_DIR/probe.XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >>"$LOG_FILE"; }

run_with_timeout() {
  if command -v timeout >/dev/null 2>&1; then timeout "$PROBE_TIMEOUT" "$@"
  else "$@"; fi
}

# Probe = synthesise PROBE_TEXT into $1 outside Hermes; return 0 if it worked.
# Replace the bodies with the commands matching YOUR providers.
probe_primary() {
  # Example for edge: the edge-tts CLI (pip package "edge-tts").
  run_with_timeout edge-tts --text "$PROBE_TEXT" --write-media "$1" >/dev/null 2>&1
}

probe_secondary() {
  # Example for piper: a local voice model; adjust the .onnx path.
  printf '%s' "$PROBE_TEXT" | run_with_timeout piper -m "<path-to-voice.onnx>" -f "$1" >/dev/null 2>&1
}

audio_ok() { [[ -s "$1" ]] && [[ "$(wc -c <"$1")" -gt 1024 ]]; }

check() {  # $1 = probe function name
  local out="$WORK_DIR/$1.audio"
  rm -f "$out"
  if "$1" "$out" && audio_ok "$out"; then return 0; fi
  return 1
}

current_provider() {
  hermes -p "$PROFILE" config get tts.provider 2>/dev/null | tr -d '"[:space:]'
}

switch_to() {  # $1 = provider, $2 = reason
  hermes -p "$PROFILE" config set tts.provider "$1" >/dev/null
  if [[ "$RESTART_AFTER_SWITCH" == "1" ]]; then
    hermes -p "$PROFILE" gateway restart >/dev/null 2>&1 || true
  fi
  log "switched tts.provider to $1 ($2)"
  echo "Voice: switched profile '$PROFILE' to '$1' - $2."
}

# Load counters (fail streak of primary, success streak of primary).
fails=0; oks=0
if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
fi

if check probe_primary; then
  fails=0; oks=$((oks + 1)); log "primary $PRIMARY ok (streak $oks)"
else
  oks=0; fails=$((fails + 1)); log "primary $PRIMARY failed (streak $fails)"
fi
printf 'fails=%d\noks=%d\n' "$fails" "$oks" >"$STATE_FILE"

active="$(current_provider)"

if [[ "$active" != "$SECONDARY" && "$fails" -ge "$FAIL_THRESHOLD" ]]; then
  if check probe_secondary; then
    switch_to "$SECONDARY" "primary '$PRIMARY' failed $fails checks in a row"
  else
    log "secondary $SECONDARY also failed; no switch"
    echo "Voice: '$PRIMARY' AND backup '$SECONDARY' both failing on profile '$PROFILE' - voice replies are down."
    exit 1   # non-zero -> cron delivers an error alert
  fi
elif [[ "$active" == "$SECONDARY" && "$oks" -ge "$RECOVER_THRESHOLD" ]]; then
  switch_to "$PRIMARY" "primary '$PRIMARY' healthy for $oks checks"
fi
# Healthy and unchanged -> no stdout -> silent cron tick.
