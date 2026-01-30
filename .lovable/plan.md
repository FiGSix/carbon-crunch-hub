

# Restore Gordon Millar as an Agent

## Summary
Set `deleted_at = NULL` on Gordon Millar's profile to fully restore his agent status. This will make him visible in the Agent Management table and allow his team members at MiSolar to see his proposals.

---

## Current Status

| Field | Value |
|-------|-------|
| ID | `eef71a05-2dc0-421f-9e54-0a897c17020b` |
| Email | gordon@misolar.co.za |
| Name | Gordon Millar |
| Role | agent |
| Agent Status | active |
| **Deleted At** | **2025-11-25** (needs to be cleared) |

---

## Action Required

Run this SQL update:

```sql
UPDATE profiles 
SET deleted_at = NULL 
WHERE id = 'eef71a05-2dc0-421f-9e54-0a897c17020b';
```

---

## Result
Once restored:
- Gordon will appear in the Agent Management table
- His team members at MiSolar Trading Pty Ltd will be able to see his proposals
- He will be able to log in and use the system normally

---

## No Code Changes Required
This is a data update only using the Supabase insert/update tool.

