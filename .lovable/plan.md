

# Risk Assessment & Safe Testing Strategy for Changes 3b, 3c, 3d

## Key Findings That Change the Original Plan

### 3c. ConsoleOptimizer — Cannot Simply Delete

**38 files** import `devLogger` from `ConsoleReplacementUtility.ts`, which depends on `ConsoleOptimizer.ts`. Deleting ConsoleOptimizer would break the entire app. The original plan was wrong to suggest deletion without addressing this dependency chain.

**Safe approach:** Keep `ConsoleReplacementUtility.ts` but rewrite it to use the existing `logger` directly (from `@/lib/logger`) instead of routing through ConsoleOptimizer. Then remove ConsoleOptimizer and its runtime console replacement from `main.tsx`. The build config already has `drop_console: true` and `pure_funcs` for production via Terser — the runtime replacement is truly redundant.

### 3b. Dual Toast — Safe to Consolidate

The Radix `<Toaster />` renders an empty array (`toasts` is always `[]`). It's dead UI. Only `toast({title, description, variant})` pattern from `useToast` is used (59 files, 99 files calling `toast({})`), and that hook already delegates to Sonner. Removing Radix toast components is safe — no consumer changes needed.

### 3d. Bootstrap.ts — Moderate Risk

Bootstrap handles preview-host SW clearing and error overlays. Removing it means losing the boot error overlay, but Sentry + React error boundaries already cover this. The forced reload on preview hosts is aggressive and unnecessary.

---

## Implementation Steps With Built-in Safety

### Step 1: Toast Consolidation (3b) — Low Risk
- Remove `<Toaster />` (Radix) from `App.tsx`, keep `<Sonner />`
- Delete `src/components/ui/toaster.tsx` and `src/components/ui/toast.tsx`
- Simplify `use-toast.ts` — remove `toasts: []` property
- **Zero consumer changes needed** — all 59 files using `useToast()` continue working identically

**Verification:** Toast notifications still appear throughout the app (proposal creation, login errors, profile updates).

### Step 2: ConsoleOptimizer Replacement (3c) — Medium Risk
- Rewrite `ConsoleReplacementUtility.ts` to create loggers directly using `@/lib/logger` instead of importing from ConsoleOptimizer
- Remove `consoleOptimizer` imports and calls from `main.tsx`
- Delete `ConsoleOptimizer.ts`
- **All 38 consumer files unchanged** — they import from `ConsoleReplacementUtility`, not ConsoleOptimizer

**Verification:** App boots without errors; dev console shows categorized logs in development; production build strips them via Terser.

### Step 3: Bootstrap Removal (3d) — Medium Risk
- Change `index.html` script from `bootstrap.ts` to `main.tsx`
- Delete `bootstrap.ts`
- Remove SW registration block from `main.tsx`
- **Ensure** `main.tsx` has the root element check (fallback create if missing)

**Verification:** App loads directly without the intermediate "Booting..." screen; preview deployments work without forced reloads.

---

## Testing Strategy

### Automated (Pre-deploy)
- Run existing Vitest suite to catch import/compile errors
- TypeScript compilation check — any broken import from deleted files will fail the build

### Manual Verification Checklist
1. **Toast test:** Log in with wrong credentials → error toast appears. Create a proposal → success toast appears. Both should render via Sonner (bottom-right by default).
2. **Console test (dev):** Open browser DevTools → `devLogger.auth.info("test")` should output in development. In production build, console should be clean.
3. **Boot test:** Hard-refresh the app → should load directly without "Booting..." intermediate screen. Test in both preview and production URLs.
4. **Error boundary test:** Navigate to a broken route → should show NotFound page, not a blank screen.

### Rollback Safety
Each step is independent. If step 2 (ConsoleOptimizer) causes issues, steps 1 and 3 still work. The changes can be implemented and verified sequentially.

