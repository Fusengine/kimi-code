---
name: headers-reference
description: HTTP security headers, cookie attributes and CORS reference with recommended values and their primary sources (OWASP ASVS 5.0.0 V3, OWASP HTTP Headers and CSP cheat sheets, MDN, hstspreload.org)
when-to-use: When auditing or recommending HTTP response headers, cookie attributes or CORS configuration
keywords: csp, nonce, strict-dynamic, report-to, hsts, cors, frame-ancestors, x-frame-options, referrer-policy, permissions-policy, coop, coep, corp, cookies
priority: high
related: templates/headers-config.md, live-verification.md
---

# Security Headers Reference

Read on 2026-11-10 from:
- **ASVS** — OWASP ASVS 5.0.0 V3 Web Frontend Security, https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md
- **OHH** — OWASP HTTP Security Response Headers Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- **OCSP** — OWASP Content Security Policy Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
- **MDN-XXSS** — https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- **HSTSP** — https://hstspreload.org/

## Severity input (final severity scale lives in `rules/security-rules.md`)

A missing or weak hardening header with no shown attack path is **not a finding**: list it
under "Hardening notes" (no severity). It becomes a finding only when a concrete attack path
is shown, e.g. a reflected/stored XSS sink plus no effective
CSP, a state-changing page that is frameable (clickjacking), a reflected `Origin` with
`Access-Control-Allow-Credentials: true` on an endpoint returning private data, or a session
cookie without `Secure` on a site reachable over HTTP.

## Content-Security-Policy

- **Recommended (strict, nonce)** — OCSP "Nonce-based Strict Policy":
  `script-src 'nonce-{RANDOM}' 'strict-dynamic'; object-src 'none'; base-uri 'none';`
  Hash-based variant: `script-src 'sha256-{HASH}' 'strict-dynamic'; object-src 'none'; base-uri 'none';`
- Nonce: unique random value per response; must be inserted by a templating engine, never by a middleware that rewrites every `<script>` tag (OCSP warning).
- `strict-dynamic`: trusts scripts loaded by an already-trusted (nonce/hash) script (OCSP).
- ASVS 3.4.3 (L2): a global policy with at least `object-src 'none'` and `base-uri 'none'` and either an allowlist or nonces/hashes; L3 requires per-response nonces or hashes.
- Framing: `frame-ancestors 'none'` (or `'self'` / named origins) — required on every response by ASVS 3.4.6 (L2). Ignored inside a `<meta>` CSP (OCSP).
- Reporting: `report-to <name>` with a `Reporting-Endpoints: <name>="https://…"` response header is current; `report-uri` is deprecated but can be sent alongside for older browsers (OCSP). ASVS 3.4.7 (L3) requires a violation reporting location.
- Rollout: `Content-Security-Policy-Report-Only` can run a strict policy in parallel with a looser enforced one (OCSP).
- Weak-policy signals: `'unsafe-inline'` in `script-src` without nonce/hash, `'unsafe-eval'` in production, `*` or `https:` script sources, missing `object-src`/`base-uri`.
- Not useful on non-rendered API JSON responses (OHH).

## Strict-Transport-Security

- Value: `max-age=63072000; includeSubDomains` (OHH example; OHH adds `preload`).
- ASVS 3.4.1 (L1): on all responses, `max-age` ≥ 1 year (31536000); `includeSubDomains` from L2.
- `preload`: opt-in only. HSTSP: requirements are `max-age` ≥ 31536000 + `includeSubDomains` + `preload` + all subdomains on HTTPS; "HSTS *preloading* is not recommended" and tools should "not include the `preload` directive by default". ASVS 3.7.4 asks for preload only at L3.

## X-Content-Type-Options

- `nosniff` on all responses (ASVS 3.4.4, L2; OHH). Set correct `Content-Type` too (OHH).

## Frame control — `frame-ancestors` vs X-Frame-Options

- Use CSP `frame-ancestors` (ASVS 3.4.6). ASVS: X-Frame-Options "is obsolete and may not be relied upon"; OCSP: it is "obsoleted by the frame-ancestors CSP directive".
- `X-Frame-Options: DENY` may still be sent for legacy browsers (OHH recommends `DENY` "if" CSP is not possible). Missing XFO with a correct `frame-ancestors` is **not** a finding.

## Referrer-Policy

- `strict-origin-when-cross-origin` (OHH; modern browsers default to it, but set it explicitly). ASVS 3.4.5 (L2) requires a referrer policy that prevents leaking sensitive URL data to third parties; use `no-referrer` / `same-origin` where URLs carry secrets.

## Permissions-Policy

- Disable unused features, e.g. `geolocation=(), camera=(), microphone=()` (OHH). No ASVS requirement; missing = hardening note.

## Cross-origin isolation headers

| Header | Recommended | Source / note |
|--------|-------------|---------------|
| Cross-Origin-Opener-Policy | `same-origin` (or `same-origin-allow-popups` when popups need the opener) | OHH; ASVS 3.4.8 (L3) on document responses |
| Cross-Origin-Embedder-Policy | `require-corp` | OHH; blocks cross-origin resources lacking CORP/CORS — test before enabling |
| Cross-Origin-Resource-Policy | `same-site` (OHH example); `same-origin` is stricter | OHH; ASVS 3.5.8 (L3) for authenticated resources |

## X-XSS-Protection — deprecated

- MDN-XXSS (page updated 2026-08-21): **Deprecated**, **non-standard**, "Not part of any specifications or drafts"; it "can create XSS vulnerabilities in otherwise safe websites"; use CSP instead.
- OHH: "Do not set this header or explicitly turn it off" → `X-XSS-Protection: 0`.
- Audit rule: absence is **not** a finding. `1` or `1; mode=block` present → hardening note, recommend `0` or removal.

## Cookie attributes (ASVS V3.3)

| Check | Level | ASVS |
|-------|-------|------|
| `Secure`, and `__Host-` or `__Secure-` name prefix | L1 | 3.3.1 |
| `SameSite` set according to the cookie's purpose | L2 | 3.3.2 |
| `__Host-` prefix unless the cookie must be shared with other hosts | L2 | 3.3.3 |
| `HttpOnly` for values not needed by scripts (session tokens), set only via `Set-Cookie` | L2 | 3.3.4 |
| Name + value ≤ 4096 bytes | L3 | 3.3.5 |

## CORS misconfiguration (ASVS 3.4.2, L1; OHH)

- `Access-Control-Allow-Origin` must be a fixed value, or the request `Origin` validated against an allowlist before being echoed.
- `*` only when the response carries no sensitive data (public API).
- High-risk pattern: arbitrary `Origin` reflected **and** `Access-Control-Allow-Credentials: true` on an authenticated endpoint → cross-origin read of private data (CWE-942). Also flag allowlists matched with `endsWith`/`includes`/unanchored regex and acceptance of `Origin: null`.

## Other response headers (OHH)

- `Cache-Control: no-store` on sensitive responses (`no-cache` does not prevent storage).
- Remove `X-Powered-By`; set `Server` to a non-informative value.
- Do not use `Expect-CT` or `Public-Key-Pins` (removed / unsupported).
- User uploads: `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` (also ASVS 3.2.1).

## Standards for findings

- OWASP Top 10:2025: A02:2025 Security Misconfiguration (missing/weak headers, CORS), A01:2025 Broken Access Control (CORS exposing private data).
- CWE: CWE-1021 (clickjacking), CWE-942 (permissive CORS), CWE-614 (cookie without Secure), CWE-1004 (cookie without HttpOnly), CWE-693 (missing protection mechanism), CWE-319 (no HSTS on credential pages).
