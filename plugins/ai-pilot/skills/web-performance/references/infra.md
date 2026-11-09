---
name: infra
description: Infra rules (6, 9, 11, 18, 19, 27, 28, 30) -- what to check per stack, how to measure, existing tool, nuance.
when-to-use: Audit mode for hosting, delivery headers, dependencies and monitoring -- any deployed web app
keywords: cdn, brotli, gzip, dependencies, opentelemetry, region, cache-control, load-balancing, rum, core-web-vitals
---

# Infra Rules

Numbering is global (1-31). Each rule: **Check**, **Measure**, **Tool** (existing Fusengine skill when one covers it), **Nuance**. Many infra rules live outside the repo (hosting dashboard, proxy config): when the code cannot show it and no deployed URL is available, the status is `not verifiable from code` -- never guess. Rules tagged **proposal** are never built without the owner's go.

Header checks use the deployed URL: `curl -sI -H 'Accept-Encoding: br, gzip' <url>`.

### 6. Static files on a CDN
- **Check**: host config (`vercel.json`, Netlify, Cloudflare, `next.config.*` `assetPrefix`, Laravel `ASSET_URL`), Nginx/Caddy serving `public/` directly.
- **Measure**: response headers of a hashed asset (`cf-cache-status`, `x-vercel-cache`, `x-cache`, `age`); TTFB of assets from a distant region.
- **Nuance**: managed platforms (Vercel, Netlify, Cloudflare Pages) already serve static assets from their edge -> `applied` with the header as evidence.

### 9. Brotli/gzip on HTML, JS, CSS, JSON
- **Check**: Nginx `gzip on` / `brotli on`, Caddy `encode zstd gzip`, Next.js `compress` option (gzip in `next start`), CDN compression settings.
- **Measure**: `content-encoding` header on HTML, a JS bundle and a JSON endpoint; Lighthouse "Enable text compression".
- **Nuance**: do not compress twice (app + proxy); images and fonts (WOFF2) are already compressed.

### 11. Remove unused dependencies
- **Check**: JS/TS -- `npx knip` (unused dependencies, files, exports); PHP -- `composer-unused`; manual: grep each `package.json` dependency for an import.
- **Measure**: client bundle size before/after from the build output; install size.
- **Nuance**: placed in infra because the cost is mostly install/build/supply-chain; a removed dependency that was in the client bundle also counts as a front gain. Unused server-only dependencies cost the end user nothing -> rank low. Vulnerabilities are a separate concern (`dependency-audit`).

### 18. OpenTelemetry traces on the backend (proposal)
- **Check**: Next.js `instrumentation.ts` with `registerOTel` (`@vercel/otel`) or the OpenTelemetry Node SDK; Laravel OpenTelemetry PHP instrumentation or an APM agent.
- **Measure**: whether a slow request can be broken down per span today (DB, external call, render).
- **Nuance**: an existing APM (Sentry, Datadog, New Relic) may already provide traces -> `applied`. Adding a tracing backend is infrastructure -> proposal.

### 19. App servers in the same region as the DB (proposal)
- **Check**: hosting region config (`vercel.json` `regions`, Fly `primary_region`, cloud provider region) vs the DB host region in env/IaC files (never print secrets -- read only the region part).
- **Measure**: per-query latency from the app (a trivial `SELECT 1` round trip) vs from inside the DB region.
- **Nuance**: edge functions calling a single-region DB pay one round trip per query -- move data fetching to the DB region before anything else. Moving infra is the owner's call.

### 27. Long Cache-Control on versioned static files
- **Check**: hashed filenames (Vite/Next/Astro build output) served with `Cache-Control: public, max-age=31536000, immutable`; Nginx `location` blocks for `/build/`, `/_next/static/`, `/_astro/`; Laravel Vite assets under `public/build`.
- **Measure**: `curl -sI` on a hashed asset and on the HTML (HTML must not be cached long).
- **Nuance**: only for content-hashed files -- a long cache on unversioned files serves stale code. Next.js sets it for `/_next/static` itself when self-hosting with `next start`; check the proxy does not override it.

### 28. Load balancing across instances (proposal)
- **Check**: number of app instances and the balancer in IaC/compose/k8s manifests; sticky-session or in-memory state (sessions, caches, websockets) that would break with several instances.
- **Measure**: CPU/latency saturation of a single instance under expected peak load.
- **Nuance**: serverless and managed platforms scale horizontally already -> `not applicable`. In-memory state must move out before balancing -- count it in the effort.

### 30. Real-user Core Web Vitals monitoring
- **Check**: `web-vitals` library (`onLCP`/`onINP`/`onCLS`) sending to an endpoint; Next.js `useReportWebVitals`; Vercel Speed Insights, Sentry performance, or another RUM provider in the layout.
- **Measure**: field data exists for the main routes (dashboard, or CrUX for public sites with enough traffic).
- **Tool**: `seo-technical` for the lab side (Lighthouse); RUM is the field side and needs a collection endpoint or provider.
- **Nuance**: lab numbers (Lighthouse) and field numbers differ -- this rule is about field data from real users.
