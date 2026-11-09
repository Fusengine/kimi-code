---
name: web-performance
description: "Use when writing or changing web app code (front, backend, DB) to apply performance defaults, or when asked to audit performance (\"audit perf\", \"why is it slow\") -- 31 rules across front, backend+DB and infra, each with status, evidence and user cost. Advisory: audits and recommends, never edits during the audit. Do NOT use for lint/quality (sniper) or SEO-only audits (`seo-audit`)."
---

<objective>
Web Performance gives domain experts 31 performance rules (numbered 1-31, stable across reports) in two modes. **Default mode** is always on: while writing code for its task, the expert applies the relevant rules by itself. **Audit mode** runs on request: baseline measurement, every rule reviewed with evidence, absent rules ranked by gain, then a STOP for the owner's validation before any fix.

The skill is advisory. It never builds architecture (job queue, Redis, tracing, regions, load balancing) without the owner's go, and the audit phase never edits code.
</objective>

# Web Performance

## Mode 1 -- Default (always on, inside your current task only)

When you write or change code, apply these as defaults -- no request needed, no refactor of code your task does not touch:

| Area | Default |
|---|---|
| Images | Framework image component (`next/image`, Astro `<Image>`/`<Picture>`), WebP/AVIF, `sizes`, explicit dimensions; `loading="lazy"` below the fold, never on the LCP image |
| Loading UI | Skeleton matching the final layout when the layout is known; spinner only for unknown shape or short actions |
| Inputs | Debounce search/autocomplete; cancel stale requests (`AbortController`) |
| Data fetching | Independent requests in parallel (`Promise.all`, `Http::pool`); one shared cache (TanStack Query, `fetch` cache, server components) -- no duplicate calls for the same data |
| Lists / APIs | Paginate list endpoints; virtualize lists that render hundreds of rows |
| DB | Eager-load relations (`with()`, `include`/`select`), select the columns you use, index the columns you filter/sort on in the migration you write |
| External calls | Explicit timeout on every outbound HTTP/AI call |
| AI output | Stream tokens to the UI when the response is user-facing |
| Third-party scripts | Deferred (`next/script` `lazyOnload`/`afterInteractive`, `defer`/`async`) |
| Fonts | Self-hosted WOFF2 (`next/font`, Fontsource), only the weights you use |
| Rendering | Server or build-time rendering by default; client code only where interactivity needs it |
| Mutations | Optimistic update with rollback on error when the outcome is predictable |

Architecture rules (7 job queue, 10 Redis, 18 OpenTelemetry, 19 same region, 28 load balancing) are **never** introduced by default. If relevant to your task, add one line to your report: `perf proposal: rule N -- why`.

## Mode 2 -- Audit (on request: "audit perf", "why is it slow")

Read-only plus measurement. Load only the references for the domains present.

1. **Baseline** (what the project allows): lab Core Web Vitals with Lighthouse on the running app (`bun <seo plugin>/scripts/check-cwv.ts <url>` (needs `lighthouse` + `chrome-launcher` installed in the seo plugin: `bun add lighthouse chrome-launcher` run inside `<seo plugin>`), or `npx lighthouse <url> --only-categories=performance --output=json`); JS size from the build output; slow queries / request timings from logs. No baseline possible -> say so; the ranking is then marked **estimated**.
2. **Stack + domains**: detect the stack (rule `01-project-detection`); keep the domains that apply -- front (`references/front.md`), backend + DB (`references/backend-db.md`), infra (`references/infra.md`). A pure static site has no backend-db domain.
3. **Review every rule** of those domains. Status is one of `applied` / `absent` / `not applicable` / `not verifiable from code`, with evidence `file:line` or the measurement. `absent` -> one sentence on what it costs the end user.
4. **Rank** absent rules by measured (else estimated) gain vs effort and risk. Architecture rules are tagged `proposal -- needs owner go`.
5. **STOP.** Present the report and wait for the owner to validate specific rule numbers. No edit before.
6. **Fix validated rules one at a time**, by the stack's domain expert: real check after each (tests / build / run the app) and a before/after on the same metric. Regression -> roll back before the next rule.

### Report format

```
| # | Rule | Status | Evidence | User cost | Rank |
|---|------|--------|----------|-----------|------|
| 15 | Lazy-load below-fold images | absent | app/page.tsx:42 | +1.2 MB on first load on mobile | 1 |
```

Then the ranked list of absent rules: `rank. #N rule -- expected gain (measured|estimated) -- effort -- risk`.

### Use by the lead

On an "audit perf" request the lead may run one domain expert per domain present (front / backend), each loading only its reference, then merge the tables by rule number.

## Reference Guide

| Reference | Rules | When |
|---|---|---|
| [front.md](references/front.md) | 1, 2, 4, 13, 14, 15, 20, 21, 22, 23, 26, 29, 31 | UI, rendering, assets, client JS |
| [backend-db.md](references/backend-db.md) | 3, 5, 7, 8, 10, 12, 16, 17, 24, 25 | API, server code, queries, DB |
| [infra.md](references/infra.md) | 6, 9, 11, 18, 19, 27, 28, 30 | Hosting, CDN, headers, deps, monitoring |

## Forbidden

- Editing code during the audit, or before the owner validates the rule numbers
- Building an architecture rule (7, 10, 18, 19, 28) without the owner's go
- A status without evidence; a gain presented as measured when it is estimated
- Blanket changes outside the current task in default mode
