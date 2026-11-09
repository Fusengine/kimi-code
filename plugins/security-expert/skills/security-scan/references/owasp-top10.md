---
name: owasp-top10
description: OWASP Top 10:2025 vulnerability categories with patterns, severity, and fixes
when-to-use: When mapping scan findings to OWASP categories or understanding vulnerability types
keywords: owasp, top10, vulnerability, mapping, categories, supply-chain, exceptional-conditions
priority: high
related: scan-patterns.md
---

# OWASP Top 10:2025 Mapping

Source: https://top10.owasp.org/2025/ (category pages + CWE lists in https://github.com/OWASP/Top10/tree/master/2025/docs/en).
Always cite findings as `Axx:2025` — never mix 2021 numbers into a 2025 report.

## A01:2025 Broken Access Control (includes SSRF)

- **Risk**: Unauthorized access to resources; SSRF (CWE-918) and CSRF (CWE-352) now live here
- **Patterns**: Missing auth checks, IDOR, path traversal, user-controlled outbound URLs
- **Grep**: `req.params.id` without ownership check, `../` in paths, `fetch(req.`, `axios.get(req.`, `curl.*\$`
- **Severity**: CRITICAL (authz bypass) / HIGH (SSRF)
- **Fix**: Deny by default, RBAC/ownership checks server-side; SSRF: URL allowlist, block internal IP ranges, disable redirects

## A02:2025 Security Misconfiguration

- **Risk**: Default configs, debug mode, verbose errors, XXE (CWE-611), permissive CORS (CWE-942), insecure cookie flags
- **Patterns**: Debug enabled in prod, ATS disabled, GraphQL introspection on, missing `Secure`/`HttpOnly`
- **Grep**: `DEBUG.*=.*true`, `NSAllowsArbitraryLoads`, `introspection:\s*true`, `Access-Control-Allow-Origin.*\*`, `resolve_entities=True`
- **Severity**: HIGH
- **Fix**: Hardened, repeatable config per environment; disable debug/introspection in prod; disable external entities

## A03:2025 Software Supply Chain Failures

- **Risk**: Vulnerable, unmaintained, or malicious components (CWE-1104, CWE-1395, CWE-477); compromised build/CI pipeline
- **Patterns**: Missing/uncommitted lockfile, unpinned versions, non-reproducible installs in CI, unpinned CI actions, piping remote scripts to a shell, untrusted install scripts
- **Grep**:
  - `"\*"` or `"latest"` as a version in `package.json` / `composer.json`
  - `npm install` (instead of `npm ci`), `bun install` without `--frozen-lockfile` in CI files
  - `uses: [^@]+@(main|master|v[0-9]+)$` in `.github/workflows/*.yml` (not pinned to a commit SHA)
  - `curl .*\| *(ba)?sh`, `wget .*\| *(ba)?sh`
  - `"(pre|post)install":` in third-party `package.json`
- **Tool**: native audit (`npm audit`, `composer audit`, `pip-audit`, `cargo audit`, `govulncheck`) + `osv-scanner` for lockfiles; generate an SBOM (CycloneDX/SPDX)
- **Severity**: varies (CRITICAL for known-exploited CVE or malicious package, HIGH for unpinned CI actions/missing lockfile)
- **Fix**: Commit lockfiles, install with `npm ci` / `--frozen-lockfile`, pin CI actions to SHAs, remove unused/unmaintained deps, staged rollouts

## A04:2025 Cryptographic Failures

- **Risk**: Weak algorithms, weak randomness, cleartext transmission (CWE-319), hardcoded crypto keys (CWE-321)
- **Patterns**: MD5/SHA1 for security, `Math.random()` for tokens, ECB/DES, plain `http://` for sensitive data
- **Grep**: `createHash('md5')`, `createHash('sha1')`, `Math.random()`, `kCCOptionECBMode`, `CCAlgorithmDES`, `"http://`
- **Severity**: HIGH
- **Fix**: Argon2id/bcrypt/scrypt for passwords, AES-GCM, `crypto.randomUUID()` / CSPRNG, TLS everywhere

## A05:2025 Injection

