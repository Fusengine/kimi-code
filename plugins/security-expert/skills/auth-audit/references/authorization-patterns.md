---
name: authorization-patterns
description: Authorization audit reference — object-level (BOLA/IDOR), property-level (BOPLA/mass assignment), function-level (BFLA) and tenant isolation, with search heuristics per stack and mobile pointers (MASVS 2.1.0)
when-to-use: When auditing who may access which object, field or function, after authentication is understood
keywords: authorization, bola, idor, bfla, bopla, mass assignment, tenant, policy, gate, server action, server function
priority: high
related: auth-patterns.md, templates/auth-checklist.md
---

# Authorization Patterns Reference

Authentication answers "who is calling"; authorization answers "may this caller do this
action on this object/field". Most critical findings live here.

## Standards map (read 2026-11-10)

| Risk | OWASP API Security Top 10 2023 | ASVS 5.0.0 | CWE (from the API Top 10 page) | OWASP Top 10:2025 |
|------|-------------------------------|------------|--------------------------------|-------------------|
| Object-level (BOLA / IDOR) | API1:2023 | 8.2.2 | CWE-285, CWE-639 | A01:2025 Broken Access Control |
| Property-level (BOPLA: excessive exposure + mass assignment) | API3:2023 | 8.2.3, 8.1.2 | CWE-213, CWE-915 | A01:2025 (CWE-213) / A08:2025 (CWE-915) |
| Function-level (BFLA) | API5:2023 | 8.2.1, 8.1.1 | CWE-285 | A01:2025 |
| Tenant isolation | — | 8.4.1 | CWE-639 | A01:2025 |
| Server-side enforcement (not client JS) | — | 8.3.1 | CWE-602 | A06:2025 |

Sources: https://api-security.owasp.org/editions/2023/en/0x11-t10/ (list) — CWE lists and
quotes come from the per-risk pages `0xa1-broken-object-level-authorization/`,
`0xa3-broken-object-property-level-authorization/`, `0xa5-broken-function-level-authorization/` ·
https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x17-V8-Authorization.md ·
https://top10.owasp.org/2025/ (CWE-602 is the auditor's mapping, not from those pages.)

Key rules from the sources:
- API1: every function that uses a client-supplied ID to access a record must check the caller may perform that action on that record. Comparing the session user ID with an ID parameter "isn't a sufficient solution" on its own.
- API3: return only the properties the caller may read; avoid auto-binding client input to object properties; allow changes only to client-updatable properties.
- API5: deny by default; never infer "admin" from the URL path; check that a method switch (GET → DELETE) does not bypass a check.

## Method (applies to every stack)

1. **Inventory entry points** — every route handler, server action, server function, RPC, GraphQL resolver. Each is an independent endpoint (Next.js and TanStack Start docs say so explicitly, see below).
2. **For each entry point that takes an identifier** (path param, query, body, header): locate the data access and check that the query is scoped to the caller (owner, tenant, role) or that a policy is evaluated on the loaded object **before** the action.
3. **For each write**: check the fields written come from an allowlist/schema, not the raw body.
4. **For each read**: check the response is a DTO/allowlist, not the raw record.
5. **For admin/privileged functions**: check an explicit role/permission check in the handler or an enforced wrapper, not only UI hiding or a layout/page guard.
6. **Second pass (refutation)**: before reporting, look for a central guard you may have missed (middleware matcher, base controller, DAL wrapper, DB row-level security, query scope). A finding stays only if no such guard covers the path.

All patterns below are **heuristics** that locate candidates. None proves a vulnerability
alone; confirmation needs the data-flow read in steps 2-6.

## Next.js (App Router)

Source: https://nextjs.org/docs/app/guides/data-security (read 2026-11-10) — Server Actions are
"reachable via a direct POST request"; "A page-level authentication check does not extend to
the Server Actions defined within it"; check ownership "(authorization, not just authentication)".

Search targets:
- `rg -l "^['\"]use server['\"]"` → list every server action file; in each exported async function, require an auth call **and** an ownership/permission check before the DB call.
- `rg -n "export async function (GET|POST|PUT|PATCH|DELETE)" app/` → route handlers; same check.
- `rg -n "params\b|searchParams\b" app/` near `findUnique|findFirst|update|delete|where:` → IDs from the URL used in queries; flag when the `where` has only `{ id }` and no owner/tenant term and no policy call follows.
- `rg -n "(update|create|upsert)\(\{[^}]*data:\s*(body|input|formData|Object\.fromEntries)"` → mass assignment candidate (API3).
- Return of full records from actions/handlers (`return db.` / `return await prisma.`) → excessive exposure candidate (API3).
- Auth only in `proxy.ts` (formerly `middleware.ts`) → not sufficient alone; the guide lists `proxy.ts` and `route.ts` as high-scrutiny files and requires re-verification inside each action.

## TanStack Start

