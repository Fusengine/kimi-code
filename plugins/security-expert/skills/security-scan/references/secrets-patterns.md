---
name: secrets-patterns
description: Single source of secret-detection patterns (private keys, cloud keys, tokens, committed env files) plus optional git-history scanning
when-to-use: When looking for hardcoded credentials, private keys, or committed .env files in any repository
keywords: secrets, credentials, private key, api key, token, env, gitleaks, betterleaks, trufflehog
priority: high
related: triage.md, sast-tools.md, owasp-top10.md
---

# Secret Patterns (single source)

Other skills and rules link here; do not copy this list elsewhere.

## Reporting rule (ZERO TOLERANCE)

A report NEVER prints a secret value, not even partially masked. Report only `file:line`, the secret
type (rule name below) and whether the file is tracked by git. Do not paste matching lines into the
report, logs or messages to other agents.

## Scope: what regex sees

These patterns run on the working tree only. A secret removed from the current files can still live
in git history, in other branches and in tags. For history, use the optional tools at the end
(presence-checked, never installed by the agent).

Run with `rg -n --hidden --no-ignore-vcs -e '<regex>'` (Rust regex syntax; no lookaround is
used). `-e` is required: the private-key regex starts with `-` and would otherwise be parsed as a
flag. `--no-ignore-vcs` matters: a `.env` committed before it was added to `.gitignore` is still
tracked, and plain `rg` would skip it. Alternative limited to tracked files:
`git ls-files -z | xargs -0 rg -n -e '<regex>'` (the patterns use Rust regex syntax, which
`git grep -E` rejects). In the tables, `\|` is only the Markdown escape for `|`: type a plain
`|` in the regex. Search all files, not only source globs: secrets sit in `.env*`, `*.json`,
`*.yml`, `*.toml`, `*.xml`, `*.plist`, `*.properties`, `*.ini`, `*.tf`, `*.tfvars`, notebooks and
shell scripts. Exclude `node_modules`, `vendor`, `.git` with `--glob '!node_modules'` etc.

## Private keys and certificates

