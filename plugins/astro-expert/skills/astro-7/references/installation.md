---
name: installation
description: Astro 7 installation, upgrade from v5/v6, Node requirements
when-to-use: new project, upgrading from Astro 5/6, setting up TypeScript
keywords: setup, init, create, upgrade, node, requirements
priority: high
---

# Astro 7 Installation

## When to Use

- Starting a new Astro 7 project (latest stable: 7.4.7)
- Upgrading from Astro 5/6 (see the official v7 upgrade guide)
- Configuring Node 22.23.4+ environment

## Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | 22.23.4+ (`engines.node >=22.23.4` on 7.4.7; the floor was 22.12.0 at 7.0 and 22.22.0 at 7.4.0; odd-numbered Node versions unsupported) |
| TypeScript | 5.1+ (5.x or 6.x for `astro check`: `@astrojs/check` 0.9.x peers `typescript ^5 || ^6`) |

## TS7 / `tsgo` Warning

TypeScript 7 (`tsgo`) is now the npm `latest` (7.0.2), but Astro's typecheck tooling does not support it: `@astrojs/check` 0.9.12 peers `typescript ^5.0.0 || ^6.0.0`, and `astro check` under TypeScript 7 fails with an explanatory error (Astro changelog, PR #18053, which points to experimental type-checking with TypeScript 7.1 and `@astrojs/ts-content-mapper`). The Astro 7 build itself passes. Pin `typescript@^6` in projects that run `astro check`, and re-check the changelog before moving to TS 7.

## New Project

```bash
npm create astro@latest my-site
cd my-site
npm run dev
```

## Upgrade Existing Project

```bash
# Recommended: automated upgrade
npx @astrojs/upgrade

# Manual upgrade
npm install astro@latest
```

## Package Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "sync": "astro sync"
  }
}
```
