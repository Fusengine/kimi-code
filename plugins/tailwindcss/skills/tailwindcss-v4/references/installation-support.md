---
name: installation-support
description: Installation, browser support, and key resources for Tailwind CSS v4
---

# Tailwind CSS v4 — Installation & Browser Support

## Installation

```bash
npm install -D tailwindcss @tailwindcss/postcss
# or for Vite
npm install -D tailwindcss @tailwindcss/vite
# or for CLI
npm install -D tailwindcss @tailwindcss/cli
# or for webpack (since v4.2)
npm install -D tailwindcss @tailwindcss/webpack
# or for Next.js Turbopack (since v4.3.4)
npm install -D tailwindcss @tailwindcss/turbopack
```

Current stable: `tailwindcss` 4.3.5 (all `@tailwindcss/*` packages share the version).

### webpack loader (since v4.2)

`@tailwindcss/webpack` compiles Tailwind directly as a webpack loader instead of going through `postcss-loader` + `@tailwindcss/postcss` (reported >2x faster on large projects).

```js
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  plugins: [new MiniCssExtractPlugin()],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "@tailwindcss/webpack"],
      },
    ],
  },
};
```

### Turbopack loader (since v4.3.4)

`@tailwindcss/turbopack` is a dedicated Turbopack loader for Next.js (alternative to `@tailwindcss/postcss`, which remains the setup in the official Next.js guide). Register it in `next.config.js`:

```js
module.exports = {
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"] },
    },
  },
};
```

Do not add `as: '*.css'` (removed from the package README in 4.3.5: it breaks CSS modules). Options: `base` (directory scanned for candidates, default `process.cwd()`) and `optimize` (default `true` in production; `true` or `{ minify: true }`). Import Tailwind in the CSS as usual: `@import "tailwindcss";`.

## Browser Support

- Safari 16.4+
- Chrome 111+
- Firefox 128+

## Key Resources

- Official Theme Variables Documentation
- @theme Directive Syntax
- Content Detection Configuration
- Custom Variant Creation
- Animation Keyframes Definition
- CSS Variables Usage
