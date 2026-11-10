---
name: scan-patterns
description: Manual grep patterns for JavaScript/TypeScript (Node, Bun, React, Next.js, TanStack Start, Vue, Svelte, Astro) with CWE, OWASP 2025, severity and false-positive notes
when-to-use: When the automated scanner did not report JS/TS-family files as scanned, or to complete its first pass on a JS/TS codebase
keywords: grep, patterns, xss, sqli, rce, ssrf, javascript, typescript, nextjs, server actions, tanstack start, astro, react
priority: high
related: scan-patterns-php.md, scan-patterns-extra.md, scan-patterns-other.md, secrets-patterns.md, triage.md, owasp-top10.md
---

# Scan Patterns - JavaScript / TypeScript family

## How to read these tables

- Run with `rg -n --glob '*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,vue,svelte,astro}' -e '<regex>' <dir>`
  (exclude `node_modules`, build output such as `dist/`, `.next/`, `.output/`). Always pass the
  regex with `-e`, so a regex starting with `-` is not read as a flag.
- When a section heading names one CWE and one OWASP category, they apply to every row of that
  section; otherwise each row carries its own.
- Regexes use Rust regex syntax (no lookaround). In tables, `\|` is only the Markdown escape for
  `|`: type a plain `|`.
- A match is a lead, never a finding. Severity is the maximum when attacker-controlled input
  reaches the sink; the verified severity comes from the [triage pass](triage.md).
- **H** = heuristic: the regex finds a place to read, not a vulnerable construct.
- OWASP = Top 10:2025 ([owasp-top10.md](owasp-top10.md)). Secrets: [secrets-patterns.md](secrets-patterns.md).

## XSS and raw HTML sinks (CWE-79, A05)

