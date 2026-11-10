---
name: audit-commands-systems
description: Read-only dependency audit commands for Cargo, Go modules, SwiftPM, Python, Bundler and OSV-Scanner, each verified on the tool's official documentation
when-to-use: When auditing a Rust, Go, Swift, Python or Ruby project, or cross-checking any lockfile with OSV-Scanner
keywords: cargo-audit, govulncheck, swiftpm, osv, pip-audit, safety, bundler-audit, osv-scanner
priority: high
related: audit-commands.md, supply-chain.md, templates/audit-report.md
---

# Audit Commands: Rust, Go, Swift, Python, Ruby, OSV-Scanner

Presence check first (`command -v <tool>`); absent → `not run: <tool> absent`. Read-only
unless marked **FIX (option only)**.

## Rust — cargo-audit (`Cargo.lock`)

Source: https://github.com/rustsec/rustsec/tree/main/cargo-audit

```bash
command -v cargo-audit && rustc --version     # cargo audit needs Rust 1.74 or later
# Run from a directory OUTSIDE the audited project, against its lockfile:
cargo audit --file /path/to/project/Cargo.lock --json
```

- If `Cargo.lock` is missing, `cargo audit` runs `cargo update --workspace` to create one, and
  Cargo reads config from the current directory and can execute project code. Hence `--file`
  from outside the project. No `Cargo.lock` → report it (supply-chain finding), do not generate one.
- `cargo audit bin <path>` audits compiled binaries (fully accurate only if built with
  `cargo auditable`).
- **FIX (option only):** `cargo audit fix` edits `Cargo.toml`; `cargo audit fix --dry-run`
  previews. Requires `cargo install cargo-audit --features=fix` (experimental).

## Go — govulncheck (`go.mod`)

Sources: https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck, https://go.dev/doc/security/vuln/

```bash
command -v govulncheck
govulncheck ./...                       # from the module root; source analysis with call stacks
govulncheck -format json ./...          # streaming JSON (exit code 0 regardless of findings)
govulncheck -mode binary ./path/to/bin  # compiled binary; no call stacks
```

- govulncheck reports vulnerabilities whose vulnerable functions are actually called; use its
  call stacks as reachability evidence. Imported-but-not-called advisories go to manual review.
- Limits: calls through `reflect` and `unsafe` may be missed; binary mode can over-report.
- No auto-fix; remediation is a module bump (`go get <module>@<fixed>`), owner's option.

## Swift — SwiftPM (`Package.resolved`) and CocoaPods

There is no SwiftPM audit command. OSV-Scanner's supported lockfiles do not include
`Package.resolved` (https://google.github.io/osv-scanner/supported-languages-and-lockfiles/).
Manual procedure, read-only:

1. Read each pinned package's repository URL and resolved version from `Package.resolved`.
2. Query OSV with ecosystem `SwiftURL` (name = the Git URL, version = the tag) through
   `POST https://api.osv.dev/v1/querybatch` (see cve-research `references/cve-apis.md`).
3. Cross-check GitHub Advisory: `GET https://api.github.com/advisories?ecosystem=swift`.
4. CocoaPods (`Podfile.lock`): no audit command verified; same manual lookup per pod.

Report the method used; anything not resolvable goes to "needs manual review".

## Python — pip-audit / Safety

Sources: https://github.com/pypa/pip-audit, https://docs.safetycli.com/safety-docs/safety-cli/scanning-for-vulnerable-and-malicious-packages/available-commands-and-inputs

```bash
command -v pip-audit
pip-audit -r requirements.txt -f json
pip-audit --locked . -f json            # pyproject.toml / pylock.*.toml lock files
pip-audit -f json                       # current environment
command -v safety                       # optional; requires a Safety account (auth or API key)
safety scan --target /path/to/project --output json
```

- **FIX (option only):** `pip-audit --fix` (preview with `--fix --dry-run`);
  `safety scan --apply-fixes` rewrites requirements files.

## Ruby — bundler-audit (`Gemfile.lock`)

Source: https://github.com/rubysec/bundler-audit

```bash
command -v bundle-audit
bundle-audit check --update --format json   # refresh ruby-advisory-db, then check
```

- Also flags insecure gem sources (`http://`, `git://`).

## Any lockfile — OSV-Scanner (optional cross-check)

Source: https://google.github.io/osv-scanner/usage/

```bash
command -v osv-scanner
osv-scanner scan source -r --format json /path/to/project
```

- Covers `bun.lock`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `composer.lock`,
  `Cargo.lock`, `go.mod`, `Gemfile.lock`, Python lockfiles and more (see supported list above).
- **Never run `osv-scanner fix` in an audit**: the docs warn it can make the package manager
  execute scripts or follow registries declared by an untrusted project.
