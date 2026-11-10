---
name: graphql-security
description: GraphQL security patterns - introspection, depth limiting, complexity analysis, batching, authorization
when-to-use: When scanning or securing GraphQL APIs, reviewing schema config, or auditing query handling
keywords: graphql, introspection, depth, complexity, batching, authorization, persisted queries
priority: high
related: scan-patterns.md, owasp-top10.md
---

# GraphQL Security Patterns

Severities below are maximums. Depth, complexity, batching and rate-limit gaps are resource
exhaustion classes. A GraphQL endpoint without depth/cost limits that is reachable without
authentication is a finding (the reachable endpoint is the attack path), and so is a missing rate
limit on an authentication, password-reset, OTP or other abuse-prone endpoint. The same gaps
without a shown path go to "Hardening notes", never to "Not Reported" ([triage.md](triage.md),
`rules/security-rules.md`); the verified severity comes from the triage pass. The CWE-770 to A06
pairing is this skill's own rule, not OWASP's published mapping. For API code, also cite the OWASP
API Security Top 10 2023 ([owasp-top10.md](owasp-top10.md#api-code-owasp-api-security-top-10-2023)).

## Introspection Control
- **Risk**: Schema exposure reveals types, fields, relationships
- **Severity**: HIGH | **OWASP**: A01
- **Grep**: `introspection:\s*true`, `__schema`, `__type`
- **Fix**: Set `introspection: false` in production

## Query Depth Limiting
- **Risk**: Deeply nested queries cause N+1 and resource exhaustion
- **Severity**: HIGH | **OWASP**: A06
- **Grep**: Missing `depthLimit`, `maxDepth`, `validationRules`
- **Fix**: Enforce a maximum depth (e.g. GraphQL Armor `maxDepth`, default 6, https://escape.tech/graphql-armor/docs/plugins/max-depth/); set it from the deepest legitimate query

## Query Complexity Analysis
- **Risk**: Flat but expensive queries (large lists, computed fields)
- **Severity**: HIGH | **OWASP**: A06
- **Grep**: Missing `costAnalysis`, `complexityLimit`, `fieldCost`
- **Fix**: Assign a cost per field and enforce a maximum (e.g. GraphQL Armor `costLimit.maxCost`, default 5000)

## Batching Attack Prevention
- **Risk**: Multiple operations in one request bypass rate limiting
- **Severity**: MEDIUM | **OWASP**: A06
- **Grep**: `allowBatchedHttpRequests:\s*true`, missing batch limits
- **Fix**: Keep Apollo Server `allowBatchedHttpRequests` at its default `false`, or cap batches (GraphQL Yoga `batching: { limit: n }`)

## Field-Level Authorization
- **Risk**: Schema-level auth misses field-level access control
- **Severity**: CRITICAL | **OWASP**: A01
- **Grep**: Resolvers without `@auth`, `authorize()`, permission checks
- **Fix**: Directive-based auth (`@auth(requires: ADMIN)`) or middleware

## Persisted Queries
- **Risk**: Arbitrary query execution enables attack surface exploration
- **Severity**: MEDIUM | **OWASP**: A01
- **Grep**: Missing `persistedQueries`, `allowedOperations`
- **Fix**: Whitelist known queries, reject unknown query strings

## Input Validation
- **Risk**: Injection via GraphQL arguments (SQL, NoSQL, LDAP)
- **Severity**: CRITICAL | **OWASP**: A05
- **Grep**: `${args.` in resolvers, raw SQL in resolvers
- **Fix**: Parameterized queries, validate input types and length

## Rate Limiting
- **Risk**: Query flood causes denial of service
- **Severity**: HIGH | **OWASP**: A06
- **Grep**: Missing rate limit middleware on `/graphql` endpoint
- **Fix**: Combine request-based and cost-based rate limiting

## Scan Patterns Summary

| Pattern | Max sev | CWE | OWASP | Common false positive |
|---------|---------|-----|-------|-----------------------|
| `introspection:\s*true` | HIGH | CWE-200 | A01 | enabled only in a development branch of the config |
| Missing `depthLimit` / `maxDepth` (H) | HIGH | CWE-770 | A06 | limits enforced by a gateway in front of the server |
| Missing `complexityLimit` / `costAnalysis` (H) | HIGH | CWE-770 | A06 | gateway-level cost limits |
| `allowBatchedHttpRequests:\s*true` | MEDIUM | CWE-770 | A06 | batch size capped elsewhere |
| Resolvers without auth checks (H) | CRITICAL | CWE-862 | A01 | auth enforced by a directive or schema-wide middleware |
| Missing `persistedQueries` config (H) | MEDIUM | CWE-284 | A01 | public, read-only API by design |
| `\$\{args\.` in SQL/query strings | CRITICAL | CWE-89 | A05 | tagged-template SQL clients that parameterize |
| No rate limit on `/graphql` endpoint (H) | HIGH | CWE-770 | A06 | rate limit at the proxy / gateway |