| Regex | Why | Max sev | Common false positive |
|-------|-----|---------|-----------------------|
| `dangerouslySetInnerHTML` | React renders the string as HTML, bypassing JSX escaping | HIGH | value passed through DOMPurify/sanitize-html, or a build-time constant |
| `\.(innerHTML\|outerHTML)\s*\+?=` | DOM HTML sink | HIGH | constant template; value already escaped |
| `insertAdjacentHTML\(\|document\.write(ln)?\(` | DOM HTML sinks | HIGH | static strings in build scripts |
| `set:html=` (`.astro`) | Astro does not escape `set:html` values (https://docs.astro.build/en/reference/directives-reference/) | HIGH | `JSON.stringify(...)` of trusted data for JSON-LD; check `</script>` break-out if data is user-supplied |
| `v-html=` (`.vue`) | Vue raw HTML binding | HIGH | sanitized or static content |
| `\{@html ` (`.svelte`) | Svelte raw HTML tag | HIGH | sanitized or static content |
| `bypassSecurityTrust(Html\|Script\|Style\|Url\|ResourceUrl)` | Angular sanitizer bypass | HIGH | constant values |
| `href=\{[^}]*\}` (H) | `javascript:` URL if a user value reaches `href` | MEDIUM | internal route constants |

React, Vue, Svelte and Astro escape normal interpolation (`{value}`); do not report it as XSS.

## Code execution (CWE-94 / CWE-95, A05)

| Regex | Why | Max sev | Common false positive |
|-------|-----|---------|-----------------------|
| `\beval\(` | evaluates a string as code | CRITICAL | method calls such as `redis.eval(` (Lua on the server), dev tooling |
| `new Function\(` | same as eval | CRITICAL | bundler/runtime internals in vendored code |
| `set(Timeout\|Interval)\(\s*["'\x60]` | string argument is evaluated | HIGH | none common |
| `\bvm\.(runIn\w*Context\|Script\|compileFunction)\(` | Node `vm` is not a sandbox for untrusted code | CRITICAL | trusted templates only |

## Command injection (CWE-78, A05)

| Regex | Why | Max sev | Common false positive |
|-------|-----|---------|-----------------------|
| `\bexec(Sync)?\(\s*(\x60\|["'][^"']*["']\s*\+\|[^"'\x60)]*\+)` | shell string built from variables | CRITICAL | `regex.exec(` and `db.exec(` (not processes): check the receiver |
| `shell:\s*true` | `spawn`/`execFile` through a shell | HIGH | constant command, no user data |
| `from ['"](node:)?child_process['"]\|require\(['"](node:)?child_process` (H) | locates process APIs to review | review | build scripts that never take request data |

## SQL / NoSQL injection (CWE-89 / CWE-943, A05)

| Regex | Why | Max sev | Common false positive |
|-------|-----|---------|-----------------------|
| `\.(query\|execute\|raw)\(\s*\x60[^\x60]*\$\{` | template literal passed to a query function | CRITICAL | tagged templates such as `` sql`...${x}` `` or Prisma `` $queryRaw`...` `` are parameterized |
| `\$(queryRawUnsafe\|executeRawUnsafe)\(` | Prisma raw string APIs | CRITICAL | constant SQL with `$1` placeholders and separate args |
| `\b(sql\.raw\|knex\.raw\|\.whereRaw\|sequelize\.literal\|Sequelize\.literal)\(` | raw fragments in query builders | HIGH | constants; bindings passed separately |
| `\$where\|\$function` | MongoDB server-side JavaScript | HIGH | constant expressions |
| `\.(find\|findOne\|updateOne\|deleteMany)\(\s*req\.(body\|query)` | operator injection (`{"$ne": null}`) | HIGH | body validated by a schema (zod, valibot) before use |

## SSRF, path traversal, redirects (A01)

| Regex | Why | Max sev | CWE | Common false positive |
|-------|-----|---------|-----|-----------------------|
| `\b(fetch\|axios(\.\w+)?\|got\|ky\|request)\(\s*(req\.\|request\.\|params\.\|searchParams\|body\.\|input\.)` (H) | user controls the outbound URL | HIGH | CWE-918 | user controls only the path or a query value of a fixed host |
| `(readFile\|createReadStream\|sendFile\|download\|unlink\|writeFile)\w*\(.*(req\.\|params\|query\|body)` (H) | user-controlled file path | HIGH | CWE-22 | value checked with `path.resolve` + prefix check, or mapped through an allowlist |
| `redirect\(\s*(req\.\|searchParams\|params\|body)` (H) | open redirect | MEDIUM | CWE-601 | relative path enforced, allowlist |
| `\b(merge\|extend\|defaultsDeep\|set)\(.*req\.body` (H) | prototype pollution via `__proto__` keys | MEDIUM | CWE-1321 | schema-validated body; `Object.create(null)` targets |

## Next.js (App Router)

Source: https://nextjs.org/docs/app/guides/data-security (read 2026-11-10).

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `['"]use server['"]` (H) | every exported Server Action is reachable by a direct POST, and a page-level auth check does not cover the actions defined in it: each action must authenticate and authorize itself | HIGH | CWE-862 / A01 | action delegates to a server-only data access layer that performs the check |
| `export\s+((async\s+)?function\|const)\s+(GET\|POST\|PUT\|PATCH\|DELETE)\b` in `app/**/route.{ts,js}` (H) | Route Handlers are public endpoints | HIGH | CWE-862 / A01 | public read-only data |
| `NEXT_PUBLIC_\w*(SECRET\|PRIVATE\|TOKEN\|PASSWORD\|KEY)` | `NEXT_PUBLIC_` variables are exposed to the client | HIGH | CWE-200 / A01 | keys that are public by design (publishable keys, analytics IDs) |
| `return\s+(await\s+)?(db\|prisma)\.` inside a `'use server'` file (H) | action return values are serialized to the client; raw records can leak fields | MEDIUM | CWE-200 / A01 | DTO with selected fields |

## TanStack Start

Source: https://tanstack.com/start/latest/docs/framework/react/guide/server-functions (read 2026-11-10).

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `createServerFn\(` (H) | server functions are RPC endpoints callable from the browser; each handler (or its middleware) must check authentication, authorization and input | HIGH | CWE-862 / A01 | auth enforced in attached middleware |
| file `src/start.ts` exists and `createCsrfMiddleware` does not appear in it (H) | Start installs its CSRF middleware for server functions automatically only when `src/start.ts` does not exist; a custom `src/start.ts` must add it explicitly | MEDIUM | CWE-352 / A01 | CSRF middleware added elsewhere in the same `createStart` |

## Cryptography and TLS

| Regex | Why | Max sev | CWE / OWASP | Common false positive |
|-------|-----|---------|-------------|-----------------------|
| `Math\.random\(` (H) | not a CSPRNG | MEDIUM (HIGH for tokens, IDs used as secrets) | CWE-338 / A04 | UI jitter, sampling, non-security IDs |
| `createHash\(\s*['"](md5\|sha1)['"]` | broken for signatures/passwords | MEDIUM | CWE-327 / CWE-328 / A04 | ETags, cache keys, non-security checksums |
| `createCipheriv\(\s*['"][^'"]*-ecb['"]` | ECB leaks plaintext patterns | HIGH | CWE-327 / A04 | none common |
| `rejectUnauthorized:\s*false\|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0` | TLS certificate validation disabled | HIGH | CWE-295 / A07 | local test servers in test files |

JWT, sessions, OAuth and password hashing: [auth-audit](../../auth-audit/SKILL.md). Headers, CSP and
CORS configuration: [security-headers](../../security-headers/SKILL.md). Dependencies and lockfiles:
[dependency-audit](../../dependency-audit/SKILL.md).

## Exceptional conditions (A10)

| Regex | Why | Max sev | CWE | Common false positive |
|-------|-----|---------|-----|-----------------------|
| `catch\s*(\([^)]*\))?\s*\{\s*\}` | swallowed error | MEDIUM | CWE-390 | best-effort cleanup (log close, temp delete) |
| `catch[^{]*\{[^}]*(return true\|next\(\))` (H) | fail-open in a guard | CRITICAL in authn/authz/payment | CWE-636 | non-security middleware |
| `res\.(send\|json)\(.*\.stack` | stack trace returned to client | MEDIUM | CWE-209 | dev-only handler guarded by environment check |