- **Risk**: SQL, NoSQL, OS command, LDAP, template injection, XSS (CWE-79), code eval (CWE-94/95)
- **Patterns**: String concatenation in queries, eval/exec, unescaped HTML sinks
- **Grep**: `SELECT.*\$\{`, `eval(`, `exec(`, `system(`, `innerHTML\s*=`, `dangerouslySetInnerHTML`
- **Severity**: CRITICAL (SQLi/RCE) / HIGH (XSS)
- **Fix**: Parameterized queries, safe APIs, context-aware output encoding, input validation

## A06:2025 Insecure Design

- **Risk**: Missing security controls by design; cleartext storage of sensitive data (CWE-311/312)
- **Patterns**: No rate limiting, no query depth/complexity limits, secrets in `UserDefaults`/`localStorage`
- **Grep**: no rate-limit middleware, missing `depthLimit`, `UserDefaults.*(password|token|secret)`
- **Severity**: MEDIUM to HIGH
- **Fix**: Threat modeling, secure design patterns, Keychain/secure storage

## A07:2025 Authentication Failures

- **Risk**: Broken auth, hardcoded credentials (CWE-798/259), improper certificate validation (CWE-295), session fixation (CWE-384)
- **Patterns**: Plaintext passwords, hardcoded API keys, weak JWT, TLS verification disabled
- **Grep**: `password\s*=\s*["']`, `apiKey\s*=\s*["']`, `AKIA[0-9A-Z]{16}`, `verify=False`, `InsecureSkipVerify.*true`, `rejectUnauthorized:\s*false`
- **Severity**: CRITICAL
- **Fix**: Secrets manager, strong hashing, MFA, token rotation, never disable certificate validation

## A08:2025 Software or Data Integrity Failures

- **Risk**: Untrusted deserialization (CWE-502), unsigned updates (CWE-494), code from untrusted sources (CWE-829)
- **Patterns**: pickle/unserialize/yaml.load on untrusted data, CDN scripts without SRI
- **Grep**: `pickle.loads(`, `unserialize(\$_`, `yaml.load(`, `<script src="https?://` without `integrity=`
- **Severity**: HIGH
- **Fix**: Signed artifacts/serialization, safe loaders, Subresource Integrity

## A09:2025 Security Logging and Alerting Failures

- **Risk**: No audit trail, no alerting on attacks, sensitive data in logs (CWE-532), log injection (CWE-117)
- **Patterns**: Missing auth/failure logging, PII or secrets in logs, logs with no alert path
- **Grep**: `console.log.*password`, `logger.*(token|secret)`, auth handlers without logging
- **Severity**: MEDIUM
- **Fix**: Structured logging, PII redaction, alerting on security events

## A10:2025 Mishandling of Exceptional Conditions

- **Risk**: Failing open (CWE-636), swallowed errors (CWE-390/391/703/754/755), error messages leaking internals (CWE-209), uncaught exceptions (CWE-248), unchecked return values (CWE-252)
- **Grep**:
  - JS/TS: `catch\s*(\(\w*\))?\s*\{\s*\}`, `catch.*\{[^}]*(return true|next\(\))`, `res\.(send|json)\(.*(err|error)\.stack`
  - Python: `except:\s*pass`, `except Exception:\s*pass`
  - PHP: `catch\s*\(\\?\w*Exception \$\w+\)\s*\{\s*\}`, `@\$` / `@\w+\(` (error suppression)
  - Go: `_ = err`, `, _ := ` on calls returning `error`
  - Rust: `.unwrap()` / `.expect(` on request-path code
  - Swift: `try!`, `try?` discarding security-relevant errors
- **Severity**: CRITICAL (fail-open in authz/authn/payment), MEDIUM (stack trace leak, empty catch)
- **Fix**: Fail closed, handle errors where they occur + global handler, roll back partial transactions, generic user-facing errors, rate limits/resource quotas

## 2021 → 2025 Migration

| 2021 | 2025 |
|------|------|
| A02 Cryptographic Failures | A04 Cryptographic Failures |
| A03 Injection | A05 Injection |
| A04 Insecure Design | A06 Insecure Design |
| A05 Security Misconfiguration | A02 Security Misconfiguration |
| A06 Vulnerable and Outdated Components | A03 Software Supply Chain Failures (expanded) |
| A07 Identification and Authentication Failures | A07 Authentication Failures |
| A09 Security Logging and Monitoring Failures | A09 Security Logging and Alerting Failures |
| A10 Server-Side Request Forgery | merged into A01 Broken Access Control |
| — | A10 Mishandling of Exceptional Conditions (new) |
