
# Surgical Fix: Add Client Company Member Check to `is_project_stakeholder`

## What We Have Now (Exact Live Function)

The current `is_project_stakeholder` function has exactly **4 checks** in its `OR` chain:

```text
Check 1: public.is_current_user_admin()
Check 2: p.agent_id = auth.uid()
Check 3: p.client_id = auth.uid()
Check 4: EXISTS (clients c WHERE c.id = p.client_reference_id AND c.user_id = auth.uid())
Check 5: EXISTS (company_members cm1 JOIN company_members cm2 ... [EPC team check])
```

Shaida passes **none of these** because she is not an admin, not the agent, not the registered `client_id` on the proposal, and not in the EPC agent's company team.

## The One Change: Add Check 6

We add exactly one new `OR EXISTS` clause — nothing else in the function body is touched:

```sql
-- NEW CHECK 6 (mirrors proposals SELECT policy):
OR EXISTS (
  SELECT 1
  FROM public.clients c
  JOIN public.client_company_members ccm ON ccm.client_company_id = c.client_company_id
  WHERE c.id = p.client_reference_id
    AND ccm.user_id = auth.uid()
    AND ccm.status = 'active'
)
```

This mirrors word-for-word the logic already in the `proposals` table SELECT policy (`Client company members can view company clients`) that already grants Shaida visibility. We are simply extending the same principle to write access.

## What the Migration Will Look Like

The migration is a single `CREATE OR REPLACE FUNCTION` statement that is a **verbatim copy** of the current live function with only the new `OR EXISTS` block appended before the closing `)`  — no other characters changed:

```sql
-- Migration: add client company member check to is_project_stakeholder
-- Only change: adds OR EXISTS (client_company_members) as check 6
-- All other checks are reproduced verbatim from the live function

CREATE OR REPLACE FUNCTION public.is_project_stakeholder(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_onboarding po
    JOIN public.proposals p ON p.id = po.proposal_id
    WHERE po.id = _project_id
      AND (
        public.is_current_user_admin()                          -- check 1 (unchanged)
        OR p.agent_id = auth.uid()                              -- check 2 (unchanged)
        OR p.client_id = auth.uid()                             -- check 3 (unchanged)
        OR EXISTS (                                             -- check 4 (unchanged)
          SELECT 1 FROM public.clients c
          WHERE c.id = p.client_reference_id
            AND c.user_id = auth.uid()
        )
        OR EXISTS (                                             -- check 5 (unchanged)
          SELECT 1
          FROM public.company_members cm1
          JOIN public.company_members cm2 ON cm1.company_id = cm2.company_id
          WHERE cm1.user_id = auth.uid()
            AND cm2.user_id = p.agent_id
            AND cm1.status = 'active'
            AND cm2.status = 'active'
        )
        OR EXISTS (                                             -- check 6 (NEW - Shaida fix)
          SELECT 1
          FROM public.clients c
          JOIN public.client_company_members ccm
            ON ccm.client_company_id = c.client_company_id
          WHERE c.id = p.client_reference_id
            AND ccm.user_id = auth.uid()
            AND ccm.status = 'active'
        )
      )
  );
$function$;
```

## Scope Guarantee

| What changes | What does NOT change |
|---|---|
| `is_project_stakeholder` function — 1 new `OR EXISTS` clause appended | All existing 5 checks — copied verbatim character-for-character from live DB |
| | All RLS policies on `onboarding_fields`, `onboarding_documents`, `data_access_config`, `onboarding_comments` — untouched (they already call this function) |
| | No other functions, triggers, tables, or migrations |
| | No frontend code changes required |

## Why `CREATE OR REPLACE` Is Safe Here

Unlike the RPC fix earlier (which had to `DROP` first because the return type changed), `is_project_stakeholder` returns `boolean` — the return type is **not changing**. `CREATE OR REPLACE` is safe and atomic: if the migration fails for any reason, the old function remains in place unchanged.

## What This Fixes for Shaida

Shaida (`d32a7219`) is an `account_admin` in `client_company_members` for Texiwell (`853ef604`). The Texiwell proposals have `client_reference_id` pointing to Dr Mohammed's `clients` row, which has `client_company_id = 853ef604`. Check 6 will:

1. Find Dr Mohammed's `clients` row via `c.id = p.client_reference_id`
2. Join to `client_company_members` on `ccm.client_company_id = 853ef604`
3. Find Shaida's active membership row → return `true`

Result: Shaida can now save project info, upload documents, post comments, and configure data access — the same four tables that delegate to `is_project_stakeholder`.
