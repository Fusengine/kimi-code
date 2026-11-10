---
name: auth-patterns
description: Authentication security reference for JWT/self-contained tokens, sessions, OAuth2/OIDC, password storage, MFA and account recovery, with every fixed value tied to its primary source
when-to-use: When auditing authentication implementations or detecting authentication anti-patterns
keywords: jwt, session, oauth, pkce, bcrypt, argon2, scrypt, pbkdf2, mfa, recovery, authentication
priority: high
related: authorization-patterns.md, templates/auth-checklist.md
---

# Authentication Patterns Reference

Values below were read from the cited primary source on 2026-11-10. A value with no
primary-source number is stated as a risk decision, never invented. Cite the requirement
ID in findings using the ASVS format `v5.0.0-<chapter>.<section>.<req>`. CWE tags in the
search lists are the auditor's mapping, not taken from the cited pages — confirm the CWE
entry before reporting.

Sources (abbreviations used below):
- **ASVS** — OWASP ASVS 5.0.0, https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/en (V6 Authentication, V7 Session Management, V9 Self-contained Tokens, V10 OAuth and OIDC, V3 Web Frontend)
- **PSCS** — OWASP Password Storage Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- **RFC9700** — OAuth 2.0 Security Best Current Practice (Jan 2025), https://www.rfc-editor.org/rfc/rfc9700.html
- **RFC7518** — JSON Web Algorithms, https://www.rfc-editor.org/rfc/rfc7518 (Section 3.2)
- **NIST-B4** — NIST SP 800-63B-4, https://pages.nist.gov/800-63-4/sp800-63b.html

## Self-contained tokens (JWT)

| Check | Requirement | Source |
|-------|-------------|--------|
| Signature/MAC verified before reading claims | Mandatory | ASVS 9.1.1 |
| Algorithm allowlist, never `none`; mixing symmetric + asymmetric needs key-confusion controls | Mandatory | ASVS 9.1.2 |
| `jku` / `x5u` / `jwk` header keys only from an allowlist of trusted sources | Mandatory | ASVS 9.1.3 |
| `exp` and `nbf` verified | Mandatory | ASVS 9.2.1 |
| Token type checked (access token for authz, ID token only for authn) | L2 | ASVS 9.2.2 |
| `aud` validated against an allowlist | L2 | ASVS 9.2.3, 10.3.1 |
| HS256 key length | ≥ 256 bits (key at least the hash output size) | RFC7518 §3.2 |
| Access/refresh token lifetime | No fixed number in ASVS 5.0.0 or RFC 9700. Lifetime is a documented risk decision (ASVS 7.1.1); refresh tokens MUST have an absolute expiration (ASVS 10.4.8) | ASVS 7.1.1, 10.4.8 |
| Logout/revocation of self-contained tokens | Deny-list, per-user "not before" time, or per-user key rotation | ASVS 7.4.1 |
| Browser apps (BFF) | Access and refresh tokens reachable only by the backend | ASVS 10.1.1 |

Anti-pattern search (heuristics — confirm by reading the verify call site):
- `algorithms?\s*:\s*\[?[^\]]*['"]none['"]` → `none` accepted (CWE-347)
- `jwt\.decode\(` without a matching `jwt\.verify\(` in the same flow → claims read unverified (CWE-347)
- `verify\(.*\{\s*\}\)` or verify options without `algorithms` → no allowlist (library-dependent, verify docs of the library in use)
- `localStorage\.(setItem|getItem)\(.*(token|jwt)` → token readable by any XSS (ASVS 10.1.1 for OAuth tokens; CWE-922)

## Sessions

