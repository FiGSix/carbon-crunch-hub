

# Fix: Simplify vite.config.ts Build Configuration

## Problem
The published site still returns completely stripped HTML — no scripts, no styles, no head content. The plugins were removed but the build is **still failing** because the remaining `build` configuration is too aggressive for Lovable's deployment pipeline.

## Root Cause
The `vite.config.ts` has extensive custom build options that likely conflict with how Lovable processes and serves the production build:

1. **`manualChunks` function** — Returns `undefined` for application code (no explicit return), which can cause Rollup to produce unexpected chunk structures
2. **Custom `chunkFileNames`, `entryFileNames`, `assetFileNames`** — Relocates all output files into `js/`, `css/`, `img/` subdirectories, which may not match what Lovable's hosting expects
3. **`minify: 'terser'` with `terserOptions`** — Forces Terser instead of Vite's default esbuild minifier; the aggressive `drop_console` and `pure_funcs` options reference `mode` which may not behave as expected in the Lovable build environment
4. **`sourcemap: true`** — Doubles output size and may cause build timeouts

## Fix
Strip the `build` section back to minimal, safe defaults. Keep only what's necessary:

```typescript
build: {
  target: 'es2020',
  chunkSizeWarningLimit: 1000,
},
```

Remove:
- `minify: 'terser'` and all `terserOptions` (let Vite use its default esbuild minifier)
- `rollupOptions.output` entirely (custom chunk names, file paths, manualChunks)
- `sourcemap: true`
- `cssCodeSplit` and `cssMinify` (Vite handles these well by default)

Also remove `terser` from `package.json` dependencies since it's no longer needed.

Keep the `css`, `optimizeDeps`, `resolve`, `server`, and `plugins` sections unchanged — those are fine.

## Expected Result
After this change and a re-publish, the Lovable build will produce standard Vite output that the hosting platform can serve correctly. Both `crunchcarbon.com` and `crunch-carbon-hub.lovable.app` will load.

