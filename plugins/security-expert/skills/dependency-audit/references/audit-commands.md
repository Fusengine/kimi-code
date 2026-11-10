---
name: audit-commands
description: Read-only dependency audit commands for bun, npm, pnpm, Yarn 2+ and Composer, each verified on the tool's official documentation
when-to-use: When auditing a JS/TS (Next.js, React, TanStack Start, Astro, TypeScript) or PHP/Laravel project
keywords: bun-audit, npm-audit, pnpm-audit, yarn-npm-audit, composer-audit, audit-signatures
priority: high
related: audit-commands-systems.md, supply-chain.md, templates/audit-report.md
---

# Audit Commands: JS/TS and PHP

Every block starts with the presence check. Absent tool → `not run: <tool> absent` in the
report. Commands below are read-only unless marked **FIX (option only)**.

## bun (`bun.lock`)

Source: https://bun.com/docs/pm/cli/audit

```bash
command -v bun
bun audit --json              # raw registry JSON; reads bun.lock, no node_modules needed
bun audit --audit-level=high  # exit code only counts high+ (low|moderate|high|critical)
bun audit --prod              # only dependencies/optionalDependencies/peerDependencies
```

- `bun audit` never modifies `package.json`, `bun.lock` or `node_modules`.
- `--json` output is unfiltered; `--audit-level` and `--ignore` only change the exit code.
- Packages from a scoped registry without an advisory endpoint are listed as skipped: report them.
- **FIX (option only):** `bun audit fix` upgrades within ranges and installs (changes `bun.lock`,
  `node_modules`, and rewrites exact pins in `package.json`); `bun audit fix --dry-run` previews;
  `bun audit fix --latest` also crosses majors.

## npm (`package-lock.json`)

Source: https://docs.npmjs.com/cli/v11/commands/npm-audit/

```bash
command -v npm
npm audit --json
npm audit --audit-level=high   # failure threshold only, does not filter output
npm audit --omit=dev           # skip devDependencies
npm audit signatures           # registry signatures + provenance attestations (needs installed packages)
```

- npm requires a lockfile to audit; without one, results vary per run (`--no-package-lock`).
- `npm audit signatures` verifies packages already downloaded; recent npm CLI versions are
  recommended for attestation checks (check `npm --version`).
- **FIX (option only):** `npm audit fix` (runs a full install), `npm audit fix --dry-run --json`
  to preview, `--package-lock-only` to touch only the lockfile, `--force` allows SemVer-major.

## pnpm (`pnpm-lock.yaml`)

Source: https://pnpm.io/cli/audit

```bash
command -v pnpm
pnpm audit --json
pnpm audit --audit-level high
pnpm audit --prod
pnpm audit signatures          # ECDSA registry signatures against lockfile integrity
```

- Never pass `--ignore` or `--ignore-unfixable` during an audit: they write GHSA IDs into
  `pnpm-workspace.yaml`.
- **FIX (option only):** `pnpm audit --fix` adds overrides to `pnpm-workspace.yaml`;
  `--fix=update` updates the lockfile instead.

## Yarn 2+ (`yarn.lock` with `.yarnrc.yml`)

Source: https://yarnpkg.com/cli/npm/audit

```bash
command -v yarn
yarn npm audit --all --recursive --json   # all workspaces, transitive deps, NDJSON
yarn npm audit --environment production   # exclude devDependencies
```

- The default audits only direct dependencies of the active workspace: always pass
  `--all --recursive`.
- `yarn npm audit` documents no fix mode; remediation is a manual version bump (owner's option).

## Yarn 1 classic (`yarn.lock`, no `.yarnrc.yml`)

Source: https://classic.yarnpkg.com/en/docs/cli/audit

```bash
command -v yarn && yarn --version   # 1.x = classic
yarn audit --json                   # JSON lines, needs network
yarn audit --groups dependencies    # production dependencies only
```

- Exit code is a bit mask of severities (1 INFO, 2 LOW, 4 MODERATE, 8 HIGH, 16 CRITICAL);
  `--level` filters the table only, not the exit code.

## Composer (`composer.lock`)

Source: https://getcomposer.org/doc/03-cli.md (sections `audit` and Global Options)

```bash
command -v composer
composer audit --locked --format=json --no-plugins --no-scripts
composer audit --locked --no-dev --format=json
```

- `--locked` audits the lockfile regardless of `vendor/`; `--no-plugins` / `--no-scripts`
  keep project code from running.
- `composer audit` also reports abandoned packages and packages flagged as malware; exit code
  `1` when any dependency policy matches.
- `composer audit` documents no fix mode; remediation is a manual constraint bump in
  `composer.json` then `composer update <package>` (owner's option).
