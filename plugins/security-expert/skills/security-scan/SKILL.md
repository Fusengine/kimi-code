---
name: security-scan
description: "Use when scanning a codebase or a change for XSS, injection, command execution, SSRF, path traversal, weak crypto, hardcoded secrets, insecure deserialization or any OWASP Top 10:2025 vulnerability, and reporting verified findings."
---


<objective>
This skill finds and reports application-code vulnerabilities. It combines a first-pass
pattern scanner shipped in `@fusengine/harness`, manual per-language patterns, optional
presence-checked tools (secret scanners, SAST engines), and a read-only refutation pass that keeps
only findings with confidence ≥ 8 and a concrete exploit scenario. Findings are mapped to CWE and
OWASP Top 10:2025 (plus the API Security Top 10 2023 for API code) and written to
`docs/security/YYYY-MM-DD-<scope>.md` in the audited repository.

It reports; it never fixes. Verified findings, each with a re-test check, go back to the caller.
</objective>

# Security Scan Skill

## Workflow

1. **Scope.** Full repository by default. When asked to review a change (`--diff`, a PR, a
   branch), limit the scan to the files changed against the merge base and say so in the report
   header:
   `git diff --name-only $(git merge-base HEAD <base>)` (default `<base>`: the branch the caller
   names, else `origin/HEAD`). Unchanged files are read only to trace data flow, not reported.
2. **Detect** languages and frameworks from project markers (`package.json`, `composer.json`,
   `pyproject.toml`, `requirements.txt`, `Package.swift`, `*.xcodeproj`, `go.mod`, `Cargo.toml`,
   `Gemfile`, `pom.xml`, `build.gradle*`, `*.csproj`) and from the file extensions actually present
   (`git ls-files | rg -o '\.[A-Za-z0-9]+$' | sort | uniq -c`).
3. **Automated first pass:**
   `bun "${KIMI_CODE_HOME:-$HOME/.kimi-code}/node_modules/@fusengine/harness/dist/cli/bin.mjs" scan <dir>`
   This is a first-pass pattern scanner, not a complete audit. Read what its output says it
   scanned. If it prints a coverage summary, compare it with step 2: every language or file type
   present in the repository but not reported as scanned is covered with the manual patterns
   below. The scanner prints a coverage summary only in releases that include it; if it prints none,
   treat every detected language as not covered and apply the manual patterns to all of them. A single `language` field is not a
   coverage summary: a coverage summary lists the languages and the number of files scanned for
   each.
4. **Manual patterns** for the languages not covered (or to complete the first pass):
   - JS/TS family (`.js .jsx .mjs .cjs .ts .tsx .mts .cts .vue .svelte .astro`), Next.js, TanStack
     Start, React, Astro → [scan-patterns.md](references/scan-patterns.md)
   - PHP / Laravel → [scan-patterns-php.md](references/scan-patterns-php.md)
   - Python, Swift/iOS, Go, Rust → [scan-patterns-extra.md](references/scan-patterns-extra.md)
   - Ruby, Java, Kotlin/Android, C# → [scan-patterns-other.md](references/scan-patterns-other.md)
   - GraphQL endpoint present → [graphql-security.md](references/graphql-security.md)
5. **Secrets** in every repository, any language → [secrets-patterns.md](references/secrets-patterns.md)
   (single source of secret patterns; optional git-history scan with a presence-checked tool).
6. **Optional SAST** when an engine is already installed (`command -v semgrep opengrep codeql`),
   with its licence conditions → [sast-tools.md](references/sast-tools.md). Never install a tool.
7. **Triage** every candidate → [triage.md](references/triage.md): refutation pass (source → sink,
   framework protections, reachability, test/doc/generated file), confidence 1-10, report only
   ≥ 8 with an exploit scenario, 5-7 to "needs manual review", then a second read-only pass.
   Severity is set by impact and exploitability there; it overrides the scanner's raw label and the
   "max severity" columns of the pattern references.
8. **Map** to CWE and OWASP Top 10:2025 → [owasp-top10.md](references/owasp-top10.md).
9. **Report** with [the report template](references/templates/scan-report.md): shared finding
   fields, scanner coverage (what really ran, what was absent), needs manual review, and a
   re-test check per finding. A secret value is never printed.

## Hand-off

The skill does not edit code and does not dispatch fixes. Return the report path and the
verified findings (id, severity, confidence, CWE, standard reference, `file:line`, evidence,
exploit scenario, recommendation, re-test check) to the caller, which decides who fixes them.

## Out of scope (peer skills)

Dependencies and lockfiles → [dependency-audit](../dependency-audit/SKILL.md); single-package CVE
lookups → [cve-research](../cve-research/SKILL.md); JWT/session/OAuth/password flows →
[auth-audit](../auth-audit/SKILL.md); HTTP headers, CSP, CORS →
[security-headers](../security-headers/SKILL.md); AI-agent configuration (hooks, MCP, skills) →
[agentic-security](../agentic-security/SKILL.md).

## References

- [OWASP Top 10:2025 mapping + API Security Top 10 2023](references/owasp-top10.md)
- [Patterns - JavaScript / TypeScript family](references/scan-patterns.md)
- [Patterns - PHP / Laravel](references/scan-patterns-php.md)
- [Patterns - Python, Swift/iOS, Go, Rust](references/scan-patterns-extra.md)
- [Patterns - Ruby, Java, Kotlin, C#](references/scan-patterns-other.md)
- [Secret patterns and git-history scanning](references/secrets-patterns.md)
- [GraphQL security patterns](references/graphql-security.md) — load when the target exposes a GraphQL endpoint.
- [Optional SAST engines and licences](references/sast-tools.md)
- [Triage: refutation, confidence, severity](references/triage.md)
- [Report template](references/templates/scan-report.md)
