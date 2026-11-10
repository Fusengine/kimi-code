---
name: auth-checklist
description: Authentication and authorization audit checklist with ASVS 5.0.0 / OWASP API Security Top 10 2023 / RFC 9700 / OWASP Password Storage references per item
keywords: checklist, jwt, session, oauth, password, mfa, recovery, authorization, bola, security, audit
---

# Authentication and Authorization Checklist

Each item cites its source; values and rationale live in `../auth-patterns.md` and
`../authorization-patterns.md`. A failed item becomes a finding only after the confidence and
refutation rules in `SKILL.md`.

## Self-contained tokens (JWT)

- [ ] Signature/MAC verified before any claim is used (ASVS 9.1.1)
- [ ] Algorithm allowlist, `none` rejected (ASVS 9.1.2)
- [ ] `jku`/`x5u`/`jwk` restricted to trusted sources (ASVS 9.1.3)
- [ ] `exp`/`nbf` checked (ASVS 9.2.1); `aud` checked (ASVS 9.2.3)
- [ ] HS256 key ≥ 256 bits (RFC 7518 §3.2)
- [ ] Token lifetimes documented as a risk decision (ASVS 7.1.1); refresh tokens have an absolute expiry (ASVS 10.4.8)
- [ ] Logout/revocation effective for self-contained tokens (ASVS 7.4.1)
- [ ] Browser apps: tokens only reachable by the backend (ASVS 10.1.1)

## Sessions and cookies

- [ ] Reference session token ≥ 128 bits from a CSPRNG (ASVS 7.2.3)
- [ ] New session token on login and re-authentication (ASVS 7.2.4)
- [ ] Inactivity and absolute timeouts documented and enforced (ASVS 7.3.1, 7.3.2); compare with NIST SP 800-63B-4 per AAL (AAL2: ≤ 24 h overall, ≤ 1 h inactivity)
- [ ] Logout invalidates server-side (ASVS 7.4.1); disabled account → all sessions ended (ASVS 7.4.2)
- [ ] Re-authentication before changing email/phone/MFA/recovery data (ASVS 7.5.1)
- [ ] Cookies `Secure` + `__Host-`/`__Secure-` prefix (ASVS 3.3.1, 3.3.3), `HttpOnly` for session tokens (ASVS 3.3.4), `SameSite` per purpose (ASVS 3.3.2)
- [ ] Cross-site request forgery defended (ASVS 3.5.1-3.5.3)

## OAuth 2.0 / OIDC

- [ ] PKCE with `S256` for public clients (RFC 9700 §2.1.1); AS rejects `plain` (ASVS 10.4.6)
- [ ] `state`/`nonce`/PKCE values transaction-bound (ASVS 10.1.2)
- [ ] Redirect URIs exact-match (RFC 9700 §2.1, ASVS 10.4.1); no open redirector (RFC 9700 §2.1)
- [ ] No implicit or password grant (ASVS 10.4.4)
- [ ] No access token in URL query (RFC 9700 §4.3.2)
- [ ] Public-client refresh tokens sender-constrained or rotated with reuse detection (RFC 9700 §2.2.2, ASVS 10.4.5)
- [ ] Mix-up defense when several authorization servers are used (ASVS 10.2.2)
- [ ] OIDC: `nonce`, `aud == client_id`, user keyed on `iss`+`sub` (ASVS 10.5.1, 10.5.4, 10.3.3)

## Passwords

- [ ] Argon2id / scrypt / bcrypt (legacy) / PBKDF2 (FIPS) at or above OWASP Password Storage minimums
- [ ] Min length 8 (15 recommended), ≥ 64 allowed, no composition rules (ASVS 6.2.1, 6.2.9, 6.2.5)
- [ ] Top-3000 and breached-password checks (ASVS 6.2.4, 6.2.12)
- [ ] No forced periodic rotation (ASVS 6.2.10)
- [ ] Credential stuffing / brute-force controls without malicious lockout (ASVS 6.1.1, 6.3.1)
- [ ] No hints or secret questions (ASVS 6.4.2)

## MFA and recovery

- [ ] MFA required at L2+ (ASVS 6.3.3)
- [ ] OTP/lookup codes single-use (ASVS 6.5.1); OOB ≤ 10 min, TOTP ≤ 30 s (ASVS 6.5.5)
- [ ] SMS OTP only with a stronger alternative offered (ASVS 6.6.1); OOB codes rate-limited (ASVS 6.6.3)
- [ ] Password reset does not bypass MFA (ASVS 6.4.3); lost factor → re-proofing (ASVS 6.4.4)
- [ ] No user enumeration in login, reset, registration (ASVS 6.3.8)
- [ ] Users notified after credential changes (ASVS 6.3.7)

## Authorization

- [ ] Every ID-taking entry point checks object ownership/permission (API1:2023, ASVS 8.2.2)
- [ ] Writes use a field allowlist; reads return DTOs (API3:2023, ASVS 8.2.3)
- [ ] Privileged functions deny by default with explicit role checks (API5:2023, ASVS 8.2.1)
- [ ] Enforcement server-side, not in client code or route guards only (ASVS 8.3.1)
- [ ] Tenant key from server-side identity on every query (ASVS 8.4.1)
- [ ] Next.js server actions / TanStack Start server functions re-check auth and ownership inside each one

## Mobile (iOS, MASVS 2.1.0)

- [ ] MASVS-AUTH-1/2/3 — remote enforcement, platform-correct local auth, step-up for sensitive ops
- [ ] MASVS-STORAGE-1/2 — secrets in the Keychain, no leakage to logs/backups
