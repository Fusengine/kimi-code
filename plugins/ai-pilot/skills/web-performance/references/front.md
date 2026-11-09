---
name: front
description: Front-end rules (1, 2, 4, 13, 14, 15, 20, 21, 22, 23, 26, 29, 31) -- what to check per stack, how to measure, existing tool, nuance.
when-to-use: Audit mode when the project has a UI (Next.js, React/Vite, Astro, TanStack Start, Blade/Inertia)
keywords: skeleton, images, avif, lazy-load, debounce, streaming, optimistic-ui, ssr, third-party, code-splitting, virtualization, re-render, fonts, throttling
---

# Front-end Rules

Numbering is global (1-31) so reports stay comparable. Each rule: **Check** (where to look), **Measure**, **Tool** (existing Fusengine skill when one covers it), **Nuance** (when the rule is not absolute).

Lab measurement for this domain: Lighthouse performance run on the running app -- `bun <seo plugin>/scripts/check-cwv.ts <url>` (needs `lighthouse` + `chrome-launcher` installed in the seo plugin: `bun add lighthouse chrome-launcher` run inside `<seo plugin>`; reports LCP, CLS, TBT as INP proxy) or `npx lighthouse <url> --only-categories=performance --output=json --output-path=<file>`. Request lists: fuse-browser `browser_network` in a session (method, url, status, resourceType) -- see `fuse-browser-usage`.

### 1. Skeleton screens instead of spinners
- **Check**: grep `Spinner|Loader|animate-spin|CircularProgress` in loading states; Next.js `loading.tsx`, React `<Suspense fallback>`, Astro `server:defer` fallbacks.
- **Measure**: CLS during loading (Lighthouse), visual check with a screenshot mid-load.
- **Nuance**: a skeleton pays when the final layout is predictable (lists, cards, profile). Unknown shape or sub-second actions (button submit) -> a spinner is fine.

### 2. Images in WebP/AVIF with responsive sizes
- **Check**: raw `<img src="*.jpg|png">`; Next.js `next/image` with `sizes`; Astro `<Image>`/`<Picture>` from `astro:assets`; Vite/React: `srcset` + `<picture>`; Laravel Blade: `<img>` without `srcset`.
- **Measure**: Lighthouse "Serve images in modern formats" / "Properly size images", transferred image bytes.
- **Tool**: `seo-images` (formats, `srcset`/`sizes`, explicit dimensions).
- **Nuance**: SVG icons and tiny images are out of scope.

### 4. Debounce search and autocomplete
- **Check**: `onChange`/`onInput` handlers that call `fetch`, a query hook or a server action directly; look for `useDebounce`, `debounce(`, `useDeferredValue`.
- **Measure**: count requests per typed word with `browser_network` (`urlContains` = the search endpoint).
- **Nuance**: purely local filtering of a small in-memory list needs no debounce; `useDeferredValue` covers render cost, not network calls.

### 13. Stream AI responses token by token
- **Check**: AI SDK calls -- `generateText` vs `streamText` (Vercel AI SDK), `stream: true` on provider SDKs, Laravel AI responses returned in one block; UI waits on a single `await`.
- **Measure**: time to first visible token vs time to full response.
- **Nuance**: not for structured outputs consumed by code (JSON to parse) or background jobs. `not applicable` when the app has no AI output.

### 14. Optimistic UI with rollback on error
- **Check**: mutations that wait for the server before updating UI; TanStack Query `onMutate` + `onError` rollback; React `useOptimistic`; Livewire/Inertia equivalents.
- **Measure**: delay between click and visible change with network throttled.
- **Nuance**: only when the outcome is predictable and reversible (like, toggle, reorder). Payments, irreversible or server-validated actions -> show pending state instead.

