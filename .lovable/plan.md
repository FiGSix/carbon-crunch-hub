
# Fix: SecurityError (DOMException.code 18) on Android / In-App Browsers

## Plain English Summary of the Problem

When a client opens a proposal link from their Gmail app on Android, the email is opened inside Gmail's **built-in mini-browser** (a WebView). This mini-browser is more restricted than a real Chrome tab. Two browser features that the app uses without any error protection are blocked inside it:

1. **`window.history.replaceState()`** — used to clean up the URL after email verification. The mini-browser blocks this silently and throws a `SecurityError`.
2. **`navigator.clipboard.writeText()`** — used to copy links. The mini-browser blocks clipboard access without an explicit user permission and throws the same `SecurityError`.

Because neither of these calls has any error handling, the error bubbles up uncaught, Sentry catches it as an unhandled crash, and it shows up as a production alert. The client likely sees nothing or a blank/broken page.

---

## Is It Important?

**Yes.** The specific Sentry error (`/proposals/331cef4a...`) is on the **client-facing proposal page** — the most business-critical page in the product. Any client opening their proposal from Gmail on an Android phone is hitting this. It does not cause data loss, but it can make the page appear broken and undermine client trust.

---

## Scope: Exactly 5 Files, Minimal Changes

No database changes. No edge functions. No RLS. Pure defensive frontend hardening — wrapping existing calls with `try/catch`.

---

## Change 1 — `src/pages/ViewProposal/ViewProposalPage.tsx` (line 63)

**The highest-priority fix** — this is the exact file/line referenced in the Sentry error.

The `window.history.replaceState` call that strips `?source=email_verification` from the URL is cosmetic (it just tidies up the URL bar). If it fails in a restricted browser, the app must continue normally.

```
Before:
window.history.replaceState({}, '', window.location.pathname);

After:
try {
  window.history.replaceState({}, '', window.location.pathname);
} catch {
  // Silently ignored — history API blocked in sandboxed WebView/in-app browsers
}
```

---

## Change 2 — `src/components/admin/agents/AgentsTableContent.tsx` (line 291)

This clipboard call has two problems: it is not `await`-ed (so the Promise rejection is never caught) and has no `try/catch`. On Android, this throws a `SecurityError`.

```
Before:
navigator.clipboard.writeText(inviteUrl);
alert('Invitation link copied to clipboard!');

After:
async onClick:
  try {
    await navigator.clipboard.writeText(inviteUrl);
    alert('Invitation link copied to clipboard!');
  } catch {
    window.prompt('Copy this invitation link:', inviteUrl);
  }
```

The `window.prompt` fallback lets the user manually copy the URL if the clipboard API is blocked — a standard, well-supported fallback.

---

## Change 3 — `src/components/admin/partners/ApiKeyRevealDialog.tsx` (line 43)

The `handleCopy` function already uses `async/await` but has no `try/catch`. If the clipboard API is blocked, the error is unhandled.

```
Before:
await navigator.clipboard.writeText(apiKey);
setCopied(true);

After:
try {
  await navigator.clipboard.writeText(apiKey);
  setCopied(true);
} catch {
  // Silent fallback — admin context, clipboard permission may not be granted
}
```

---

## Change 4 — `src/components/admin/auth/AuthVerificationTestPanel.tsx` (line 84)

The `copyToClipboard` helper is neither `async` nor wrapped. The returned Promise is discarded.

```
Before:
navigator.clipboard.writeText(text);
toast.success("Copied to clipboard");

After:
navigator.clipboard.writeText(text)
  .then(() => toast.success("Copied to clipboard"))
  .catch(() => toast.error("Could not copy — please copy manually"));
```

---

## Change 5 — `src/components/admin/partners/PartnerInvitationDialog.tsx` (line 76)

The `handleCopyKey` function uses `await` but has no `try/catch`.

```
Before:
await navigator.clipboard.writeText(generatedApiKey);
setCopied(true);

After:
try {
  await navigator.clipboard.writeText(generatedApiKey);
  setCopied(true);
} catch {
  // Silent fallback — admin context only
}
```

---

## What Is NOT Changed

- `src/pages/AuthCallback.tsx` — its many `window.history.replaceState` calls do NOT need wrapping because they execute **before** navigation (not inside a restricted proposal WebView context), and they are always followed by a `navigate()` call that would mask any error anyway. Changing them would add noise without benefit.
- `src/pages/Dashboard.tsx` — same rationale; runs after full auth, not in a restricted email WebView.
- `src/pages/ResetPassword.tsx` — same rationale.
- `src/pages/Referral.tsx` — already has a correct `try/catch` around its clipboard call. No change needed.
- All database functions, RLS policies, edge functions, and migrations — untouched.

---

## Files Changed Summary

| File | Change | Risk |
|---|---|---|
| `src/pages/ViewProposal/ViewProposalPage.tsx` | Wrap `history.replaceState` in try/catch | Zero — purely cosmetic call |
| `src/components/admin/agents/AgentsTableContent.tsx` | Add async/await + try/catch + prompt fallback | Zero — admin-only UI |
| `src/components/admin/partners/ApiKeyRevealDialog.tsx` | Add try/catch around clipboard | Zero — admin-only UI |
| `src/components/admin/auth/AuthVerificationTestPanel.tsx` | Chain .then/.catch on clipboard call | Zero — admin-only UI |
| `src/components/admin/partners/PartnerInvitationDialog.tsx` | Add try/catch around clipboard | Zero — admin-only UI |
