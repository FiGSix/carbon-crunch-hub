

# Update Invoice Labels in Project Documentation

## Summary
Update the invoice upload labels in the Project Documentation section to provide clearer descriptions for each document type.

---

## Current Labels
| Position | Current Label |
|----------|---------------|
| Invoice 1 | "Invoice 1" |
| Invoice 2 | "Invoice 2" |
| Invoice 3 | "Invoice 3" |
| Invoice 4 | "Invoice 4" |

## New Labels
| Position | New Label |
|----------|-----------|
| Invoice 1 | "Final Invoice (Total Installed Cost)" |
| Invoice 2 | "Other Project Costs (Any additional invoices or costs spent on project)" |
| Invoice 3 | "Other Project Costs (Any additional invoices or costs spent on project)" |
| Invoice 4 | "Proof of Insurance (If you are spending on insurance)" |

---

## File to Modify

| File | Changes |
|------|---------|
| `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx` | Update 4 label props on lines 1181, 1189, 1197, 1205 |

---

## Technical Details

Simple text updates to the `label` prop of four `OnboardingFileUpload` components:

```tsx
// Line 1181: Invoice 1 → Final Invoice
label="Final Invoice (Total Installed Cost)"

// Line 1189: Invoice 2 → Other Costs
label="Other Project Costs (Any additional invoices or costs spent on project)"

// Line 1197: Invoice 3 → Other Costs
label="Other Project Costs (Any additional invoices or costs spent on project)"

// Line 1205: Invoice 4 → Insurance
label="Proof of Insurance (If you are spending on insurance)"
```

---

## No Database Changes Required
These are UI-only label updates. The document category remains `"invoice"` for all, so existing uploaded documents will continue to work correctly.

