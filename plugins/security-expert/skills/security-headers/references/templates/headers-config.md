---
name: headers-config
description: Recommended security-header configuration snippets per framework (Next.js, Laravel, Astro, TanStack Start verified on official docs; Express, Django kept unverified) — recommendations only, never applied by the auditing agent
keywords: nextjs, proxy, laravel, middleware, astro, tanstack start, express, django, headers, csp, config
---

# Security Headers Configuration by Framework

These snippets go into the **report** as recommendations. The auditing agent never edits the
audited project. Values follow `../headers-reference.md`; adjust CSP sources to the app.

| Framework | Verified on | Status |
|-----------|-------------|--------|
| Next.js (App Router) | nextjs.org docs (CSP guide updated 2026-03-20, proxy.js page updated 2026-11-06) | verified 2026-11-10 |
| Laravel 13.x | laravel.com/docs/13.x/middleware | verified 2026-11-10 |
| Astro 6 | withastro/docs v6 via Context7 (configuration reference, middleware, adapters) | verified 2026-11-10 |
| TanStack Start (React) | tanstack.com/start docs via Context7 (middleware, server functions) | verified 2026-11-10 |
| Express (helmet), Django | not re-read | **not verified** — check the current helmet / Django docs before citing |

## Next.js — static headers (`next.config.js`)

`headers()` with `source: '/(.*)'` is the documented way (Next.js CSP guide).

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}
```

## Next.js — nonce CSP (`proxy.ts`)

The `middleware` file convention is deprecated and renamed `proxy` (Next.js proxy.js docs).
Nonces require dynamic rendering; static optimization, ISR and PPR do not get nonces (CSP guide).
Abridged from the official guide:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; ` +
    `style-src 'self' 'nonce-${nonce}'; img-src 'self' blob: data:; font-src 'self'; ` +
    `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; ` +
    `upgrade-insecure-requests;`
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}
```

The guide uses `base-uri 'self'`; ASVS 3.4.3 asks for `base-uri 'none'` — recommend `'none'`
unless the app uses a `<base>` element. The official guide adds `'unsafe-eval'` only in development and a `config.matcher` that skips
`api`, `_next/static`, `_next/image`, `favicon.ico` and prefetch requests. Without nonces the
guide's `next.config.js` CSP uses `'unsafe-inline'` in `script-src` — report that as a weak
policy where XSS sinks exist; the guide also documents experimental SRI (`experimental.sri`)
for hash-based CSP on static pages.

## Laravel 13.x — global "after" middleware

Middleware shape and registration from the Laravel 13.x middleware docs
(`$response = $next($request)` then act, append in `bootstrap/app.php`).

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Content-Security-Policy', "object-src 'none'; base-uri 'none'; frame-ancestors 'none'");

        return $response;
    }
}
```

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
})
```

The CSP line above is a minimum (ASVS 3.4.3 / 3.4.6); add `script-src` with nonces or hashes
for the app's real scripts.

## Astro 6

- CSP: `security: { csp: true }` (or an object with `directives`, `scriptDirective`, `styleDirective`) in `astro.config.mjs`; Astro generates hashes. By default it emits a `<meta http-equiv="content-security-policy">` element — `frame-ancestors` and reporting are ignored in a meta CSP (OWASP CSP cheat sheet).
- To send CSP as a response header for prerendered pages, the adapter option `staticHeaders: true` exists for `@astrojs/node` (standalone), `@astrojs/netlify` and `@astrojs/vercel` (v10+).
- Other headers: middleware (`src/middleware.ts`, `onRequest(context, next)`, `const response = await next()`) runs at request time only for on-demand pages; for prerendered pages it runs at build time (Astro middleware guide, `middlewareMode` "classic"). Set headers for prerendered pages at the adapter/host level.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  security: { csp: { directives: ["default-src 'self'", "object-src 'none'", "base-uri 'none'"] } },
  adapter: node({ mode: 'standalone', staticHeaders: true }),
});
```

## TanStack Start (React)

Global request middleware runs for every request (SSR, server routes, server functions) when
registered in `src/start.ts` via `createStart` (TanStack Start middleware guide). Header
mutation on `result.response.headers` is the pattern shown in the official observability guide.

```tsx
// src/start.ts
import { createStart, createMiddleware } from '@tanstack/react-start'

const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next()
  result.response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  result.response.headers.set('X-Content-Type-Options', 'nosniff')
  result.response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return result
})

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
}))
```

`setResponseHeader(name, value)` / `setResponseHeaders(headers)` from
`@tanstack/react-start/server` are also documented for server functions and server-route
middleware. A nonce-based CSP for Start was **not covered** by the docs read; do not
recommend a Start-specific nonce mechanism without reading it first.

## Express (helmet) — not re-verified

```javascript
const helmet = require('helmet');
app.use(helmet());
```

## Django (settings.py) — not re-verified

```python
SECURE_HSTS_SECONDS = 63072000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
```
