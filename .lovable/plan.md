

# Fix Partner API Issues for PVBiz Integration

## Issues to Address

### Issue 1: Scope Naming Mismatch (Critical Bug)
The `ApiScope` type and route config use `projects:data_access:write` (underscore), but PVBiz's key has `projects:data-access:write` (hyphen). This will cause a silent 403 when they try to use it.

**Fix:** Standardize on the hyphenated format (`projects:data-access:write`) since that's what's stored in the database and shown in the admin UI. Update `partner-types.ts` and the route config in `index.ts`.

### Issue 2: Missing Routes for Granted Scopes
- `proposals:acceptance` -- no route exists for this scope
- `projects:onboarding:read` -- no GET route for reading onboarding data

**Fix:** Add the `ApiScope` type entries and create read-only onboarding GET handler (`GET /v1/projects/:id/onboarding`). For `proposals:acceptance`, either add a route or remove from PVBiz's key (this scope may have been intended for a future feature).

### Issue 3: Request/Response Body Logging
Lines 229-230 in `index.ts` hardcode `null` for request and response bodies, making debugging impossible.

**Fix:** Capture the request body (already parsed by handlers) and clone the response body before logging. Pass them to `logApiRequest`.

### Issue 4: PVBiz Scope Configuration
PVBiz needs `projects:read` added to their API key if they want to list/view projects.

**Fix:** This is an admin action -- add the scope via the Partner Management portal or direct DB update.

## Technical Changes

### File 1: `supabase/functions/_shared/partner-types.ts`
- Change `'projects:data_access:write'` to `'projects:data-access:write'`
- Add `'proposals:acceptance'` and `'projects:onboarding:read'` to the `ApiScope` type

### File 2: `supabase/functions/partner-api/index.ts`

**Route config (line 276):**
- Change scope from `'projects:data_access:write'` to `'projects:data-access:write'`

**Add new route (~line 271):**
```text
{ method: 'GET', pattern: /^\/projects\/([^/]+)\/onboarding$/, scope: 'projects:onboarding:read', handler: handleGetOnboarding }
```

**Add handler `handleGetOnboarding`:**
- Fetches `onboarding_fields` and `onboarding_documents` for the given project
- Validates the project belongs to the partner
- Returns onboarding status, fields, and document list

**Improve logging (lines 218-233):**
- Pass request body and a cloned/serialized response body to `logApiRequest` instead of `null`

### File 3: Database update (admin action)
- Add `projects:read` to PVBiz's API key scopes if confirmed

## Sequencing

1. Fix scope naming in types and route config (prevents future 403 bugs)
2. Add onboarding read route and handler
3. Fix logging to capture request/response bodies
4. Deploy edge function
5. Update PVBiz scopes (admin action via portal or SQL)

