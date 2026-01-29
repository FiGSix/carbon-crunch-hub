

# Backfill Installer Fields for Existing Onboarding Projects

## Summary
Create a one-time database migration to populate `installer_company_name` and `installer_email` for all **177 existing onboarding records** that currently have NULL values.

---

## Data Analysis

| Category | Count | Action |
|----------|-------|--------|
| Crunch Carbon agents | 115 | Set to "To be confirmed" |
| External agents (Rentech, Solar Giant, Nuvo, etc.) | 62 | Use agent's company + email |
| No agent assigned | 0 | Would be "To be confirmed" |
| **Total** | **177** | — |

---

## Business Rules Applied

1. **Crunch Carbon agents** → `installer_company_name = 'To be confirmed'`, `installer_email = 'To be confirmed'`
2. **External agents** → Use team company name (priority) or profile company name, plus agent email
3. **No agent** → "To be confirmed" for both fields

---

## Migration SQL

```sql
-- Backfill installer fields for existing onboarding projects
-- Only updates records where installer_company_name is NULL or empty

UPDATE onboarding_fields of
SET 
  installer_company_name = CASE
    -- No agent OR Crunch Carbon agent
    WHEN p.agent_id IS NULL 
      OR COALESCE(c.company_name, prof.company_name, '') ILIKE '%crunch carbon%'
    THEN 'To be confirmed'
    -- External agent: use team company (priority) or profile company
    ELSE COALESCE(c.company_name, prof.company_name, 'To be confirmed')
  END,
  installer_email = CASE
    -- No agent OR Crunch Carbon agent
    WHEN p.agent_id IS NULL 
      OR COALESCE(c.company_name, prof.company_name, '') ILIKE '%crunch carbon%'
    THEN 'To be confirmed'
    -- External agent: use agent's email
    ELSE COALESCE(prof.email, 'To be confirmed')
  END,
  updated_at = NOW()
FROM project_onboarding po
JOIN proposals p ON p.id = po.proposal_id
LEFT JOIN profiles prof ON prof.id = p.agent_id
LEFT JOIN company_members cm ON cm.user_id = p.agent_id AND cm.status = 'active'
LEFT JOIN companies c ON c.id = cm.company_id
WHERE po.id = of.project_id
  AND (of.installer_company_name IS NULL OR of.installer_company_name = '');
```

---

## Expected Results After Migration

| Agent/Company | installer_company_name | installer_email |
|---------------|------------------------|-----------------|
| Shaun Slabber (Crunch Carbon) | To be confirmed | To be confirmed |
| Joe Micciarelli (Rentech) | Rentech | joem@auto-x.co.za |
| Shaun (Nuvo Consulting) | Nuvo Consulting | shaun@nuvoconsulting.com |
| Connor Gibbs (Renen Energy) | Renen Energy PTY Ltd | amped@renen.co.za |
| Johan Greyling (Solar Giant) | Solargiant Energy (Pty) Ltd | hendri@solargiant.co.za |
| Flip Opperman (PV Solution) | PV Solution Services Pty Ltd | info@pvsolution.co.za |

---

## Safety Measures

- **Only updates NULL or empty fields** — won't overwrite any existing data
- **One-time migration** — runs once, future proposals handled by trigger
- **Reversible** — can set back to NULL if needed (though not recommended)

---

## Files to Create

| Resource | Purpose |
|----------|---------|
| Database migration | One-time UPDATE statement to backfill 177 records |

