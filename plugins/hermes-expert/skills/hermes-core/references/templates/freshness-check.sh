#!/usr/bin/env bash
# Hermes freshness check - run before writing or changing any Hermes config.
# Read-only: prints the installed version, channel status and latest release.
# Requires: hermes on PATH, curl, jq.
set -euo pipefail

SKILL_VERSION="0.23.0"   # version the skills were written for
API="https://api.github.com/repos/NousResearch/hermes-agent/releases"

echo "== Installed"
hermes --version

echo "== Channel check (applies nothing)"
hermes update --check || true

echo "== Latest published release"
latest_json="$(curl -fsSL "$API/latest")"
latest_tag="$(printf '%s' "$latest_json" | jq -r '.tag_name')"
printf '%s published %s\n' "$latest_tag" "$(printf '%s' "$latest_json" | jq -r '.published_at')"

if [ "${latest_tag#v}" != "$SKILL_VERSION" ]; then
  echo "!! Latest is $latest_tag, skills target v$SKILL_VERSION."
  echo "!! Read every release note since v$SKILL_VERSION (Upgrade notes first):"
  curl -fsSL "$API?per_page=30" \
    | jq -r --arg v "v$SKILL_VERSION" \
      '(map(.tag_name) | index($v)) as $i
       | (if $i == null then .[] else .[:$i][] end)
       | "  \(.tag_name)  \(.html_url)"'
fi
