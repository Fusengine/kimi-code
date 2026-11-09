---
name: scan-patterns-extra
description: Grep patterns for vulnerability detection - Python, Swift/iOS, Go, Rust
when-to-use: When scanning Python, Swift, Go, or Rust source code for security vulnerabilities
keywords: grep, patterns, python, swift, go, rust, injection, deserialization
priority: high
related: scan-patterns.md, owasp-top10.md
---

# Scan Patterns - Python, Swift/iOS & More

OWASP column = Top 10:2025 numbering (see owasp-top10.md).

## Python (18+ patterns)

### Code Execution / Command Injection
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `eval(` | CRITICAL | A05 |
| `exec(` | CRITICAL | A05 |
| `compile(.*exec` | HIGH | A05 |
| `os\.system(` | CRITICAL | A05 |
| `subprocess.*shell=True` | CRITICAL | A05 |
| `os\.popen(` | HIGH | A05 |

### Deserialization
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `pickle\.loads(` | HIGH | A08 |
| `yaml\.load\(` (sans Loader=) | HIGH | A08 |
| `marshal\.loads(` | HIGH | A08 |

### SQL Injection / TLS / Error Handling
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `cursor\.execute.*%` | HIGH | A05 |
| `cursor\.execute.*f"` | CRITICAL | A05 |
| `verify=False` | HIGH | A07 |
| `ssl\.CERT_NONE` | HIGH | A07 |
| `except:\s*pass` / `except Exception:\s*pass` | MEDIUM | A10 |

## Swift/iOS (15+ patterns)

### Insecure Storage
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `UserDefaults.*password` | HIGH | A06 |
| `UserDefaults.*token` | HIGH | A06 |
| `UserDefaults.*secret` | HIGH | A06 |

### Insecure HTTP / Weak Keychain
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `"http://` | MEDIUM | A04 |
| `NSAllowsArbitraryLoads` | HIGH | A02 |
| `kSecAttrAccessibleAlways` | HIGH | A02 |

### Weak Crypto / Secrets / Error Handling
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `kCCOptionECBMode` | MEDIUM | A04 |
| `CCAlgorithmDES` | HIGH | A04 |
| `let apiKey = "` | CRITICAL | A07 |
| `let secret = "` | CRITICAL | A07 |
| `try!` on security-relevant calls | MEDIUM | A10 |

## Go (12+ patterns)

### Command Injection / SQL
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `exec\.Command\(.*\+` | CRITICAL | A05 |
| `os/exec` with user input | HIGH | A05 |
| `fmt\.Sprintf.*SELECT` | CRITICAL | A05 |
| `db\.Query\(.*\+` | CRITICAL | A05 |

### TLS / Crypto / Error Handling
| Pattern | Severity | OWASP |
|---------|----------|-------|
| `InsecureSkipVerify.*true` | HIGH | A07 |
| `md5\.New\(\)` | MEDIUM | A04 |
| `sha1\.New\(\)` | MEDIUM | A04 |
| `_ = err` / `, _ := ` discarding `error` | MEDIUM | A10 |

## Rust

| Pattern | Severity | OWASP |
|---------|----------|-------|
| `\.unwrap\(\)` / `\.expect\(` in request handlers | MEDIUM | A10 |
| `danger_accept_invalid_certs\(true\)` | HIGH | A07 |
| `format!\(.*SELECT` passed to `query` | CRITICAL | A05 |
