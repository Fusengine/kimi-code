---
name: dependency-audit
description: Use when running ecosystem-specific vulnerability scans across project dependencies (npm/composer/pip/cargo/go/etc), with optional auto-fix.
---


<objective>
This skill runs native package-manager audit tools across a project's full dependency tree,
detecting the package manager from lock files and running the matching command:
npm/yarn/pnpm/bun audit, composer audit, pip-audit/safety scan, cargo audit, govulncheck,
osv-scanner (multi-ecosystem lockfiles), or bundle audit. CocoaPods/SwiftPM have no native
audit command: check Podfile.lock / Package.resolved against OSV.dev or GitHub Advisory.

It parses each tool's output, classifies findings by severity (CRITICAL/HIGH/MEDIUM/LOW),
and suggests fix versions or alternatives. With the --fix flag it applies safe auto-fixes
where supported (npm audit fix, bun audit fix, cargo audit fix) and gives manual guidance
for ecosystems without auto-fix.

Out of scope: researching a single named dependency's CVE history in depth belongs to
cve-research.
</objective>

# Dependency Audit Skill

## Overview

Run dependency vulnerability checks using native package manager audit tools.

## Supported Ecosystems

| Ecosystem | Tool | Auto-fix |
|-----------|------|----------|
| npm/yarn/pnpm/bun | `npm audit` / `yarn npm audit` (Yarn 2+) / `pnpm audit` / `bun audit` | Yes (npm, bun) |
| PHP/Composer | `composer audit` | Manual |
| Python/pip | `pip-audit` / `safety scan` | Manual |
| Rust/Cargo | `cargo audit` | Yes (`fix` feature) |
| Go | `govulncheck ./...` | Manual |
| Swift/CocoaPods/SwiftPM | No native audit — OSV.dev / GitHub Advisory lookup | Manual |
| Ruby/Bundler | `bundle audit` | Manual |
| Any lockfile | `osv-scanner scan source -r .` | Manual |

## Workflow

1. **Detect** package manager from lock files
2. **Run** appropriate audit command
3. **Parse** output for vulnerabilities
4. **Classify** by severity (CRITICAL/HIGH/MEDIUM/LOW)
5. **Suggest** fix versions or alternatives

## Auto-Fix Support

When `--fix` flag is used:
- `npm audit fix` / `bun audit fix` for safe updates
- `cargo audit fix` for Rust (experimental; requires `cargo install cargo-audit --features=fix`)
- Manual guidance for other ecosystems

## References

- [Audit Commands](references/audit-commands.md)
- [Report Template](references/templates/audit-report.md)