| Check | Requirement | Source |
|-------|-------------|--------|
| Session token verified by a trusted backend | Mandatory | ASVS 7.2.1 |
| Reference token entropy | ≥ 128 bits, CSPRNG | ASVS 7.2.3 |
| New token on authentication and re-authentication, old one terminated (fixation) | Mandatory | ASVS 7.2.4 |
| Inactivity + absolute timeout | Risk-based and documented (ASVS 7.3.1, 7.3.2). NIST-B4 values: AAL1 overall ≤ 30 days (inactivity optional); AAL2 overall ≤ 24 h, inactivity ≤ 1 h; AAL3 overall ≤ 12 h, inactivity ≤ 15 min | ASVS 7.3, NIST-B4 |
| Logout / expiry really invalidates server-side | Mandatory | ASVS 7.4.1 |
| All sessions terminated on account disable/delete | Mandatory | ASVS 7.4.2 |
| Option to terminate other sessions after any factor change | L2 | ASVS 7.4.3 |
| Re-authentication before changing email, phone, MFA, recovery data | L2 | ASVS 7.5.1 |
| Cookie: `Secure` + `__Host-` or `__Secure-` prefix | L1 (prefix `__Host-` at L2) | ASVS 3.3.1, 3.3.3 |
| Cookie: `HttpOnly` for session tokens; `SameSite` per cookie purpose | L2 | ASVS 3.3.4, 3.3.2 |

Anti-pattern search (heuristics):
- `httpOnly\s*:\s*false`, `secure\s*:\s*false`, `'http_only'\s*=>\s*false`, `'secure'\s*=>\s*false` → missing cookie flag (CWE-1004, CWE-614)
- Login handler without `regenerate` / `session()->regenerate()` / new session id → fixation (CWE-384). Laravel's built-in auth regenerates; flag only custom login code.
- Hard-coded session timeout constants → compare with the documented AAL target above

## OAuth 2.0 / OIDC

| Check | Requirement | Source |
|-------|-------------|--------|
| PKCE for public clients | MUST | RFC9700 §2.1.1 |
| PKCE for confidential clients | RECOMMENDED | RFC9700 §2.1.1 |
| Challenge method | `S256` (SHOULD; it is the only method that does not expose the verifier); AS must reject `plain` | RFC9700 §2.1.1, ASVS 10.4.6 |
| PKCE challenge / OIDC `nonce` / `state` | Transaction-specific, unguessable, bound to the user agent | RFC9700 §2.1.1, ASVS 10.1.2 |
| CSRF on redirect endpoint | PKCE (if AS support confirmed), else one-time `state`, or OIDC `nonce` | RFC9700 §2.1, §4.7.1 |
| Redirect URI matching (AS) | Exact string match (port exception for localhost native apps) | RFC9700 §2.1, ASVS 10.4.1 |
| Open redirectors on client/AS | MUST NOT exist | RFC9700 §2.1 |
| Implicit (`token`) grant | Clients SHOULD NOT use it (RFC 9700); "must no longer be used" (ASVS) | RFC9700 §2.1.2; ASVS 10.4.4 |
| Resource owner password credentials grant | MUST NOT be used | RFC9700 §2.4; ASVS 10.4.4 |
| Access tokens in URL query | MUST NOT | RFC9700 §4.3.2 |
| Refresh tokens of public clients | Sender-constrained (DPoP/mTLS) or rotation with reuse detection | RFC9700 §2.2.2, ASVS 10.4.5 |
| Authorization code | Single use; lifetime ≤ 10 min (L1/L2), ≤ 1 min (L3) | ASVS 10.4.2, 10.4.3 |
| Multiple authorization servers | Mix-up defense (`iss` checked) | RFC9700 §2.1, ASVS 10.2.2 |
| OIDC client | `nonce` checked, `aud == client_id`, user identified by `iss`+`sub` | ASVS 10.5.1, 10.5.4, 10.3.3 |

Anti-pattern search (heuristics):
- Authorization request built without `code_challenge` → no PKCE
- `code_challenge_method=plain` or `'plain'` → weak PKCE
- `response_type=token` / `grant_type=password` → deprecated grants
- Redirect handler that reads `redirect`, `next`, `returnTo`, `callbackUrl` from the query and redirects without an allowlist → open redirect (CWE-601)
- `redirect_uri` compared with `startsWith`, regex or wildcard → non-exact match

