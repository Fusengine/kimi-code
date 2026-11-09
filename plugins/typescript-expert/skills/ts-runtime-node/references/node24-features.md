---
name: node24-features
description: Node 26 LTS / Node 24 LTS runtime features relevant to TypeScript projects — watch, node:test, ESM
when-to-use: Load when configuring watch mode, native test runner, or ESM resolution on Node 24 or 26
keywords: node24, node26, watch, node-test, esm, eval, stdin, input-type, temporal
related: type-stripping.md
---

# Node 26 LTS / Node 24 LTS Features for TypeScript

## Overview

Node 26 LTS ("Lithium") and Node 24 LTS ("Krypton") ship native TypeScript stripping as a
stable (since v24.12.0), default-on feature and pair it with runtime tooling that removes most
reasons to add extra dependencies for scripts, CLIs, and internal tools.

Release lines (as of 2026-11): **Node 26 "Lithium"** is Active LTS since 2026-10-28 (latest
v26.13.0), Maintenance from 2027-10-20, end of life 2029-04-30 — the default target for new
projects. **Node 24 "Krypton"** is Maintenance LTS since 2026-10-20, end of life 2028-04-30.
Node 25 is end-of-life. Node 27 is in alpha (LTS 2027-10-20); starting with Node 27, every
major becomes LTS (annual cycle).

Source: https://nodejs.org/api/typescript.html + https://nodejs.org/api/cli.html +
https://nodejs.org/en/about/previous-releases + https://github.com/nodejs/Release (schedule.json)

## Watch mode

Re-run on file changes without `nodemon`:

```bash
node --watch src/index.ts          # restart on change
node --watch-path=./src src/app.ts # scope the watched paths
```

Works with native stripping, so `node --watch src/index.ts` runs a `.ts` entry
directly with live reload.

## Native test runner (`node:test`)

Node's built-in runner needs no dependency and runs `.ts` tests via stripping:

```bash
node --test              # discover *.test.ts / test/ files
node --test --watch      # watch mode
node --test --experimental-test-coverage   # coverage
```

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

test("adds", () => {
  assert.equal(1 + 1, 2);
});
```

### node:test vs Vitest

| Use `node:test` | Use Vitest |
|-----------------|------------|
| Zero-dependency scripts, CLIs, libraries | App code needing rich mocking/snapshots |
| Native stripping is enough (no `paths`, no JSX) | Aliases, JSX/TSX, jsdom, in-source tests |
| CI wants a built-in, stable runner | Watch UI, coverage UI, Jest-compatible API |

For a Bun-based project, prefer `bun test` → [ts-runtime-bun](../../ts-runtime-bun/SKILL.md).

## Non-file input

Stripping works for `--eval` and STDIN; the module system is chosen by
`--input-type` (as with JavaScript):

```bash
node --input-type=module --eval "const x: number = 1; console.log(x)"
```

TypeScript syntax is **not** supported in the REPL, `--check`, or `inspect`.

## ESM resolution reminders

- `"type": "module"` in `package.json` makes `.ts`/`.js` load as ESM.
- Import extensions are mandatory (`./file.ts`), including in `require('./file.ts')`.
- Use subpath imports (`#name` in `package.json` `imports`) instead of `tsconfig`
  `paths`, which Node ignores at runtime. → [type-stripping.md](type-stripping.md)

## Node 26 changes that matter for TypeScript projects

Source: https://nodejs.org/en/blog/release/v26.0.0 + https://nodejs.org/docs/latest-v26.x/api/

- **`--experimental-transform-types` removed** — native stripping only; `enum`, parameter
  properties, etc. now always need a loader such as `tsx`.
- **Temporal enabled by default** — typed via TS `lib: ["esnext"]` (or `esnext.temporal`).
- **V8 14.6** — `Map`/`WeakMap` `getOrInsert()` / `getOrInsertComputed()`, `Iterator.concat()`.
- **`module.register()` is runtime-deprecated** — expect a warning from loaders that still call it.
- **`node:test`** additions: `--test-coverage-include-all` (v26), randomized execution order
  (v26.1.0, early development) and test tags (v26.2.0, early development).
- Removed: `http.Server.prototype.writeHeader()` (use `writeHead()`), legacy `_stream_*` modules.
