---
name: live-verification
description: Procedure to check real response headers, cookies and CORS behaviour on a running URL the owner named — Bash curl fast path, then one fuse-browser session (open, navigate, network, cookies, close) when a rendered session is needed
when-to-use: When the owner gives a running URL (local dev server, staging or production they own) and asks to verify headers or cookies as actually served
keywords: live, curl, browser_open, browser_navigate, browser_network, browser_cookies, browser_close, har, set-cookie, cors
priority: high
related: headers-reference.md, templates/headers-config.md
---

# Live Header and Cookie Verification

## Scope rule (non-negotiable)

- Only URLs the owner named in the mandate. Never scan third-party sites, never crawl beyond the named host, never fuzz.
- Read-only requests: `GET`, plus at most one `OPTIONS` preflight per endpoint for CORS. No credential stuffing, no form submission unless the owner asked for an authenticated check and provided the account.
- Never copy cookie values, tokens or session ids into the report — record name and attributes only.

## Tool facts (checked against the tool schemas on 2026-11-10)

| Tool | What it returns | Use here |
|------|-----------------|----------|
| Bash `curl` | Raw response headers | Fast path for headers (no browser) |
| `browser_fetch` | `status`, `url`, page text — **no response headers** | Not usable for header checks |
| `browser_open` | `sessionId`; accepts `harPath` + `harMode` (`minimal` / `full`) | Rendered session; HAR file captures response headers |
| `browser_navigate` | Page title; params `sessionId`, `url`, optional `waitMs` | Load the page |
| `browser_network` | Requests since open: `method`, `url`, `status`, `resourceType` (no headers); filters `status`, `urlContains`, `limit` | Which URLs/redirects were hit |
| `browser_cookies` | `action: "get"` → cookies of the session context (optionally filtered by `urls`) | Cookie attributes after JS ran |
| `browser_close` | Closes the session | Always, in every exit path |

## Step 1 — Fast path: headers with curl (no browser)

```bash
# Headers of the document as served (GET, follow nothing, body discarded)
curl -sS -D - -o /dev/null "https://app.example.test/"

# Redirect chain: check HSTS and cookies on every hop
curl -sS -L -D - -o /dev/null "http://app.example.test/"

# CORS: does the server reflect an untrusted Origin, with credentials?
curl -sS -D - -o /dev/null -H "Origin: https://untrusted.invalid" "https://app.example.test/api/me"
```

Check against `headers-reference.md`:
- `content-security-policy`: present on HTML responses; `object-src 'none'`, `base-uri`, `frame-ancestors`; no `'unsafe-inline'` without nonce/hash; nonce differs between two requests (run the first command twice).
- `strict-transport-security`: `max-age` ≥ 31536000 on HTTPS responses.
- `x-content-type-options: nosniff`; `referrer-policy`; `x-xss-protection` absent or `0`.
- `set-cookie`: `Secure`, `HttpOnly` (session), `SameSite`, `__Host-`/`__Secure-` prefix.
- CORS: `access-control-allow-origin` echoing `https://untrusted.invalid` together with `access-control-allow-credentials: true` → candidate finding (confirm the endpoint returns private data).
- `x-powered-by` / verbose `server` → hardening note.

## Step 2 — Rendered session (only when needed)

Needed when cookies are set by client-side JS, headers differ after login, or the app is an
SPA whose API calls must be observed. One session, always closed.

```
1. browser_open      { harPath: "<scratch>/live-<host>.har", harMode: "full" }   → sessionId
2. browser_navigate  { sessionId, url: "<owner URL>" }
3. browser_network   { sessionId, urlContains: "<owner host>" }   → list document + XHR/fetch URLs and statuses
4. browser_cookies   { sessionId, action: "get", urls: ["<owner URL>"] } → name, domain, path, expires, httpOnly, secure, sameSite
5. browser_close     { sessionId }   → ALWAYS, also on error
6. Read the HAR file → response headers per request (entries[].response.headers)
```

- Write the HAR to the session scratchpad, never into the audited repository.
- If the HAR file is absent or empty after `browser_close`, record "response headers not captured in session" and rely on Step 1 for headers; do not guess.
- For each API URL listed in step 3, rerun the Step 1 CORS command on it rather than inferring from the browser.

## Step 3 — Report

- Each check → finding or "needs manual review" with the shared fields; `location` = the URL; `evidence` = the header line (secrets redacted).
- Apply the severity input from `headers-reference.md`: a missing header with no shown attack path goes to "Hardening notes" (no severity), not to findings.
- State which steps ran (curl only, or curl + session) and the timestamp, since headers can differ per deployment.
