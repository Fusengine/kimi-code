---
name: scan-patterns-php
description: Manual grep patterns for PHP and Laravel (Blade, Eloquent, query builder, CSRF, mass assignment) with CWE, OWASP 2025, severity and false-positive notes
when-to-use: When the automated scanner did not report PHP files as scanned, or to complete its first pass on a PHP/Laravel codebase
keywords: grep, patterns, php, laravel, blade, eloquent, sqli, rce, lfi, deserialization, csrf, mass assignment
priority: high
related: scan-patterns.md, secrets-patterns.md, triage.md, owasp-top10.md
---

# Scan Patterns - PHP / Laravel

Same reading rules as [scan-patterns.md](scan-patterns.md): `rg -n --glob '*.php' '<regex>'`
(Blade: `--glob '*.blade.php'`), exclude `vendor/`, `storage/`, `bootstrap/cache/`; `\|` in tables
is the Markdown escape for `|`; **H** = heuristic; severity is the maximum when attacker input
reaches the sink and is confirmed in the [triage pass](triage.md). Secrets: [secrets-patterns.md](secrets-patterns.md).

## Command and code execution (A05)

| Regex | Why | Max sev | CWE | Common false positive |
|-------|-----|---------|-----|-----------------------|
| `\b(shell_exec\|system\|passthru\|popen\|proc_open\|pcntl_exec)\s*\(` | OS command execution | CRITICAL | CWE-78 | constant command; arguments wrapped in `escapeshellarg` |
| `(^\|[^>:$\w])exec\s*\(` | `exec()` runs a shell command | CRITICAL | CWE-78 | `$pdo->exec(` / `->exec(` are methods (SQL, not shell): excluded by the regex, re-check manually |
| `\x60[^\x60]*\$` | backtick operator executes a shell command | CRITICAL | CWE-78 | backticks inside comments or SQL strings |
| `\beval\s*\(` | evaluates PHP code | CRITICAL | CWE-95 | none common |
| `\bassert\s*\(\s*\$` | string assertions were evaluated as code on legacy PHP versions; check the project's PHP version | HIGH (legacy) | CWE-95 | modern PHP with boolean expressions |
| `preg_replace\s*\(\s*['"].*/[a-zA-Z]*e[a-zA-Z]*['"]\s*,` (H) | `/e` modifier evaluated the replacement on legacy PHP | HIGH (legacy) | CWE-95 | a trailing path segment such as `'/date'` matches too; read the actual flag set |
| `\bcreate_function\s*\(` | legacy eval wrapper | HIGH | CWE-95 | none common |

## XSS (CWE-79, A05)

| Regex | Why | Max sev | Common false positive |
|-------|-----|---------|-----------------------|
| `(echo\|print)\b.*\$_(GET\|POST\|REQUEST\|COOKIE\|SERVER)\[` | superglobal echoed without encoding | HIGH | wrapped in `htmlspecialchars(..., ENT_QUOTES)` |
| `\{!!.*!!\}` (Blade) | raw, unescaped Blade output | HIGH | trusted HTML from a sanitizer (HTMLPurifier) or a constant |
| `->with\(.*\$request` then raw output (H) | request data flowing to raw views | review | escaped `{{ }}` output |

Blade `{{ }}` escapes output; do not report it.

## SQL injection (CWE-89, A05)

| Regex | Why | Max sev | Common false positive |
|-------|-----|---------|-----------------------|
| `\bmysqli?_query\s*\(.*\$` | concatenated SQL in legacy API | CRITICAL | constant SQL |
| `->(query\|prepare)\s*\(\s*["'][^"']*\$\w+` | variable interpolated in PDO SQL | CRITICAL | interpolated identifier from an allowlist |
| `\$sql\s*=.*\$_(GET\|POST\|REQUEST\|COOKIE)` | superglobal in SQL string | CRITICAL | none common |
| `->(query\|prepare\|exec)\s*\(\s*["'][^"']*["']\s*\.` | SQL string concatenated with `.` | CRITICAL | concatenated constant or allowlisted identifier |
| `(DB::raw\|whereRaw\|selectRaw\|orderByRaw\|havingRaw\|groupByRaw)\s*\(\s*["'][^"']*(\$\|["']\s*\.)` | variable interpolated or concatenated into a Laravel raw fragment | HIGH | bindings passed as second argument: `whereRaw('a = ?', [$v])` |
| `DB::(select\|statement\|unprepared\|insert\|update\|delete)\s*\(\s*["'][^"']*\$` | variable inside raw Laravel SQL | CRITICAL | bindings array used |
| `->orderBy\(\s*\$request` (H) | column name from user input (no binding possible) | MEDIUM | allowlisted column names |

