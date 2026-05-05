# Add "Manage Scopes" UI for Existing Partner API Keys

## Goal
Allow admins to edit the scopes on an existing active API key directly from `/admin/partners` — no SQL, no key rotation.

## Changes

### 1. New dialog: `src/components/admin/partners/ManageScopesDialog.tsx`
- Props: `partner` (with active key), `onClose`, `onSaved`
- Reuses the `AVAILABLE_SCOPES` list (extract to a shared file `src/components/admin/partners/scopes.ts`)
- Renders the same checkbox grid as `PartnerInvitationDialog`, pre-checked from the active key's current scopes
- Save button updates `partner_api_keys.scopes` (jsonb) + `updated_at` for the active key id via `supabase.from('partner_api_keys').update(...)` — RLS already permits admins
- Toast on success, refresh table

### 2. Extract shared scopes list
- Create `src/components/admin/partners/scopes.ts` exporting `AVAILABLE_SCOPES`
- Update `PartnerInvitationDialog.tsx` to import from it (remove duplicate)

### 3. Wire into `ActivePartnersTable.tsx`
- Add new state `scopesPartner`
- Add dropdown item "Manage Scopes" between "View Details" and "Regenerate Key"
- Render `<ManageScopesDialog partner={scopesPartner} onClose={...} onSaved={fetchPartners} />`

### 4. Immediate fix for Keios
After the UI ships, open Keios → Manage Scopes → tick the 5 missing scopes → save. Same key, no rotation.

## Files
| File | Action |
|------|--------|
| `src/components/admin/partners/scopes.ts` | New (shared scope list) |
| `src/components/admin/partners/ManageScopesDialog.tsx` | New |
| `src/components/admin/partners/PartnerInvitationDialog.tsx` | Import shared scopes |
| `src/components/admin/partners/ActivePartnersTable.tsx` | Add menu item + dialog |

## Out of scope
- No DB migration (RLS already lets admins update `partner_api_keys`)
- No edge function changes
- Key value stays the same — only the `scopes` jsonb column changes
