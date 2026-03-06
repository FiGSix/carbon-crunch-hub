

# Export Unsigned Cession Agreement PDF (Admin Only)

## Changes

### 1. New Edge Function: `supabase/functions/generate-cession-agreement-pdf/index.ts`
- Accepts `{ proposalId }` via POST
- Uses service role client to fetch proposal + client + agent data (same query pattern as `generate-signed-agreement-pdf`)
- Calls `addCessionAgreementPages()` from `_shared/cession-agreement-pdf.ts` to render the full agreement with blank signature fields
- Uploads to `proposal-pdfs` bucket as `cession-agreement-{proposalId}.pdf`
- Returns `{ success, pdf_url }`

### 2. Config: `supabase/config.toml`
Add function entry with `verify_jwt = false` (validate auth in code per best practices).

### 3. New Hook: `src/hooks/proposals/view/useCessionAgreementPdf.ts`
Same pattern as `useProposalPdf.ts` — invokes edge function, handles loading/error/toast, triggers blob download.

### 4. New Button: `src/components/proposals/view/CessionAgreementPdfButton.tsx`
Button with `FileSignature` icon, label "Download Agreement". Same style as `ProposalPdfButton`.

### 5. ProposalHeader: Admin-only visibility
Add the button with **admin-only** guard:

```tsx
{!isDeleted && userRole === "admin" && proposalId && (
  <CessionAgreementPdfButton proposalId={proposalId} proposalTitle={title} />
)}
```

