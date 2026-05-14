## Why the hero feels slow

Three things delay the headline + image on `/`:

1. **Homepage is lazy-loaded.** `Index` is wrapped in `createOptimizedLazyComponent`, so the browser parses `main.js` → discovers `Index.chunk.js` → fetches it → only then renders the hero. Every other route is correctly lazy, but the landing page should be in the initial bundle.
2. **Headline starts invisible.** The `<h1>` lives inside a `SafeMotionDiv` with `initial={{ opacity: 0, y: 20 }}`. Until React hydrates and framer-motion runs, the text is `opacity: 0` — even though the HTML is on the page. LCP is effectively gated on hydration.
3. **Hero image is a 124 KB PNG, preloaded as the original.** `index.html` preloads `9542096a-…png` (124 KB), but a `9542096a-…-optimized.png` already exists in `public/lovable-uploads/`. The `<img>` itself also points at the unoptimized file.

## Plan

### 1. Eager-load the homepage route
In `src/App.tsx`, replace the lazy `Index` with a static import:
```ts
import Index from "./pages/Index";
```
Keep every other route lazy. This removes one network round-trip on first paint of `/`.

### 2. Don't hide the LCP text behind an animation
In `src/pages/home/HeroSection.tsx`, render the headline + subheadline + CTAs without an opacity-0 initial state. Either:
- Drop the outer `SafeMotionDiv` wrapper around the text column entirely (recommended — the text doesn't need to fade in), or
- Change `initial` to `false` so motion skips the enter animation.

Floating badges and the image column can keep their animations.

### 3. Use the optimized hero asset
- Update both `<link rel="preload" as="image" href="…">` in `index.html` and the `<OptimizedImage src="…">` in `HeroSection.tsx` to point at `/lovable-uploads/9542096a-435e-4372-b09c-fb7cbaa80634-optimized.png`.
- Confirm the optimized file is meaningfully smaller; if it's still >50 KB, generate a WebP next to it (`sharp`/`squoosh-cli`, committed to `public/`) and switch to that.
- The image is hidden under `lg:` (≥1024 px), so on mobile the preload currently downloads bytes nobody renders. Add `media="(min-width: 1024px)"` to the preload `<link>` so phones skip it.

### 4. Verify
After deploy, run a performance profile on `/` and confirm LCP drops (target <2.5 s on a fast 3G profile). If long tasks still dominate, profile to see whether framer-motion or another vendor chunk is the next bottleneck.

## Files touched
- `src/App.tsx` — un-lazy `Index`
- `src/pages/Index.tsx` — no change needed
- `src/pages/home/HeroSection.tsx` — remove opacity-0 wrapper around headline; swap image src
- `index.html` — point preload at optimized asset, add `media` query
