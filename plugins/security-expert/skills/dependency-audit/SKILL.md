---
name: dependency-audit
description: "Use when auditing a project's dependency tree for known vulnerabilities and supply-chain risks (bun/npm/pnpm/yarn, Composer, Cargo, Go modules, SwiftPM, pip, Bundler) and its GitHub Actions workflows. Read-only: reports findings, lists fix commands as options, never applies them."
---


<objective>
This skill audits a project's dependencies with each ecosystem's native audit tool (detected
from lockfiles), adds supply-chain checks (OWASP Top 10:2025 A03 Software Supply Chain
Failures) and GitHub Actions workflow checks, and writes one report. It is read-only: it never
installs a tool, never runs a fix command, never edits a lockfile. Fix commands are listed in
the report as options for the owner.

Out of scope: deep CVE history of one named package (use cve-research).
</objective>

# Dependency Audit Skill

## Ground rules

1. **Report, never fix.** Every `fix` / `--fix` / `--apply-fixes` command rewrites lockfiles,
   manifests or `node_modules`. The audit lists it as an option; it never runs it.
2. **Tool presence first.** Before any command: `command -v <tool>`. Missing tool → record
   `not run: <tool> absent` in the report. Never install it, never skip it silently.
3. **Untrusted projects.** Some tools execute project code (Cargo build scripts, package
   manager lifecycle scripts, osv-scanner `fix`). Use the read-only form documented in
   `references/audit-commands-systems.md` and never run install commands.
4. **Versions age.** Check a tool's version with its own `--version` rather than trusting a
   number written in this skill.

## Ecosystems

| Lockfile | Native tool | Reference |
|----------|-------------|-----------|
| `bun.lock` | `bun audit` | [JS and PHP commands](references/audit-commands.md) |
| `package-lock.json` / `npm-shrinkwrap.json` | `npm audit` | same |
| `pnpm-lock.yaml` | `pnpm audit` | same |
| `yarn.lock` (Yarn 2+) | `yarn npm audit` | same |
| `yarn.lock` (Yarn 1 classic) | `yarn audit` | same |
| `composer.lock` | `composer audit` | same |
| `Cargo.lock` | `cargo audit` | [Rust, Go, Swift, Python, Ruby](references/audit-commands-systems.md) |
| `go.mod` / `go.sum` | `govulncheck` | same |
| `Package.resolved` (SwiftPM) | none native — OSV / GitHub Advisory lookup | same |
| `requirements.txt`, `pyproject.toml`, `pylock.*.toml` | `pip-audit` | same |
| `Gemfile.lock` | `bundle-audit` | same |
| any supported lockfile | `osv-scanner` (optional cross-check) | same |

## Workflow

1. **Detect** lockfiles (and whether each is tracked: `git ls-files <lockfile>`).
2. **Check tools** with `command -v`; record absent ones.
3. **Run** the read-only audit command per ecosystem, JSON output where available.
4. **Supply chain** checks: [Supply Chain Checks](references/supply-chain.md).
5. **CI** checks for `.github/workflows/*.yml`: [GitHub Actions Checks](references/ci-github-actions.md).
6. **Classify** each advisory (CRITICAL / HIGH / MEDIUM / LOW, CWE, confidence 1-10).
7. **Verify** each candidate finding in a second read-only pass that tries to refute it:
   is the affected version the one actually resolved in the lockfile, is the vulnerable
   code reachable (govulncheck does this for Go; elsewhere grep imports/calls), is it a dev-only
   dependency. Confidence below 8 goes to "needs manual review", not to findings.
8. **Write** the report with [Report Template](references/templates/audit-report.md) to
   `docs/security/YYYY-MM-DD-<scope>.md` inside the audited repository.

## Severity

Use the advisory's own severity when it states a CVSS score, and record the CVSS version and
source (GitHub, NVD, CNA). Tool labels map as: `critical` → CRITICAL, `high` → HIGH,
`moderate`/`medium` → MEDIUM, `low`/`info` → LOW. These are inputs: the reported severity
follows the plugin's single scale in `rules/security-rules.md`, after reachability. For CVSS details and reachability rules see
the cve-research skill.

## Fix options (listed, never run)

| Ecosystem | Option for the owner | What it changes |
|-----------|---------------------|-----------------|
| bun | `bun audit fix` (`--dry-run` to preview, `--latest` to cross majors) | `bun.lock`, `node_modules`, exact pins in `package.json` |
| npm | `npm audit fix` (`--dry-run`, `--package-lock-only`; `--force` allows SemVer-major) | `package-lock.json`, `node_modules` |
| pnpm | `pnpm audit --fix` (overrides) or `--fix=update` | `pnpm-workspace.yaml` or lockfile |
| Cargo | `cargo audit fix` (`--dry-run`); needs `cargo install cargo-audit --features=fix` | `Cargo.toml` |
| pip | `pip-audit --fix` (`--dry-run` to preview) | installed environment |
| Composer, Go, SwiftPM, Bundler | manual version bump in the manifest, then the package manager's update | manifest + lockfile |

## References

- [Audit Commands: JS/TS and PHP](references/audit-commands.md)
- [Audit Commands: Rust, Go, Swift, Python, Ruby, OSV-Scanner](references/audit-commands-systems.md)
- [Supply Chain Checks](references/supply-chain.md)
- [GitHub Actions Checks](references/ci-github-actions.md)
- [Report Template](references/templates/audit-report.md)
