---
name: supply-chain
description: Read-only software supply chain checks (OWASP Top 10:2025 A03) — lockfiles, install scripts, registry signatures and provenance, typosquatting, optional SBOM, SLSA reference
when-to-use: During every dependency audit, after the native audit commands
keywords: supply-chain, owasp-a03, lockfile, postinstall, provenance, typosquatting, sbom, slsa
priority: high
related: audit-commands.md, audit-commands-systems.md, ci-github-actions.md
---

# Supply Chain Checks

Standard reference for findings in this file: **OWASP Top 10:2025 A03 Software Supply Chain
Failures** (https://top10.owasp.org/2025/A03_2025-Software_Supply_Chain_Failures/). Its
mapped CWEs include CWE-1104 (unmaintained third-party components) and CWE-1395 (dependency
on vulnerable third-party component). Build-integrity reference to cite: **SLSA v1.2**
(https://slsa.dev/spec/v1.2/), build track (provenance) and source track.

All checks are read-only. Nothing is installed, nothing is executed from the project.

## 1. Lockfile present and committed

```bash
git ls-files bun.lock package-lock.json pnpm-lock.yaml yarn.lock composer.lock \
  Cargo.lock go.sum Package.resolved Gemfile.lock
```

- A manifest without its lockfile (or a lockfile listed in `.gitignore`) → finding: installs
  are not reproducible (npm states `package-lock.json` is intended to be committed,
  https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/).
- Library crates and packages may deliberately omit a lockfile: confidence below 8 → manual review.

## 2. Install-time scripts

- npm: packages with `"hasInstallScript": true` in `package-lock.json` run a preinstall,
  install or postinstall script (field documented on the page above). List them.
- bun: lifecycle scripts run only for packages in `trustedDependencies` (or Bun's default
  list when the field is omitted) — https://bun.com/docs/pm/lifecycle. Review the list in
  `package.json`.
- Composer: `scripts` in `composer.json` run on Composer events; audit with `--no-scripts`.
- Grep the repo's own scripts and manifests for remote execution patterns:

```bash
grep -rnE "curl[^|]*\|\s*(ba|z)?sh|wget[^|]*\|\s*(ba|z)?sh" \
  --include=package.json --include=composer.json --include=*.sh --include=Makefile \
  --include=Dockerfile --include=*.yml --include=*.yaml .
```

A `curl … | sh` without a pinned checksum or signature check → finding.

## 3. Registry signatures and provenance

- npm: `npm audit signatures` verifies registry signatures and provenance attestations of
  installed packages (needs an existing `node_modules`; never install to get one).
- pnpm: `pnpm audit signatures` verifies against lockfile integrity.
- Lockfile `resolved` URLs pointing to a registry other than the expected one, `http://`
  sources, or git dependencies without a commit SHA → finding.

## 4. Typosquatting and newly added packages

Scope: packages added on the audited branch (`git diff <base>...HEAD -- <manifest> <lockfile>`).
For each new name:

- compare against well-known names (one-character edits, swapped `-`/`_`, scope confusion
  such as `@types-foo` vs `@types/foo`);
- check registry metadata: `npm view <pkg> time repository.url maintainers` (npm,
  https://docs.npmjs.com/cli/v11/commands/npm-view/); a first publish date days old, no
  repository, or a single new maintainer raises suspicion;
- query OSV / GitHub Advisory for malware records (`type=malware` on
  `https://api.github.com/advisories`; Composer flags malware in `composer audit`).

Suspicion without evidence → manual review, never a finding.

## 5. SBOM (option, not part of the default run)

Only when the owner asks, with the tool already present:

```bash
command -v syft && syft /path/to/project -o cyclonedx-json   # https://github.com/anchore/syft
command -v npm && npm sbom                                    # SPDX or CycloneDX, see npm sbom --help
```

OSV-Scanner can also emit SPDX / CycloneDX with `--all-packages`
(https://google.github.io/osv-scanner/usage/); read the exact `--format` value from
`osv-scanner --help` before using it. Write SBOM output next to the report, never over a
project file.