Source: https://tanstack.com/start/latest/docs/framework/react/guide/server-functions and
`.../guide/middleware` (via Context7, read 2026-11-10) — "Server functions are API endpoints
reachable independently of whichever route renders the calling UI"; "`beforeLoad` is useful
route UX, but it is not the data boundary".

Search targets:
- `rg -n "createServerFn\("` → for each, require `.middleware([authMiddleware…])` or an in-handler session check, plus an ownership/tenant check on the IDs from `data`.
- Server functions without `.inputValidator(` (or equivalent schema) that pass `data` straight to a DB write → mass assignment candidate.
- Protection only in route `beforeLoad` → not the data boundary (finding if the server function itself is unprotected).
- Server routes (`createFileRoute(...)({ server: { handlers: … } })`) → same checks as route handlers.

## Laravel

Source: https://laravel.com/docs/13.x/authorization (read 2026-11-10) — Gates, Policies,
`Gate::authorize`, `$request->user()->can/cannot`, `can` middleware / `->can()` route method,
`#[Authorize]` controller attribute, policy `before` filters.

Search targets:
- Controllers/actions that load a model by ID or route-model binding and write/return it with **no** `Gate::authorize(`, `->can(`/`->cannot(`, `can:` middleware, `->can(` on the route, or `#[Authorize(` → BOLA candidate.
- Policy methods that always `return true;` or `before()` returning `true` for broad roles → review.
- `Model::where('id', $id)` / `find($request->…)` without owner or tenant scope and without a policy call → BOLA candidate.
- Mass assignment: `protected $guarded = [];`, `Model::unguard(`, `forceFill(`, `->update($request->all())`, `::create($request->all())` → API3 candidate (prefer `$request->validated()` / `->only([...])`).
- Responses returning models directly without API Resources/`$hidden` → excessive exposure candidate.

## Go (net/http, chi, gin, echo)

Heuristics:
- `r.PathValue("` (net/http 1.22+), `chi.URLParam(`, `c.Param(` (gin/echo) feeding a query (`QueryRow`, `Exec`, ORM `First`/`Find`/`Where`) whose SQL/filter has no user/tenant column bound from the authenticated context → BOLA candidate.
- `json.NewDecoder(r.Body).Decode(&model)` or `c.Bind(&model)` / `c.ShouldBindJSON(&model)` where `model` is the persisted struct (not a request DTO) followed by save/update → mass assignment candidate.
- Admin routes registered on a router/group without the auth/role middleware used elsewhere → BFLA candidate.

## Rust (axum, actix-web)

Heuristics:
- axum `Path(` / actix `web::Path<` extracted IDs used in `sqlx::query!`/`query_as!` or ORM calls without a user/tenant predicate bound from the auth extractor → BOLA candidate.
- `Json(model)` / `web::Json<Model>` where `Model` is the DB entity (derives `Deserialize` and is written as-is) → mass assignment candidate.
- Routers where admin routes are merged without the auth `layer`/`wrap` applied to other protected routes → BFLA candidate.

## Tenant isolation (ASVS 8.4.1)

- Every multi-tenant query carries the tenant key from the **server-side** session/token, never from the request body/header/subdomain without validation.
- Look for global scopes / RLS policies; if present, verify they cannot be bypassed (`withoutGlobalScope`, raw queries, admin connections).
- Cache keys, file paths and queue jobs include the tenant key.

## Mobile — iOS (OWASP MASVS 2.1.0)

Source: https://mas.owasp.org/MASVS/ and https://github.com/OWASP/masvs/tree/v2.1.0/controls (read 2026-11-10).

| Control | Text (v2.1.0) | What to check |
|---------|---------------|---------------|
| MASVS-AUTH-1 | The app uses secure authentication and authorization protocols and follows the relevant best practices | Enforcement is on the remote endpoint; app uses OAuth/OIDC per `auth-patterns.md` |
| MASVS-AUTH-2 | The app performs local authentication securely according to the platform best practices | Biometric/PIN not a bypassable boolean (MASWE-0020); keys invalidated on new biometric enrollment (MASWE-0022) |
| MASVS-AUTH-3 | The app secures sensitive operations with additional authentication | Step-up for sensitive actions (MASWE-0023) |
| MASVS-STORAGE-1 | The app securely stores sensitive data | Tokens/secrets in the Keychain, not `UserDefaults`/plist/files (MASWE-0001/0002/0003) |
| MASVS-STORAGE-2 | The app prevents leakage of sensitive data | No secrets in logs (MASWE-0005) or backups (MASWE-0006) |

MASWE titles were read from the mas.owasp.org navigation; open the MASWE page before citing
test details. iOS heuristics: `UserDefaults.standard.set(` with token/password names;
`LAContext().evaluatePolicy(` whose success alone unlocks data without a Keychain item
protected by access control → MASVS-AUTH-2 candidate.
