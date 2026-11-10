---
name: security-headers
description: Use when auditing HTTP security headers (CSP with nonce/hash and strict-dynamic, HSTS, frame-ancestors, Referrer-Policy, Permissions-Policy, COOP/COEP/CORP), cookie attributes or CORS — in code (Next.js, Laravel, Astro, TanStack Start, Express, Django) or live on a URL the owner names.
---


<objective>
This skill audits HTTP security headers, cookie attributes and CORS configuration and
reports findings with framework-specific recommendations — it never modifies the audited
project. It covers Content-Security-Policy (strict nonce/hash policies, `strict-dynamic`,
`report-to`), Strict-Transport-Security, X-Content-Type-Options, frame control
(`frame-ancestors` over the obsolete X-Frame-Options), Referrer-Policy, Permissions-Policy,
COOP/COEP/CORP, cookie prefixes and flags, CORS origin handling, and the deprecated
X-XSS-Protection. Values come from OWASP ASVS 5.0.0 V3, the OWASP HTTP Headers and CSP
cheat sheets, MDN and hstspreload.org.

It can also verify the headers and cookies a running URL actually serves (curl fast path,
then one fuse-browser session when rendering is needed), only on URLs the owner named.
</objective>

# Security Headers Skill

## Severity input

The severity scale for findings is the one in `rules/security-rules.md`; this section is an
input to it. A missing hardening header with no shown attack path is **not a finding** — it
goes to the report's "Hardening notes" section, without severity. It becomes a finding only
with a concrete attack path (XSS sink + no effective CSP, frameable
state-changing page, credentialed CORS reflection on private data, session cookie without
`Secure` on an HTTP-reachable site). Absence of `X-XSS-Protection` or `X-Frame-Options`
(when `frame-ancestors` is set) is never a finding.

## Workflow

1. **Detect** the framework and where headers are set:

   | Framework | Where to look |
   |-----------|---------------|
   | Next.js | `next.config.*` `headers()`, `proxy.ts` (formerly `middleware.ts`) |
   | Laravel | Custom middleware appended in `bootstrap/app.php`; web server config |
   | Astro | `astro.config.*` `security.csp`, adapter `staticHeaders`, `src/middleware.*`, host config |
   | TanStack Start | `src/start.ts` request middleware, `setResponseHeader(s)` calls |
   | Express | `helmet` usage, `res.setHeader` |
   | Django | `SECURE_*`, `X_FRAME_OPTIONS`, CSP middleware settings |
   | Any | Reverse proxy / CDN config (nginx `add_header … always`, Vercel/Netlify headers files) |

2. **Compare** each header, cookie and CORS rule with [Headers Reference](references/headers-reference.md).
3. **Live check** (only if the owner gave a URL) with [Live Verification](references/live-verification.md) — config in code can be overridden by the proxy/CDN; the served response wins.
4. **Refute** each candidate in a second read-only pass (header set at another layer? route excluded on purpose? API-only JSON where CSP is irrelevant?).
5. **Report** to `docs/security/YYYY-MM-DD-<scope>.md` in the audited repository, with recommended snippets from [Config Templates](references/templates/headers-config.md).

## Finding format (shared contract)

id (`HDR-NNN`), title, severity (CRITICAL / HIGH / MEDIUM / LOW), confidence 1-10 (only ≥ 8
reported; lower → "needs manual review"), CWE, standard (OWASP Top 10:2025 A02 Security
Misconfiguration or A01 for CORS data exposure; OWASP ASVS 5.0.0 `v5.0.0-3.x.y`), file:line
or URL, evidence (header line, secrets redacted), exploit scenario, recommendation.

## References

- [Headers Reference](references/headers-reference.md) — values, sources, severity rules, cookies, CORS
- [Config Templates](references/templates/headers-config.md) — Next.js, Laravel, Astro, TanStack Start (verified); Express, Django (not re-verified)
- [Live Verification](references/live-verification.md) — curl + fuse-browser procedure for an owner-named URL
