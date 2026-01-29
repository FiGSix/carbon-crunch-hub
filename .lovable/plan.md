

# Agent Info to Onboarding Fields - Auto-Population

## Problem Summary
When a proposal moves to onboarding, the "EPC or Solar Installer Company Name" and "EPC or Solar Installer Email Address" fields are not being populated with the agent's information.

## Business Rules
1. **If no agent exists** → Default both fields to "To be confirmed"
2. **If agent is from "Crunch Carbon"** → Default both fields to "To be confirmed" 
3. **Otherwise** → Populate with agent's company name and email

## Current State
The database trigger `create_onboarding_on_signature` already creates `onboarding_fields` records when a proposal is signed, but it doesn't include `installer_company_name` or `installer_email`.

---

## Solution

### Database Trigger Update

Modify the `create_onboarding_on_signature` function to:
1. Look up the agent's company from the `companies` table (via `company_members`)
2. Apply conditional logic for Crunch Carbon or missing agent
3. Insert the appropriate values into `onboarding_fields`

### Data Flow

```text
Proposal Signed
       │
       ▼
Get agent_id from proposal
       │
       ▼
Look up agent's company (companies via company_members)
       │
       ▼
┌──────────────────────────────────────────┐
│  Is agent_id NULL?                       │
│  OR company_name = 'Crunch Carbon'?      │
└──────────────────────────────────────────┘
       │                    │
      YES                  NO
       │                    │
       ▼                    ▼
Set both fields       Set installer_company_name
to "To be confirmed"  to agent's company name
                      Set installer_email
                      to agent's email
```

---

## Technical Implementation

### Database Migration

Update the `create_onboarding_on_signature` function:

```sql
CREATE OR REPLACE FUNCTION create_onboarding_on_signature()
RETURNS TRIGGER AS $$
DECLARE
  new_project_id UUID;
  project_info JSONB;
  -- existing variables...
  agent_company_name_val TEXT;
  agent_email_val TEXT;
  is_crunch_carbon BOOLEAN;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.signed_at IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND OLD.signed_at IS NULL AND NEW.signed_at IS NOT NULL) THEN
    
    -- ... existing code for extracting project info ...
    
    -- Get agent's company and email
    IF NEW.agent_id IS NOT NULL THEN
      -- Get company name from companies table via company_members
      SELECT c.company_name INTO agent_company_name_val
      FROM company_members cm
      JOIN companies c ON cm.company_id = c.id
      WHERE cm.user_id = NEW.agent_id 
      AND cm.status = 'active'
      LIMIT 1;
      
      -- Fallback to profile company_name if no team membership
      IF agent_company_name_val IS NULL THEN
        SELECT company_name INTO agent_company_name_val
        FROM profiles
        WHERE id = NEW.agent_id;
      END IF;
      
      -- Get agent email
      SELECT email INTO agent_email_val
      FROM profiles
      WHERE id = NEW.agent_id;
    END IF;
    
    -- Check if agent is Crunch Carbon
    is_crunch_carbon := agent_company_name_val ILIKE '%crunch carbon%';
    
    -- Apply business rules
    IF NEW.agent_id IS NULL OR is_crunch_carbon THEN
      agent_company_name_val := 'To be confirmed';
      agent_email_val := 'To be confirmed';
    END IF;
    
    -- ... existing project_onboarding INSERT ...
    
    -- Update onboarding_fields INSERT to include installer fields
    INSERT INTO onboarding_fields (
      project_id,
      system_address,
      commissioning_date,
      system_name,
      panel_total_kwp,
      system_gps_lat,
      system_gps_lng,
      installer_company_name,
      installer_email
    )
    VALUES (
      new_project_id,
      system_address_val,
      commissioning_date_val,
      system_name_val,
      panel_total_kwp_val,
      gps_lat_val,
      gps_lng_val,
      agent_company_name_val,
      agent_email_val
    )
    ON CONFLICT (project_id) DO UPDATE SET
      -- ... existing updates ...
      installer_company_name = COALESCE(
        NULLIF(onboarding_fields.installer_company_name, ''),
        EXCLUDED.installer_company_name
      ),
      installer_email = COALESCE(
        NULLIF(onboarding_fields.installer_email, ''),
        EXCLUDED.installer_email
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Files to Modify

| File/Resource | Changes |
|---------------|---------|
| Database migration | Update `create_onboarding_on_signature` trigger function |
| `bulk-move-to-onboarding` edge function | Add same logic for bulk operations |

---

## Edge Cases Handled

| Scenario | Result |
|----------|--------|
| No agent on proposal | "To be confirmed" for both fields |
| Agent is Crunch Carbon employee | "To be confirmed" for both fields |
| Agent is "Solar Giant" (e.g., Johan Greyling) | "Solar Giant" + agent's email |
| Agent is "Gridvolt Energy Solutions" | "Gridvolt Energy Solutions" + agent's email |
| Agent has no team (solo agent) | Uses profile `company_name` + email |
| Fields already populated | Does not overwrite existing values |

---

## Example Outcomes

Based on existing data:
- **Nicole Smith (Gridvolt Energy Solutions)** → `installer_company_name: "Gridvolt Energy Solutions"`, `installer_email: "nicole@gridvolt.co.za"`
- **Shaun Slabber (Crunch Carbon)** → `installer_company_name: "To be confirmed"`, `installer_email: "To be confirmed"`
- **Flip Opperman (PV Solution Services)** → `installer_company_name: "PV Solution Services Pty Ltd"`, `installer_email: "info@pvsolution.co.za"`
- **No agent assigned** → `installer_company_name: "To be confirmed"`, `installer_email: "To be confirmed"`

