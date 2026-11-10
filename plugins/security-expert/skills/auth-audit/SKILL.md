---
name: auth-audit
description: Use when auditing authentication (JWT, sessions, cookies, OAuth2/OIDC/PKCE, password storage, MFA, account recovery) or authorization (BOLA/IDOR, mass assignment, function-level checks, tenant isolation) in web, API or iOS code.
---


<objective>
This skill audits authentication and authorization end to end and reports findings — it
never modifies the audited project. Authentication: self-contained tokens (JWT), sessions and
cookies, OAuth2/OIDC with PKCE, password storage, MFA and account recovery. Authorization:
object-level (OWASP API1:2023 BOLA/IDOR), property-level (API3:2023, mass assignment and
excessive exposure), function-level (API5:2023) and tenant isolation, with search heuristics
for Next.js route handlers and server actions, TanStack Start server functions, Laravel
policies/gates, and Go/Rust HTTP handlers. Mobile iOS points to OWASP MASVS 2.1.0
MASVS-AUTH / MASVS-STORAGE.

Every fixed value (hash parameters, timeouts, PKCE rules) comes from a cited primary source:
OWASP ASVS 5.0.0, OWASP Password Storage Cheat Sheet, RFC 9700, RFC 7518, NIST SP 800-63B-4.
</objective>

# Auth Audit Skill

## Workflow

1. **Detect** the auth stack (session framework, JWT library, OAuth/OIDC client or AS, password hasher, MFA) and the entry-point types (route handlers, server actions/functions, controllers, handlers).
2. **Authentication pass** — apply [Auth Patterns](references/auth-patterns.md) section by section.
3. **Authorization pass** — apply the method in [Authorization Patterns](references/authorization-patterns.md) to every entry point that takes an identifier or performs a privileged action.
4. **Checklist** — tick [Auth Checklist](references/templates/auth-checklist.md); every unchecked item is a candidate.
5. **Refute** — run a second, read-only pass on each candidate that tries to disprove it (central middleware, base controller, policy, DB row-level security, query scope, framework default). Keep it only if it survives.
6. **Report** — findings and "needs manual review" list in the audited repository at `docs/security/YYYY-MM-DD-<scope>.md`.

## Finding format (shared contract)

| Field | Content |
|-------|---------|
| id | `AUTH-NNN` / `AUTHZ-NNN` |
| title | One line |
| severity | CRITICAL / HIGH / MEDIUM / LOW |
| confidence | 1-10 — only ≥ 8 is reported as a finding; lower goes to "needs manual review" |
| CWE | e.g. CWE-639, CWE-915, CWE-347, CWE-384, CWE-916 |
| standard | OWASP Top 10:2025 (A01 Broken Access Control, A07 Authentication Failures, …), OWASP API Security Top 10 2023, OWASP ASVS 5.0.0 (`v5.0.0-x.y.z`), OWASP MASVS 2.1.0 — whichever applies |
| location | file:line (or URL) |
| evidence | The code excerpt or response that shows it (never a secret value — redact) |
| exploit scenario | Concrete steps an attacker takes |
| recommendation | Smallest fix; snippets are recommendations, not applied |

Search patterns in the references are heuristics: a grep hit alone never reaches confidence 8.

## Common high-impact defects

- Server action / server function / route handler that authenticates but never checks ownership of the ID it receives (API1:2023)
- Raw request body written to the model (`$request->all()`, `data: body`, binding into the DB entity) (API3:2023)
- JWT accepted without signature verification, with `none`, or without `aud`/`exp` checks (ASVS 9.1-9.2)
- Session id not regenerated on login (ASVS 7.2.4); logout that does not invalidate server-side (ASVS 7.4.1)
- OAuth public client without PKCE `S256`; non-exact redirect URI; implicit or password grant (RFC 9700)
- Password hash below OWASP minimums (e.g. scrypt N=2^15 with p=1, bcrypt cost < 10, fast hashes)
- Password reset that bypasses MFA (ASVS 6.4.3); user enumeration in login/reset (ASVS 6.3.8)

## References

- [Auth Patterns](references/auth-patterns.md) — tokens, sessions, OAuth/OIDC, password storage, MFA, recovery
- [Authorization Patterns](references/authorization-patterns.md) — BOLA/BOPLA/BFLA, tenant isolation, per-stack heuristics, iOS MASVS
- [Auth Checklist](references/templates/auth-checklist.md)
