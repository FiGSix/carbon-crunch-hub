
# Update Clause 12.1 Wording in Cession Agreement

## Summary

Replace "consent to terminate" with "termination" in Clause 12.1 of the Cession Agreement in both the digital UI version and the PDF generation script.

## Change Details

**Current wording:**
> 12.1 This Agreement may be terminated at any time by either of the parties hereto, provided that such **consent to terminate** is in writing and is signed by the party who wants to cancel.

**New wording:**
> 12.1 This Agreement may be terminated at any time by either of the parties hereto, provided that such **termination** is in writing and is signed by the party who wants to cancel.

## Files to Update

### 1. Digital Version (UI Component)
**File:** `src/pages/ProposalAcceptance/components/TermsAndConditionsSection.tsx`  
**Line:** 286

Update the paragraph text from:
```text
...provided that such consent to terminate is in writing...
```
to:
```text
...provided that such termination is in writing...
```

### 2. PDF Version (Edge Function)
**File:** `supabase/functions/_shared/cession-agreement-pdf.ts`  
**Line:** 292

Update the `addClause` call from:
```text
...provided that such consent to terminate is in writing...
```
to:
```text
...provided that such termination is in writing...
```

## Technical Notes

- Both files will remain synchronized after this update
- The change affects only the wording, not the legal intent of the clause
- No database or other configuration changes required
