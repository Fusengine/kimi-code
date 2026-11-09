---
name: backend-db
description: Backend and database rules (3, 5, 7, 8, 10, 12, 16, 17, 24, 25) -- what to check per stack, how to measure, existing tool, nuance.
when-to-use: Audit mode when the project has server code or a database (Next.js server, TanStack Start server functions, Laravel, Prisma, Eloquent)
keywords: request-cache, pagination, job-queue, n+1, redis, timeout, parallel, index, select, connection-pool
---

# Backend + DB Rules

Numbering is global (1-31). Each rule: **Check**, **Measure**, **Tool** (existing Fusengine skill when one covers it), **Nuance**. Rules tagged **proposal** are architecture: report them, never build them without the owner's go.

Measurement for this domain: request timings from server logs or APM; query counts/durations from the ORM log (Prisma `log: ['query']`, Laravel `DB::listen` / Telescope / Debugbar if installed); `EXPLAIN` on the slow queries. No logs and no DB access -> status `not verifiable from code`, ranking `estimated`.

### 3. No duplicate API calls, shared request cache
- **Check**: the same endpoint fetched by several components; React/Vite: raw `fetch` in effects vs TanStack Query keys; Next.js: request memoization of `fetch`, `React.cache()` for non-fetch data loaders; Laravel: repeated identical queries per request.
- **Measure**: `browser_network` on one page load -- same URL more than once; query log duplicates.
- **Nuance**: two calls with different params are not duplicates; polling is intentional.

### 5. Paginated API results
- **Check**: list endpoints returning `findMany()` without `take`/cursor, `Model::all()`/`->get()` on unbounded tables; Laravel `paginate()`/`cursorPaginate()`.
- **Measure**: response size and time of list endpoints on realistic data volume.
- **Nuance**: small bounded reference tables (countries, roles) may return everything.

### 7. Slow tasks in a job queue (proposal)
- **Check**: mail, exports, image/PDF processing, AI calls done inside the HTTP request; Laravel `Mail::send` vs `queue`, jobs implementing `ShouldQueue`; Node: work awaited in route handlers/server actions.
- **Measure**: p95 duration of the affected endpoints.
- **Tool**: `laravel-queues` for Laravel; for Node stacks the choice of queue is an architecture decision.
- **Nuance**: Laravel already ships queues (config change, not new infra); a new broker for a Node app is a proposal. Next.js `after()` covers light post-response work without a queue.

### 8. N+1 queries fixed
- **Check**: queries inside loops; Prisma relations loaded per item instead of `include`/`select`; Eloquent relations accessed in loops without `with()`. Laravel: `Model::preventLazyLoading(! app()->isProduction())` in `AppServiceProvider` surfaces them.
- **Measure**: query count per request before/after.
- **Tool**: `/fusengine:prisma-optimize` (Prisma N+1 + indexes); `laravel-eloquent`.

### 10. Redis cache on hot data (proposal)
- **Check**: expensive reads repeated across requests (config, catalog, aggregates); existing cache layer (`Cache::remember`, Next.js `"use cache"`/`unstable_cache`, CDN).
- **Measure**: hit frequency and duration of the hot queries.
- **Nuance**: use the framework cache first; adding Redis is infrastructure -> proposal. Cache invalidation risk counts in the ranking.

### 12. Timeouts on external APIs
- **Check**: outbound `fetch` without `signal: AbortSignal.timeout(ms)`; axios without `timeout`; Laravel `Http::` without `timeout()`/`connectTimeout()` (Laravel defaults: 30 s response, 10 s connect); AI SDK calls without abort/timeout.
- **Measure**: worst-case latency when the dependency hangs (mock a slow upstream in a test).
- **Nuance**: pick the value from the dependency's measured p99, keep it configurable; pair with retry only for idempotent calls.

### 16. Independent requests in parallel
- **Check**: consecutive `await`s that do not depend on each other (`await a(); await b();`); Next.js sequential data fetching in server components; Laravel sequential `Http::` calls (use `Http::pool`).
- **Measure**: endpoint/page time vs the sum of the individual calls.
- **Nuance**: keep sequential when the second call needs the first result, or to respect a rate limit.

### 17. DB indexes on filter/sort columns
- **Check**: columns in `where`/`orderBy`/joins vs `@@index`/`@unique` in `schema.prisma`, `$table->index()` in Laravel migrations; foreign keys without index (MySQL indexes FKs, PostgreSQL does not).
- **Measure**: `EXPLAIN` / `EXPLAIN ANALYZE` on the slow queries (sequential scan on large tables).
- **Tool**: `/fusengine:prisma-optimize`; `laravel-migrations`.
- **Nuance**: every index slows writes -- index what is queried, not every column.

### 24. Only needed columns, no SELECT *
- **Check**: Prisma queries without `select`/`omit` returning large columns (text, JSON, blobs); Eloquent `->get()` vs `->select([...])`; raw `SELECT *`.
- **Measure**: payload size and query time on wide tables.
- **Nuance**: `SELECT *` is fine when all columns are used and none are large; do not trade readability for a few bytes.

### 25. DB connection pool
- **Check**: Prisma 7 -- pool configured on the driver adapter (`@prisma/adapter-pg` etc.), single `PrismaClient` instance (no client per request / per hot reload); serverless -> a pooler (PgBouncer, provider pooler); Laravel -- persistent connections, Octane workers, PgBouncer in front of PostgreSQL.
- **Measure**: connection count and "too many connections"/pool timeout errors under load.
- **Tool**: `prisma-7` (connection pooling reference).
- **Nuance**: PHP-FPM opens one connection per request by design -- a pooler is an infra decision, not a code fix.
