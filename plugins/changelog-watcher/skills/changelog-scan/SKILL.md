---
name: changelog-scan
description: Use when checking for new Kimi Code versions, features, or changes since the last known release.
---


<objective>
Fetches the official Kimi Code changelog via the harness CLI's `changelog` command (ported from the old `fetch-changelog`, WebFetch on `code.kimi.com/docs/en/changelog.md` as manual fallback), parses version headers and per-version changes (features/fixes/breaking), compares against the last known version recorded in the state file (`~/.kimi-code/logs/00-changelog/<date>-state.json`), and generates a structured update report using `references/templates/changelog-report.md`.
</objective>

# Changelog Scan Skill

## Overview

Fetches and analyzes the official Kimi Code changelog to detect new versions and changes.

## Data Sources

| Source | URL | Method |
|--------|-----|--------|
| Changelog | code.kimi.com/docs/en/changelog.md | WebFetch |
| Docs Index | code.kimi.com/docs/llms.txt | WebFetch |
| Hooks Ref | code.kimi.com/docs/en/hooks.md | WebFetch |
| Plugins Ref | code.kimi.com/docs/en/plugins-reference.md | WebFetch |
| CLI Ref | code.kimi.com/docs/en/cli-reference.md | WebFetch |

## Workflow

1. **Fetch** changelog via the harness CLI (ported from the old `fetch-changelog` into `@fusengine/harness`):
   `bun "$(test -f "${KIMI_CODE_HOME:-$HOME/.kimi-code}/harness-current/dist/cli/bin.mjs" && echo "${KIMI_CODE_HOME:-$HOME/.kimi-code}/harness-current" || echo "${KIMI_CODE_HOME:-$HOME/.kimi-code}/node_modules/@fusengine/harness")/dist/cli/bin.mjs" changelog`
   It fetches `code.kimi.com/docs/en/changelog.md`, parses versions (current MDX `<Update label="X.Y.Z">` format + legacy `## vX.Y.Z` fallback), writes state to `~/.kimi-code/logs/00-changelog/<date>-state.json`, and prints JSON `{latest, new_since_last_check, recent_versions}`. WebFetch on the same URL is the manual fallback.
2. **Parse** version numbers and release dates
3. **Extract** changes per version (features, fixes, breaking)
4. **Compare** with last known version from state file
5. **Generate** report using templates/changelog-report.md

## Version Detection

Parse patterns from changelog:
- `## vX.Y.Z` or `## X.Y.Z` - Version headers
- `### Breaking Changes` - Breaking section
- `### New Features` - Features section
- `### Bug Fixes` - Fixes section

## State File

Location: `~/.kimi-code/logs/00-changelog/{date}-state.json`

## References

- [Sources Reference](references/sources.md)
- [Report Template](references/templates/changelog-report.md)