## Laravel specifics

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `\$guarded\s*=\s*\[\s*\]` | every attribute is mass assignable | MEDIUM | CWE-915 / A08 | model never filled from request data |
| `->(create\|update\|fill\|forceFill)\(\s*\$request->(all\|input)\(\)` | request payload mass-assigned (role, is_admin...) | HIGH | CWE-915 / A08 | restrictive `$fillable`; `$request->validated()` is the safe form |
| `validateCsrfTokens\(\s*except:\|protected \$except` in CSRF middleware (H) | routes excluded from CSRF protection | MEDIUM | CWE-352 / A01 | webhook routes that verify a provider signature |
| `APP_DEBUG\s*=\s*true` in a tracked `.env*` (not `.env.example`) | debug pages leak config and stack traces | HIGH | CWE-489 / A02 | local-only file not tracked by git |
| `->move\(.*getClientOriginalName\(\)` (H) | client-supplied file name kept on disk | HIGH | CWE-434 / A06 | stored outside the web root with a generated name |
| `Storage::disk\(['"]public['"]\)->put` + user extension (H) | uploaded executable content under a public path | HIGH | CWE-434 / A06 | MIME/extension allowlist validated |

Authentication, policies/gates and session settings: [auth-audit](../../auth-audit/SKILL.md).

## File inclusion, deserialization, XXE

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `\b(include\|require)(_once)?\s*\(?\s*\$` | dynamic include: LFI, RFI if `allow_url_include` | HIGH (CRITICAL with `$_GET`) | CWE-98 / A05 | path from a constant map |
| `file_get_contents\s*\(\s*\$_(GET\|POST\|REQUEST)` | arbitrary file read or SSRF | HIGH | CWE-22 / CWE-918 / A01 | none common |
| `\bunserialize\s*\(` (H) | object injection when input is attacker-controlled | CRITICAL | CWE-502 / A08 | `['allowed_classes' => false]` and trusted source |
| `phar://` (H) | phar metadata deserialization through file functions | HIGH | CWE-502 / A08 | none common |
| `LIBXML_NOENT` | external entity expansion | HIGH | CWE-611 / A02 | trusted XML only |

## Cryptography (A04)

| Regex | Why | Max sev | CWE | Common false positive |
|-------|-----|---------|-----|-----------------------|
| `\b(md5\|sha1)\s*\(.*(pass\|pwd)` | fast hash for passwords | HIGH | CWE-916 | none: use `password_hash` / `Hash::make` |
| `\b(rand\|mt_rand\|uniqid)\s*\(` (H) | not cryptographically secure for tokens | MEDIUM | CWE-338 | non-security use; `random_bytes` / `random_int` are the CSPRNG APIs |
| `==\s*\$\w*(hash\|token\|signature)` (H) | loose comparison and timing leak on secrets | MEDIUM | CWE-697 / CWE-208 | `hash_equals()` used |

## Exceptional conditions and configuration

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `catch\s*\([^)]*\$\w+\)\s*\{\s*\}` | swallowed exception (single or multi-catch `A\|B $e`) | MEDIUM | CWE-390 / A10 | best-effort cleanup |
| `catch\s*\([^)$]*\)\s*\{\s*\}` | swallowed exception without variable (PHP 8 non-capturing catch) | MEDIUM | CWE-390 / A10 | best-effort cleanup |
| `@\$\w+\|@\w+\(` (H) | error suppression operator | LOW | CWE-391 / A10 | `@` in docblock annotations (`@param`) is not code |
| `display_errors\s*=\s*(On\|1)` | errors shown to users in production | HIGH | CWE-209 / A10 | development ini files |
