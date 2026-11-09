---
name: audit-commands
description: Dependency audit CLI commands for npm, composer, pip, cargo, go, swift, ruby
when-to-use: When running dependency vulnerability checks on a project
keywords: npm-audit, composer-audit, pip-audit, cargo-audit, govulncheck
priority: high
related: templates/audit-report.md
---

# Audit Commands by Ecosystem

## Node.js

```bash
# npm
npm audit --json
npm audit fix          # Auto-fix safe updates
npm audit fix --force  # Force major updates (risky)

# yarn classic (v1)
yarn audit --json
yarn audit --groups dependencies

# yarn berry (v2+) — `yarn audit` no longer exists
yarn npm audit --all --recursive --json

# pnpm
pnpm audit --json

# bun (reads bun.lock)
bun audit --json
bun audit fix          # Upgrade within ranges
```

## PHP

```bash
# Composer
composer audit --format=json
composer audit --locked  # Check lock file only
```

## Python

```bash
# pip-audit (recommended)
pip-audit --format=json
pip-audit -r requirements.txt

# safety 3.x (`safety check` is deprecated; requires auth)
safety scan
safety scan --target /path/to/project
```

## Rust

```bash
# cargo-audit
cargo audit --json
cargo audit --file path/to/Cargo.lock  # Untrusted project: never let cargo run in it
cargo audit fix        # Experimental: install with `cargo install cargo-audit --features=fix`
cargo audit --deny warnings
```

## Go

```bash
# govulncheck (official)
govulncheck -json ./...
govulncheck -mode=binary ./cmd/app
```

## Swift / CocoaPods

```bash
# CocoaPods has no audit command (not in `pod` CLI)
pod outdated
# Check Podfile.lock pods against OSV.dev / GitHub Advisory

# Swift Package Manager (manual)
# Check Package.resolved against OSV.dev
```

## Multi-ecosystem (OSV-Scanner)

```bash
# Scans bun.lock, package-lock.json, pnpm-lock.yaml, yarn.lock, composer.lock,
# poetry.lock, uv.lock, Cargo.lock, go.mod, Gemfile.lock, ...
osv-scanner scan source -r .
```

## Ruby

```bash
# bundler-audit
bundle audit check --format=json
bundle audit update    # Update advisory DB
```

## Common Flags

| Flag | Purpose |
|------|---------|
| `--json` | Machine-readable output |
| `--fix` | Auto-apply safe fixes |
| `--production` | Skip devDependencies |