### 15. Lazy-load below-the-fold images
- **Check**: `loading="lazy"` on below-fold `<img>`; Next.js `next/image` lazy by default -- verify the LCP image is not lazy (Next.js 16: `loading="eager"` or `fetchPriority="high"` on the LCP image (`preload` only when needed; `priority` is deprecated); plain HTML: `fetchpriority="high"`); Astro `<Image>` is lazy by default (`priority` prop for the LCP image).
- **Measure**: initial image bytes and LCP (Lighthouse "Defer offscreen images", "LCP request discovery").
- **Tool**: `seo-images`.
- **Nuance**: lazy-loading the LCP/hero image is a regression, not a fix.

### 20. Server-side or build-time rendering
- **Check**: Next.js App Router -- `"use client"` at page/layout level; React/Vite SPA with data fetched in effects; Astro -- islands with `client:load` everywhere; TanStack Start loaders; Laravel Blade/Inertia SSR.
- **Measure**: LCP and FCP; HTML response contains the content (`curl <url>`).
- **Nuance**: internal dashboards behind auth may stay client-rendered; changing the rendering model of a SPA is a large change -> rank by effort honestly.

### 21. Third-party scripts deferred
- **Check**: `<script src>` for analytics, chat, pixels in layouts without `defer`/`async`; Next.js `next/script` `strategy` (`afterInteractive` default, `lazyOnload` for chat/widgets); Astro/Blade raw tags in `<head>`.
- **Measure**: `browser_network` filtered on third-party domains; Lighthouse "Reduce the impact of third-party code", TBT.
- **Nuance**: consent managers that must run first are a legitimate exception.

### 22. JS split per page
- **Check**: Next.js / Astro / TanStack Start split per route by default -- look for giant shared imports in root layouts; React/Vite: `React.lazy` + dynamic `import()` per route, `build.rollupOptions.output.manualChunks`.
- **Measure**: per-route JS from the build output (`next build` route table, `vite build` chunk list); Lighthouse "Reduce unused JavaScript".
- **Nuance**: over-splitting creates request waterfalls; split by route and heavy widget, not per component.

### 23. Long lists virtualized
- **Check**: `.map(` rendering hundreds+ rows without windowing; `@tanstack/react-virtual`, `react-window`, `content-visibility: auto`.
- **Measure**: DOM node count, INP/TBT when scrolling with CPU throttling.
- **Nuance**: paginated lists of ~50 rows do not need virtualization; virtualization hurts find-in-page and SEO for public content.

### 26. No needless re-renders
- **Check**: state lifted too high, context providers with object values recreated each render, whole-store Zustand subscriptions (no selector), effect-driven derived state.
- **Measure**: React DevTools Profiler commits on a typical interaction; INP.
- **Tool**: `react-effects-audit` (effects and derived state).
- **Nuance**: with React Compiler enabled, memoization is automatic -- do not add blanket `useMemo`/`useCallback`/`memo`; keep them as targeted escape hatches (e.g. effect dependencies). Fix state placement first.

### 29. Self-hosted fonts, few weights, WOFF2
- **Check**: `fonts.googleapis.com`/`fonts.gstatic.com` links; Next.js `next/font` (downloads and self-hosts at build time); Astro/Vite: Fontsource or local `@font-face` with `.woff2`; count weights/styles loaded.
- **Measure**: font requests and bytes in `browser_network`; CLS from font swap.
- **Nuance**: "two weights" is a guideline, not a cap -- a variable font covers many weights in one file.

### 31. Tests with CPU throttling and slow network
- **Check**: Lighthouse/CI config (`lighthouserc.*`), Playwright tests with throttling, documented manual test settings.
- **Measure**: Lighthouse defaults already simulate a mobile device on slow 4G with CPU slowdown (`throttlingMethod: simulate`); adjust with `--throttling.cpuSlowdownMultiplier=<n>` or `--throttling-method=devtools` for applied throttling.
- **Nuance**: fuse-browser has no CPU/network throttling tool today -- use Lighthouse. Status `not verifiable from code` when testing is manual and undocumented.
