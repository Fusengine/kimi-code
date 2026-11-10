---
name: scan-patterns-other
description: Base manual grep patterns for Ruby/Rails, Java, Kotlin/Android and C#/.NET with CWE, OWASP 2025, severity and false-positive notes
when-to-use: When the repository contains Ruby, Java, Kotlin or C# code that the automated scanner did not report as scanned
keywords: grep, patterns, ruby, rails, java, spring, kotlin, android, csharp, dotnet, injection, deserialization
priority: medium
related: scan-patterns.md, scan-patterns-extra.md, secrets-patterns.md, triage.md, owasp-top10.md
---

# Scan Patterns - Ruby, Java, Kotlin, C# (base set)

A base set, not exhaustive: for deep coverage of these stacks, run an optional SAST engine
([sast-tools.md](sast-tools.md)) when present. Same reading rules as
[scan-patterns.md](scan-patterns.md); `\|` in tables is the Markdown escape for `|`; **H** =
heuristic; severity is confirmed in the [triage pass](triage.md).

## Ruby / Rails (`--glob '*.{rb,erb,haml,slim,rake}'`)

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `\b(eval\|instance_eval\|class_eval\|module_eval)\b` | code evaluation | CRITICAL | CWE-95 / A05 | blocks (`class_eval do`) with no user data |
| `\b(system\|exec\|spawn)\(?.*#\{\|%x[\(\{\[]\|IO\.popen\|Open3\.` | shell with interpolation | CRITICAL | CWE-78 / A05 | array form with separate arguments |
| `\.(where\|order\|group\|having\|joins\|pluck\|find_by_sql\|exists\?)\(\s*["'][^"']*#\{` | interpolated SQL fragment | CRITICAL | CWE-89 / A05 | `where("a = ?", v)` / hash conditions are parameterized |
| `\.html_safe\b\|\braw\(\|<%==` | escaping disabled | HIGH | CWE-79 / A05 | constants |
| `params\.permit!` | mass assignment of every attribute | HIGH | CWE-915 / A08 | none common |
| `skip_before_action\s+:verify_authenticity_token\|protect_from_forgery\s+with:\s*:null_session` (H) | CSRF disabled | MEDIUM | CWE-352 / A01 | token-authenticated JSON APIs |
| `\.(constantize\|safe_constantize)\b\|\.(send\|public_send)\(\s*params` | user-chosen class or method | HIGH | CWE-470 / A05 | allowlisted values |
| `Marshal\.load\|YAML\.unsafe_load\|Oj\.load` (H) | object deserialization | CRITICAL | CWE-502 / A08 | trusted data only |
| `render\s+(inline\|file):.*params` | template/file injection | CRITICAL | CWE-1336 / A05 | none common |
| `redirect_to\s+params` | open redirect | MEDIUM | CWE-601 / A01 | `only_path: true` |

## Java (`--glob '*.{java,jsp,xml,properties,yml,yaml}'`)

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `Runtime\.getRuntime\(\)\.exec\(\|new ProcessBuilder\(` (H) | process execution | CRITICAL with input | CWE-78 / A05 | constant command array |
| `\.(executeQuery\|executeUpdate\|execute\|addBatch)\(\s*"[^"]*"\s*\+` | concatenated JDBC SQL | CRITICAL | CWE-89 / A05 | `PreparedStatement` with `?` |
| `create(Native)?Query\(\s*"[^"]*"\s*\+` | concatenated JPQL/SQL | CRITICAL | CWE-89 / A05 | named parameters |
| `new ObjectInputStream\(\|\.readObject\(\|XMLDecoder\|enableDefaultTyping\|activateDefaultTyping` | unsafe deserialization | CRITICAL | CWE-502 / A08 | trusted local data; class allowlist filter |
| `DocumentBuilderFactory\.newInstance\(\)\|SAXParserFactory\.newInstance\(\)\|XMLInputFactory\.newInstance\(\)` (H) | XXE unless DTDs/external entities are disabled | HIGH | CWE-611 / A02 | `setFeature(...disallow-doctype-decl, true)` nearby |
| `MessageDigest\.getInstance\(\s*"(MD5\|SHA-?1)"` | weak hash | MEDIUM | CWE-327 / A04 | checksums |
| `Cipher\.getInstance\(\s*"(DES\|DESede\|RC4\|[^"]*ECB[^"]*\|AES)"` | weak cipher or ECB (bare `"AES"` uses the provider default mode) | HIGH | CWE-327 / A04 | `"RSA/ECB/OAEP..."` is RSA transformation naming, not block-cipher ECB: not a finding |
| `new Random\(` (H) | not a CSPRNG for tokens | MEDIUM | CWE-338 / A04 | non-security use; `SecureRandom` |
| `checkServerTrusted[^{]*\{\s*\}\|ALLOW_ALL_HOSTNAME_VERIFIER\|NoopHostnameVerifier` | TLS validation disabled | HIGH | CWE-295 / A07 | tests |
| `csrf\(\)\.disable\(\)\|csrf\(\s*\w+::disable\s*\)\|csrf\(\s*csrf\s*->\s*csrf\.disable\(\)` (H) | Spring CSRF disabled | MEDIUM | CWE-352 / A01 | stateless bearer-token APIs |
| `@CrossOrigin\(\s*(origins\s*=\s*)?"\*"` | any origin allowed | MEDIUM | CWE-942 / A02 | public read-only endpoints |
| `parseExpression\(` (H) | SpEL injection when the expression comes from input | CRITICAL | CWE-917 / A05 | constant expressions |
| `InitialContext\(\)\.lookup\(\|\.lookup\(\s*\w*(request\|param)` (H) | JNDI lookup on user data | CRITICAL | CWE-74 / A05 | constant JNDI names |

