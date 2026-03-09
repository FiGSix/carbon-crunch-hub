

# Root Cause: Production Build Plugins Stripping HTML

## The Problem

Both `crunchcarbon.com` and `crunch-carbon-hub.lovable.app` return a completely stripped HTML file:
```html
<!DOCTYPE html><html lang="en"><body><div id="root"></div></body></html>
```

All `<head>` content, `<script>` tags, `<style>` tags, and meta tags are missing. React never loads, so users see permanent "Loading..." text.

The **preview environment works perfectly** — this is exclusively a production build issue.

## Root Cause

Two plugins in `vite.config.ts` are breaking the production build:

1. **`createHtmlPlugin({ minify: true })`** — This `vite-plugin-html` plugin is aggressively minifying the HTML during the production build, stripping out script tags and head content. Lovable's build pipeline already handles HTML properly; this plugin conflicts with it.

2. **`visualizer({ open: true })`** — This plugin tries to **open a browser window** during the build process to show a bundle analysis chart. In Lovable's headless CI/build environment, this either fails silently or causes the build to hang/crash.

Both plugins run unconditionally in production builds (they are not gated by `mode === 'development'`).

## Fix

Simplify `vite.config.ts` by removing both problematic plugins:

1. **Remove `createHtmlPlugin({ minify: true })`** — Vite handles HTML minification natively in production builds. This plugin is unnecessary and is the primary cause of the stripped HTML.

2. **Remove `visualizer({ open: true })`** — This is a development-only analysis tool that should never run in production builds. If kept at all, it should be gated behind `mode === 'development'`.

3. **Remove the corresponding imports** for both plugins.

The resulting plugins array becomes:
```js
plugins: [
  react(),
  mode === 'development' && componentTagger(),
].filter(Boolean),
```

After this change, **publish again** and the site will load correctly on both domains.

## Why This Wasn't Caught Earlier

- The preview environment uses Vite's dev server, which doesn't run these build plugins
- The plugins were added for performance optimization but were never tested in the Lovable production build pipeline
- The `vite-plugin-html` issue was masked by other changes (the `bootstrap.ts` deletion) that were initially blamed

