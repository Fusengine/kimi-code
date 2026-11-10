#!/usr/bin/env bash
# OPNsense API examples. Credentials come from the environment, never inline.
#   export OPNSENSE_HOST=fw.example.net
#   export OPNSENSE_API_KEY=...     (from a dedicated least-privilege user)
#   export OPNSENSE_API_SECRET=...
# Read-only calls first. The write/apply block is commented: propose it with
# ACTION / EFFECT / PROOF / ROLLBACK and wait for the user's go.
set -euo pipefail
: "${OPNSENSE_HOST:?set OPNSENSE_HOST}" "${OPNSENSE_API_KEY:?}" "${OPNSENSE_API_SECRET:?}"

api() { # api METHOD path [json-body]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -sS --fail-with-body -X "$method" -u "${OPNSENSE_API_KEY}:${OPNSENSE_API_SECRET}" \
      -H 'Content-Type: application/json' -d "$body" "https://${OPNSENSE_HOST}/api/${path}"
  else
    curl -sS --fail-with-body -X "$method" -u "${OPNSENSE_API_KEY}:${OPNSENSE_API_SECRET}" \
      "https://${OPNSENSE_HOST}/api/${path}"
  fi
}

# Read-only: list services (same call the GUI makes)
api POST core/service/search '{"current":1,"rowCount":20,"sort":{},"searchPhrase":""}'

# Read-only: firewall alias settings
api GET firewall/alias/get

# Apply step for aliases only, after an add_item call (write class: wait for the go)
# api POST firewall/alias/reconfigure