## Kotlin / Android (`--glob '*.{kt,kts,java,xml}'`; `AndroidManifest.xml`)

JVM server patterns above apply to Kotlin too. Android-specific:

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `addJavascriptInterface\(` with `javaScriptEnabled\s*=\s*true\|setJavaScriptEnabled\(true\)` | bridge exposed to page JavaScript | HIGH | CWE-749 / A01 | web view loads only bundled content |
| `android:exported="true"` (H) | component reachable by other apps | MEDIUM | CWE-926 / A08 | launcher activity; permission-protected components |
| `android:debuggable="true"\|android:usesCleartextTraffic="true"\|android:allowBackup="true"` | debug, cleartext traffic, backup of app data | MEDIUM | CWE-489 / CWE-319 / A02 | debug build variants only |
| `MODE_WORLD_(READABLE\|WRITEABLE)` | world-accessible files | HIGH | CWE-732 / A01 | none common |
| `put(String\|StringSet)\(\s*"[^"]*(token\|password\|secret)` near `getSharedPreferences` (H) | secrets in cleartext preferences | HIGH | CWE-312 / A06 | encrypted storage wrapper |
| `Log\.(v\|d\|i\|w\|e)\(.*(token\|password\|secret)` | secrets in logcat | MEDIUM | CWE-532 / A09 | label only |

## C# / .NET (`--glob '*.{cs,cshtml,razor,config,json}'`)

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `Process\.Start\(` (H) | process execution | CRITICAL with input | CWE-78 / A05 | constant file name, `UseShellExecute = false`, separate arguments |
| `new SqlCommand\(\s*(\$"\|"[^"]*"\s*\+)` | interpolated or concatenated SQL | CRITICAL | CWE-89 / A05 | parameters collection used |
| `FromSqlRaw\(\s*\$"\|ExecuteSqlRaw\(\s*\$"` | EF Core raw SQL with interpolation | CRITICAL | CWE-89 / A05 | `FromSqlInterpolated` / `FromSql` with `FormattableString` are parameterized |
| `BinaryFormatter\|NetDataContractSerializer\|SoapFormatter\|LosFormatter\|TypeNameHandling\.(All\|Auto\|Objects\|Arrays)` | unsafe deserialization | CRITICAL | CWE-502 / A08 | `TypeNameHandling.None` |
| `Html\.Raw\(\|@\(\(MarkupString\)` | escaping disabled in Razor / Blazor | HIGH | CWE-79 / A05 | trusted constants |
| `ServerCertificate(Custom)?ValidationCallback\s*[+=]+.*=>\s*true` | TLS validation disabled | HIGH | CWE-295 / A07 | tests |
| `DtdProcessing\s*=\s*DtdProcessing\.Parse\|XmlResolver\s*=\s*new XmlUrlResolver` | XXE | HIGH | CWE-611 / A02 | trusted XML |
| `(MD5\|SHA1)\.Create\(\|new (MD5\|SHA1)CryptoServiceProvider` | weak hash | MEDIUM | CWE-327 / A04 | checksums |
| `new Random\(` (H) | not a CSPRNG for tokens | MEDIUM | CWE-338 / A04 | non-security use; `RandomNumberGenerator` |
| `\[IgnoreAntiforgeryToken\]` (H) | CSRF validation skipped | MEDIUM | CWE-352 / A01 | token-authenticated APIs |
| `\[AllowAnonymous\]` (H) | unauthenticated endpoint to review | review | CWE-862 / A01 | login, health, public pages |
