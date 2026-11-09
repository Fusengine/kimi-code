---
name: scan-patterns
description: Grep patterns for vulnerability detection - JavaScript/TypeScript and PHP
when-to-use: When scanning JS/TS or PHP source code for security vulnerabilities
keywords: grep, patterns, xss, sqli, rce, injection, secrets, javascript, php
priority: high
related: scan-patterns-extra.md, owasp-top10.md
---

# Scan Patterns - JavaScript/TypeScript & PHP

OWASP column = Top 10:2025 numbering (see owasp-top10.md).

## JavaScript/TypeScript (25+ patterns)

### XSS (Cross-Site Scripting)
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `innerHTML\s*=` | HIGH | A05 |
| `dangerouslySetInnerHTML` | HIGH | A05 |
| `document\.write(` | HIGH | A05 |
| `\.outerHTML\s*=` | HIGH | A05 |

### Code Execution
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `eval(` | CRITICAL | A05 |
| `new Function(` | CRITICAL | A05 |
| `setTimeout\("` (string arg) | HIGH | A05 |
| `setInterval\("` (string arg) | HIGH | A05 |

### Command Injection
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `child_process` | HIGH | A05 |
| `exec(` | CRITICAL | A05 |
| `execSync(` | CRITICAL | A05 |
| `shell:\s*true` | HIGH | A05 |

### SQL Injection
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `` `SELECT.*\$\{` `` | CRITICAL | A05 |
| `query(.*\+.*req\.` | CRITICAL | A05 |

### Weak Cryptography / Secrets / SSRF
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `Math\.random()` | MEDIUM | A04 |
| `createHash\('md5'\)` | MEDIUM | A04 |
| `createHash\('sha1'\)` | MEDIUM | A04 |
| `apiKey\s*=\s*["']` | CRITICAL | A07 |
| `AKIA[0-9A-Z]{16}` | CRITICAL | A07 |
| `password\s*=\s*["']` | CRITICAL | A07 |
| `fetch\(req\.` | HIGH | A01 |
| `axios\.get\(req\.` | HIGH | A01 |

### Supply Chain / Exceptional Conditions
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `"(\*\|latest)"` as dependency version | HIGH | A03 |
| `npm install` in CI (instead of `npm ci`) | MEDIUM | A03 |
| `uses: .*@(main\|master)` in `.github/workflows` | HIGH | A03 |
| `catch\s*(\(\w*\))?\s*\{\s*\}` | MEDIUM | A10 |
| `catch.*\{[^}]*(return true\|next\(\))` (fail-open) | CRITICAL | A10 |
| `res\.(send\|json)\(.*\.stack` | MEDIUM | A10 |

## PHP (20+ patterns)

### RCE / Code Execution
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `shell_exec(` | CRITICAL | A05 |
| `system(` | CRITICAL | A05 |
| `exec(` | CRITICAL | A05 |
| `passthru(` | CRITICAL | A05 |
| `popen(` | CRITICAL | A05 |
| `eval(` | CRITICAL | A05 |
| `assert(` | HIGH | A05 |
| `preg_replace.*/e` | CRITICAL | A05 |

### XSS / SQL Injection
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `\$_GET\[.*echo` | HIGH | A05 |
| `\$_POST\[.*echo` | HIGH | A05 |
| `\$_REQUEST\[.*echo` | HIGH | A05 |
| `mysql_query(` | CRITICAL | A05 |
| `\$sql\s*=.*\$_` | CRITICAL | A05 |
| `->whereRaw\(.*\$` | HIGH | A05 |

### LFI/RFI / Deserialization
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `include\(\$` | HIGH | A01 |
| `require\(\$` | HIGH | A01 |
| `include.*\$_GET` | CRITICAL | A01 |
| `unserialize\(\$_` | CRITICAL | A08 |

### Exceptional Conditions
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `catch\s*\(\\?\w*Exception \$\w+\)\s*\{\s*\}` | MEDIUM | A10 |
| `@\$` / `@\w+\(` (error suppression) | MEDIUM | A10 |
| `display_errors\s*=\s*(On\|1)` | HIGH | A02 |
