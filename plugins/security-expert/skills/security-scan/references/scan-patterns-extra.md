---
name: scan-patterns-extra
description: Manual grep patterns for Python, Swift/iOS, Go and Rust with CWE, OWASP 2025, severity and false-positive notes
when-to-use: When the automated scanner did not report Python, Swift, Go or Rust files as scanned, or to complete its first pass on those languages
keywords: grep, patterns, python, django, flask, swift, ios, go, rust, injection, deserialization, tls
priority: high
related: scan-patterns.md, scan-patterns-other.md, secrets-patterns.md, triage.md, owasp-top10.md
---

# Scan Patterns - Python, Swift/iOS, Go, Rust

Same reading rules as [scan-patterns.md](scan-patterns.md): `rg -n` with the glob given per
language; `\|` in tables is the Markdown escape for `|`; **H** = heuristic; severity is the maximum
when attacker input reaches the sink and is confirmed in the [triage pass](triage.md). Secrets:
[secrets-patterns.md](secrets-patterns.md).

## Python (`--glob '*.{py,pyi}'`; templates `*.{html,jinja,j2}`; exclude `.venv`, `site-packages`)

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `\b(eval\|exec)\(` | executes code | CRITICAL | CWE-95 / A05 | constant strings; methods such as `cursor.execute(` do not match (word boundary) |
| `os\.(system\|popen)\(` | shell command | CRITICAL | CWE-78 / A05 | constant command |
| `subprocess\.\w+\(.*shell\s*=\s*True` | shell string | CRITICAL | CWE-78 / A05 | constant command string |
| `pickle\.loads?\(\|cPickle\|marshal\.loads?\(\|shelve\.open\(` | code execution on load | CRITICAL | CWE-502 / A08 | data written and read by the same trusted process |
| `yaml\.load\(` without `Loader=yaml.SafeLoader` / `CSafeLoader` (read the call) ; `yaml\.unsafe_load\(` | arbitrary object construction | HIGH | CWE-502 / A08 | `yaml.safe_load(` |
| `jsonpickle\.decode\(` | object construction | HIGH | CWE-502 / A08 | trusted input |
| `\.execute\(\s*f["']\|\.execute\(\s*["'][^"']*["']\s*(%\|\.format)` | formatted SQL | CRITICAL | CWE-89 / A05 | `execute("... %s", (param,))` with a params tuple is safe |
| `\.(raw\|extra)\(\|RawSQL\(` (Django) | raw SQL fragments | HIGH | CWE-89 / A05 | params list passed separately |
| `render_template_string\(` (Flask) | server-side template injection when the template comes from input | CRITICAL | CWE-1336 / A05 | constant template string |
| `mark_safe\(\|Markup\(\|autoescape\s+(off\|false)` | autoescaping disabled | HIGH | CWE-79 / A05 | trusted constant HTML |
| `[\|]\s*safe\b` (Django/Jinja `safe` filter; the class matches a literal pipe) | autoescaping disabled for one value | HIGH | CWE-79 / A05 | trusted constant HTML |
| `verify\s*=\s*False\|ssl\._create_unverified_context\|CERT_NONE` | TLS validation disabled | HIGH | CWE-295 / A07 | local test servers in tests |
| `(send_file\|open)\(.*request\.(args\|form\|values\|json\|GET\|POST)` (H) | user-controlled path | HIGH | CWE-22 / A01 | `safe_join` / allowlist used |
| `requests\.\w+\(.*request\.(args\|form\|values\|json\|GET\|POST)` (H) | user-controlled outbound URL | HIGH | CWE-918 / A01 | only the path or a query value is user-controlled |
| `DEBUG\s*=\s*True` in settings; `ALLOWED_HOSTS\s*=\s*\[\s*['"]\*` | Django debug / host header | HIGH / MEDIUM | CWE-489 / A02 | local settings module |
| `\brandom\.(random\|randint\|choice\|getrandbits)\(` (H) | not a CSPRNG for tokens | MEDIUM | CWE-338 / A04 | non-security use; `secrets` module is the CSPRNG |
| `hashlib\.(md5\|sha1)\(` | weak hash for security uses | MEDIUM | CWE-327 / A04 | checksums, cache keys |
| `tempfile\.mktemp\(` | race on temporary file name | MEDIUM | CWE-377 / A01 | none common |
| `^\s*assert\s+.*(auth\|admin\|permission\|is_)` (H) | asserts are stripped with `-O` | HIGH | CWE-617 / A10 | tests |
| `except(\s+Exception)?\s*:\s*pass` | swallowed error | MEDIUM | CWE-390 / A10 | best-effort cleanup |
| `resolve_entities\s*=\s*True` (lxml) | XXE | HIGH | CWE-611 / A02 | trusted XML |