| Rule | Regex | Severity | CWE |
|------|-------|----------|-----|
| private-key (PKCS#1 RSA, EC, DSA, OPENSSH, PKCS#8 generic, ENCRYPTED, PGP) | `-----BEGIN [A-Z ]*PRIVATE KEY( BLOCK)?-----` | CRITICAL | CWE-321 |
| key file present | file names `id_rsa`, `id_ed25519`, `id_ecdsa`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `*.keystore` | HIGH (verify content) | CWE-321 |

False positive: test fixtures in `test/`, `testdata/`, `fixtures/` with obviously fake keys, and
public keys / certificates (`BEGIN PUBLIC KEY`, `BEGIN CERTIFICATE` do not match the regex).
`ENCRYPTED PRIVATE KEY` is still reported: the passphrase is often next to it.

## Cloud provider keys

| Rule | Regex | Severity | CWE |
|------|-------|----------|-----|
| aws-access-key-id | `\b(AKIA\|ASIA)[0-9A-Z]{16}\b` | CRITICAL if a secret key is near | CWE-798 |
| aws-secret-access-key (heuristic) | `(?i)aws_?secret_?access_?key\s*[:=]\s*['"]?[A-Za-z0-9/+=]{40}` | CRITICAL | CWE-798 |
| gcp-service-account | `"type"\s*:\s*"service_account"` in a file that also contains `"private_key"` | CRITICAL | CWE-798 |
| google-api-key | `\bAIza[0-9A-Za-z_-]{35}\b` | HIGH (scope-dependent) | CWE-798 |
| azure-storage-connection-string | `DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=` | CRITICAL | CWE-798 |

False positive: AWS documentation example keys (they contain `EXAMPLE`); Google browser API keys
restricted by referrer are designed to ship to clients (still check restrictions).

## Common token formats

| Rule | Regex | Severity | CWE |
|------|-------|----------|-----|
| github-token | `\b(ghp\|gho\|ghu\|ghs\|ghr)_[A-Za-z0-9]{36}\b` | CRITICAL | CWE-798 |
| github-fine-grained-pat | `\bgithub_pat_[A-Za-z0-9_]{20,}` | CRITICAL | CWE-798 |
| gitlab-pat | `\bglpat-[A-Za-z0-9_-]{20,}` | CRITICAL | CWE-798 |
| slack-token | `\bxox[abposr]-[A-Za-z0-9-]{10,}` | HIGH | CWE-798 |
| slack-webhook | `https://hooks\.slack\.com/services/[A-Za-z0-9/]+` | MEDIUM | CWE-798 |
| stripe-secret | `\b(sk\|rk)_live_[A-Za-z0-9]{16,}` | CRITICAL | CWE-798 |
| stripe-test-secret | `\b(sk\|rk)_test_[A-Za-z0-9]{16,}` | LOW | CWE-798 |
| anthropic-key | `\bsk-ant-[A-Za-z0-9_-]{20,}` | CRITICAL | CWE-798 |
| openai-style-key (heuristic, broad) | `\bsk-(proj-)?[A-Za-z0-9_-]{20,}` | HIGH | CWE-798 |
| npm-token | `\bnpm_[A-Za-z0-9]{36}\b` | CRITICAL | CWE-798 |
| npmrc-auth | `_authToken\s*=\s*[^\s$]` in `.npmrc` | CRITICAL | CWE-798 |
| sendgrid-key | `\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}` | HIGH | CWE-798 |
| jwt (heuristic) | `\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}` | MEDIUM | CWE-798 |
| db-url-with-password | `(?i)\b(postgres(ql)?\|mysql\|mariadb\|mongodb(\+srv)?\|redis\|amqps?)://[^:/\s"']+:[^@/\s"']+@` | HIGH | CWE-798 |

Token prefixes are vendor formats; when a regex above is marked heuristic, the format is not
fixed enough to be conclusive. `pk_live_` / `pk_test_` (Stripe publishable) are public by design: do
not report. JWTs in tests and docs are usually sample tokens: check the payload (`exp`, `iss`)
without printing it.

## Generic assignments (heuristic)

| Rule | Regex | Severity | CWE |
|------|-------|----------|-----|
| generic-secret-assignment | `(?i)\b[\w-]*(password\|passwd\|pwd\|secret\|api_?key\|access_?token\|auth_?token\|private_?key)[\w-]*\s*[:=]\s*['"][^'"\s]{8,}['"]` | HIGH until triaged | CWE-798 / CWE-259 |
| swift-literal-key | `let\s+\w*(apiKey\|secret\|token)\w*\s*=\s*"[^"]{8,}"` | HIGH until triaged | CWE-798 |

False positive: placeholders (`changeme`, `your-api-key`, `xxx`, `<...>`, `${VAR}`, `process.env.X`,
`env('X')`, `os.environ[...]`), i18n strings such as `password: "Password"`, form field names,
and test fixtures. Values read from environment variables are not hardcoded secrets.

## Committed environment and credential files

```bash
git ls-files | rg '(^|/)\.env(\.[^/]*)?$' | rg -v '\.(example|sample|template|dist)$'
git ls-files | rg '(^|/)(\.npmrc|\.pypirc|\.netrc|\.git-credentials|credentials\.json|service-account.*\.json)$'
```

A tracked `.env` with real values is HIGH (CRITICAL with production credentials), CWE-538, OWASP
A02:2025. An untracked `.env` listed in `.gitignore` is normal: do not report it.

## Mapping

Hardcoded credentials (CWE-798, CWE-259) → A07:2025 Authentication Failures; hardcoded crypto keys
(CWE-321) → A04:2025 Cryptographic Failures; committed config files → A02:2025 (see
[owasp-top10.md](owasp-top10.md)). Severity is confirmed in the [triage pass](triage.md): a live
production credential is CRITICAL, a revoked or test-only credential is LOW.

## Optional: git history and broader secret scanners

Presence-check only: `command -v betterleaks gitleaks trufflehog`. Never install. If none is
present, say "git history not scanned" in the report's scanner coverage section.

| Tool | Status read today (2026-11-10) | Command (as read on the official page) |
|------|-------------------------------|----------------------------------------|
| Betterleaks | Maintained by the Gitleaks authors; `main` is v2 development and the README states that until the first stable v2 release package managers may still provide v1 (https://github.com/betterleaks/betterleaks) | check `betterleaks --version` first. v2: `betterleaks git <repo-path>` (history), `betterleaks fs <path>` (filesystem). v1 (https://github.com/betterleaks/betterleaks/tree/v1.x): `betterleaks git <repo-path>`, `betterleaks dir <path>` |
| Gitleaks | README warning: feature complete, future releases are security patches only, author points to Betterleaks (https://github.com/gitleaks/gitleaks) | not written: usage section not verified today |
| TruffleHog | AGPL-3.0 licence (badge and LICENSE on https://github.com/trufflesecurity/trufflehog) | `trufflehog git file://<repo-path> --no-verification` |

Validation modes contact the credential provider with the found secret (Betterleaks v2 `-v` /
`-a`, Betterleaks v1 `--validation`, TruffleHog verification, e.g. `--results=verified`: owner consent only). On Betterleaks v2, `-v` means validate, not verbose (v2 migration guide:
https://github.com/betterleaks/betterleaks/blob/main/docs/v2_migration.md). Do not enable them without the owner's explicit consent; Betterleaks
detection without validation is its default (same README). Tool output contains raw secrets: read it,
then report only `file:line`, commit and rule type.
