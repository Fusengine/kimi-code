---
name: upgrade
description: Upgrading to Next.js 16 with breaking changes and codemods
when-to-use: migrating from v14/v15, handling breaking changes
keywords: upgrade, migration, codemod, breaking changes
priority: high
requires: installation.md
related: middleware-migration.md
---

# Upgrade to Next.js 16

## When to Use

- Migrating from v14/v15
- middleware.ts deprecation
- Async APIs changes
- Turbopack migration

## Why Upgrade

| Change | Benefit |
|--------|---------|
| Turbopack | 2-5x faster builds |
| proxy.ts | Node.js runtime |
| Cache Components | Explicit caching |
| React Compiler | Auto-memoization |

## Automatic Upgrade
```bash
bunx @next/codemod@canary upgrade latest
```

## Agent-Guided Upgrade (16.4, experimental)
```bash
npx next@canary upgrade --agent=latest          # policies: security (default) | latest | experimental-future
npx next@canary upgrade apps/web --agent=latest # from a workspace root, pass the app dir
```
Picks the target release and prepares migration guides, codemods and verification steps for the coding agent. `next@canary` runs the newest upgrade tooling even on older apps. Cannot be combined with `--revision`; without `--agent`, `next upgrade` runs the interactive codemod flow. Reminders during `next dev`/`next build`: `experimental: { agentUpgrade: 'security' | 'latest' | false }` (default `'security'`). Cache Components / Partial Prefetching adoption Skills: https://nextjs.org/docs/app/guides/ai-agents

## Manual Upgrade
```bash
bun add next@latest react@latest react-dom@latest
```

## Breaking Changes

### middleware.ts → proxy.ts
```bash
bunx @next/codemod middleware-to-proxy .
```
- Rename `middleware.ts` → `proxy.ts`
- Rename `middleware()` → `proxy()`

### Async APIs
```typescript
// Before (v15)
const cookieStore = cookies()
const headersList = headers()
const { slug } = params

// After (v16)
const cookieStore = await cookies()
const headersList = await headers()
const { slug } = await params
```

### Turbopack Default
- Turbopack is now the default bundler for `next dev` and `next build`
- Remove `--turbo` / `--turbopack` flags from scripts
- Migrate webpack config to `turbopack: {}` — a custom `webpack` config makes `next build` fail
- Webpack is still available as an opt-out: `next build --webpack`

### Removed Features
- `next lint` command removed → use `eslint .`
- AMP support removed
- `@next/font` removed → use `next/font`

## Codemods Available
```bash
# All codemods
bunx @next/codemod@canary upgrade latest

# Specific codemods
bunx @next/codemod middleware-to-proxy .
bunx @next/codemod next-async-request-api .
bunx @next/codemod remove-experimental-ppr .
```

## Requirements
| Requirement | Version |
|-------------|---------|
| Node.js | 20.9+ |
| TypeScript | 5.1.0+ |
| React | 19.0+ |

## Verify Upgrade
```bash
bun dev
# Check for deprecation warnings
# Test all routes and API endpoints
```

## React Compiler
```typescript
// next.config.ts
const nextConfig = {
  reactCompiler: true,  // Enable auto-memoization
}
```

## Cache Components
```typescript
// next.config.ts
const nextConfig = {
  cacheComponents: true,      // Enable use cache directive (recommended since 16.4; default in Next.js 17)
  partialPrefetching: true,   // set explicitly alongside cacheComponents
}
```

## Minor Releases 16.1 – 16.4

| Version | Change |
|---------|--------|
| 16.1 | Turbopack filesystem cache stable and on by default for `next dev`; `next dev --inspect`; experimental bundle analyzer |
| 16.2 | `<Link transitionTypes={['slide']}>` (App Router, View Transitions); `next start --inspect`; Adapters API (`adapterPath`) stable; Server Function logging + hydration diff in dev overlay; experimental `unstable_catchError` / `unstable_retry` |
| 16.3 | `catchError` (from `next/error`) and the `retry()` prop in `error.tsx` stable; `next/root-params`; `import.meta.glob` in Turbopack; Turbopack filesystem cache on by default for `next build`; `next build` can type-check with TypeScript 7; opt-in Instant Navigations (`partialPrefetching`, requires `cacheComponents`); experimental `turbopackRustReactCompiler` and `useOffline` |
| 16.4 | Cache Components recommended for every app (`create-next-app` default, Next.js 17 default); `ensureStatic` segment config; `navigation()` / `prefetch()` (`next/cache`); `next upgrade --agent` and `experimental.agentUpgrade`; React 19.3; lazy server HMR, 20–25% smaller Turbopack disk cache, shorter production CSS Module class names and export mangling; experimental agent feedback, lazy dynamic imports, worker threads, disk cache GC |

### Root params (16.3)
```typescript
// app/[lang]/posts/[slug]/page.tsx — Server Components only
import { lang } from 'next/root-params'  // export names = segment names above the root layout

export default async function PostPage(props: PageProps<'/[lang]/posts/[slug]'>) {
  const { slug } = await props.params
  const language = await lang()
  return <p>{language} / {slug}</p>
}
```

### Instant Navigations (16.3, opt-in)
```typescript
// next.config.ts
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,  // requires cacheComponents
}
```