## Swift / iOS (`--glob '*.{swift,m,mm,plist,entitlements}'`)

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `UserDefaults.*(password\|token\|secret\|apiKey)` | cleartext storage outside the Keychain | HIGH | CWE-312 / A06 | non-secret flags with similar names |
| `NSAllowsArbitraryLoads` then read the following `<true/>` | App Transport Security disabled | HIGH | CWE-319 / A02 | scoped `NSExceptionDomains` for a documented host |
| `kSecAttrAccessibleAlways` | Keychain item readable while locked (deprecated constant) | HIGH | CWE-922 / A01 | none common |
| `"http://` | cleartext transport | MEDIUM | CWE-319 / A04 | `http://localhost`, XML namespaces, doc links |
| `kCCOptionECBMode\|kCCAlgorithmDES\|CC_MD5\|Insecure\.(MD5\|SHA1)` | weak crypto | HIGH (MEDIUM for hashes) | CWE-327 / A04 | non-security checksums |
| `evaluateJavaScript\(.*\\\(` | string interpolation into JavaScript in a web view | HIGH | CWE-94 / A05 | interpolated values are constants |
| `loadHTMLString\(` (H) | untrusted HTML in a web view | MEDIUM | CWE-79 / A05 | bundled static HTML |
| `URLCredential\(trust:` inside a `didReceive challenge` handler (H) | certificate accepted without evaluation | HIGH | CWE-295 / A07 | pinning code that evaluates the trust first |
| `(print\|NSLog\|os_log\|Logger\(.*\)\.\w+)\(.*(token\|password\|secret)` | secrets in device logs | MEDIUM | CWE-532 / A09 | the word appears only in a message label |
| `onOpenURL\|application\(_\s*\w*\s*:\s*UIApplication,\s*open` (H) | deep-link entry point: validate scheme, host, parameters | review | CWE-939 / A01 | none |
| `try!` (H) | crash on error in security-relevant paths | MEDIUM | CWE-248 / A10 | static resources guaranteed to exist |

## Go (`--glob '*.go'`; exclude `vendor/`)

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `exec\.Command(Context)?\([^)]*"(ba)?sh"\s*,\s*"-c"` | shell with a built string | CRITICAL | CWE-78 / A05 | constant script |
| `exec\.Command(Context)?\(.*\+` (H) | argument built from variables | HIGH | CWE-78 / A05 | arguments passed as separate slice elements without a shell are much safer |
| `(?i)fmt\.Sprintf\(\s*"\s*(SELECT\|INSERT\|UPDATE\|DELETE)` | formatted SQL | CRITICAL | CWE-89 / A05 | identifiers from an allowlist |
| `\.(Query\|QueryRow\|Exec)(Context)?\(.*"\s*\+` (H) | concatenated SQL (also matches `QueryContext(ctx, "..." + id)` and SQL containing commas) | CRITICAL | CWE-89 / A05 | `?` / `$1` placeholders with args |
| `template\.(HTML\|JS\|URL\|CSS)\(` | bypasses `html/template` escaping | HIGH | CWE-79 / A05 | constants |
| `"text/template"` in HTTP handler packages (H) | no contextual HTML escaping | HIGH | CWE-79 / A05 | non-HTML output |
| `InsecureSkipVerify:\s*true` | TLS validation disabled | HIGH | CWE-295 / A07 | test helpers |
| `"crypto/(md5\|sha1\|des\|rc4)"` | weak primitives | MEDIUM | CWE-327 / A04 | non-security checksums |
| `"math/rand(/v2)?"` (H) | not a CSPRNG for tokens | MEDIUM | CWE-338 / A04 | non-security randomness; `crypto/rand` is the CSPRNG |
| `filepath\.Join\(.*r\.(URL\|Form\|PostForm)` (H) | path traversal | HIGH | CWE-22 / A01 | cleaned path checked against a root |
| `http\.(Get\|Post)\(.*r\.(URL\|Form)` (H) | SSRF | HIGH | CWE-918 / A01 | host fixed by the code |
| `_\s*=\s*err\b\|,\s*_\s*:?=\s*\w+\.\w+\(` (H) | discarded error | MEDIUM | CWE-252 / A10 | functions that do not return an error in that slot |

## Rust (`--glob '*.rs'`; exclude `target/`)

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `(?i)format!\(\s*"\s*(SELECT\|INSERT\|UPDATE\|DELETE)` then passed to `query`/`execute` | formatted SQL | CRITICAL | CWE-89 / A05 | sqlx `query!` macros and `.bind()` are parameterized |
| `Command::new\(\s*"(ba)?sh"\s*\)` with `.arg\("-c"\)` | shell with a built string | CRITICAL | CWE-78 / A05 | constant script |
| `danger_accept_invalid_(certs\|hostnames)\(\s*true` | TLS validation disabled | HIGH | CWE-295 / A07 | tests |
| `unsafe\s*\{` (H) | memory-safety boundary to review | review | CWE-119 | FFI wrappers with documented invariants |
| `\.unwrap\(\)\|\.expect\(` in request handlers (H) | panic on attacker-controlled input | MEDIUM | CWE-248 / A10 | values proven present; tests |
| `Path::new\(.*\)\.join\(` with request data (H) | path traversal (an absolute component replaces the base) | HIGH | CWE-22 / A01 | canonicalized and prefix-checked |