## Password storage

Per PSCS: prefer Argon2id; scrypt when Argon2id is unavailable; bcrypt **only** for legacy
systems; PBKDF2 when FIPS-140 is required. Each listed configuration is a **minimum**;
benchmark and go higher if latency allows (PSCS: hashing should take less than one second).

| Algorithm | Minimum configurations (pick one) | Source |
|-----------|-----------------------------------|--------|
| Argon2id | m=47104 (46 MiB) t=1 p=1 · m=19456 (19 MiB) t=2 p=1 · m=12288 (12 MiB) t=3 p=1 · m=9216 (9 MiB) t=4 p=1 · m=7168 (7 MiB) t=5 p=1 | PSCS |
| scrypt | N=2^17 r=8 p=1 · N=2^16 r=8 p=2 · N=2^15 r=8 p=3 · N=2^14 r=8 p=5 · N=2^13 r=8 p=10 | PSCS |
| bcrypt | Work factor ≥ 10 (as high as the server allows); max input 72 bytes | PSCS |
| PBKDF2 | HMAC-SHA256 600,000 iterations · HMAC-SHA512 220,000 · HMAC-SHA1 1,400,000 (legacy only) | PSCS |

Password policy (ASVS V6.2): min length 8, 15 strongly recommended (6.2.1); ≥ 64 allowed (6.2.9);
no composition rules (6.2.5); checked against top-3000 list (6.2.4) and breached set at L2
(6.2.12); no periodic rotation (6.2.10); paste and password managers allowed (6.2.7); no
truncation or case change (6.2.8).

Anti-pattern search:
- `md5\(`, `sha1\(`, `createHash\(['"](md5|sha1|sha256)['"]\)` near `password` → fast hash (CWE-916)
- bcrypt `rounds`/`cost`/`saltRounds` < 10 → under PSCS minimum
- `scrypt` with `N: 32768` (2^15) and `p: 1` → below PSCS (2^15 requires p=3)
- Password `maxlength` < 64 or regex enforcing character classes → ASVS 6.2.9 / 6.2.5

## MFA and account recovery

| Check | Requirement | Source |
|-------|-------------|--------|
| MFA required | L2 and up | ASVS 6.3.3 |
| OTP / lookup codes usable once | L2 | ASVS 6.5.1 |
| Out-of-band code lifetime ≤ 10 min; TOTP ≤ 30 s | L2 | ASVS 6.5.5 |
| Lookup / OOB codes ≥ 20 bits entropy, CSPRNG | L2 | ASVS 6.5.3, 6.5.4 |
| Lookup secrets < 112 bits stored with a password hash + 32-bit salt | L2 | ASVS 6.5.2 |
| SMS/phone OTP only with validated number + stronger option offered; not at L3 | L2 | ASVS 6.6.1 |
| OOB code brute force rate-limited | L2 | ASVS 6.6.3 |
| Email not used as an authentication factor | L3 | ASVS 6.3.6 |
| Reset flow does not bypass enabled MFA | L2 | ASVS 6.4.3 |
| Lost MFA factor → identity proofing at enrollment level | L2 | ASVS 6.4.4 |
| No password hints / secret questions | L1 | ASVS 6.4.2 |
| No user enumeration via messages, codes or timing (incl. reset, registration) | L3 | ASVS 6.3.8 |
| Credential stuffing / brute force controls documented and implemented, no malicious lockout | L1 | ASVS 6.1.1, 6.3.1 |
| Recovery codes sent by email valid ≤ 24 h; by SMS/voice ≤ 10 min | NIST | NIST-B4 (account recovery) |

Mobile (iOS) authentication and storage → see the Mobile section of `authorization-patterns.md`.
