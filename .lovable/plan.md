

# Analysis: Multi-Phase Onboarding — Short-Term Fix vs Long-Term Solution

## You're right — the proposed fix is a band-aid

The current architecture has a fundamental design gap for multi-phase projects:

```text
┌─────────────────────────┐       ┌──────────────────────────┐
│   proposals.content     │       │    onboarding_fields     │
│   └─ projectInfo        │       │                          │
│      └─ phases[] ────────────►  │  commissioning_date (1)  │ ← single field
│         ├─ phase 1 date │  ?    │                          │   can't hold
│         ├─ phase 2 date │       │  (no phase storage)      │   multiple dates
│         └─ phase N date │       │                          │
└─────────────────────────┘       └──────────────────────────┘
```

**Current state:**
- Phase dates live **only** in `proposals.content.projectInfo.phases[]` (JSONB inside proposals)
- The onboarding UI shows them **read-only** — no way to edit during onboarding
- `onboarding_fields.commissioning_date` is a single field — can't represent multiple phases
- The completion checker requires `commissioning_date` to be filled, which it never will be for multi-phase

**What the short-term fix does:** Skips the `commissioning_date` requirement for multi-phase. Doesn't solve:
- Can't edit phase dates during onboarding
- Can't edit phase sizes during onboarding  
- No audit trail for phase date changes made during onboarding
- If EPC discovers a phase date is wrong, they must ask an admin to edit the proposal instead

## Long-Term Solution

### Option A: Store phases in `onboarding_fields` as JSONB

Add a `phases_json` column to `onboarding_fields`:

```sql
ALTER TABLE onboarding_fields 
  ADD COLUMN phases_json jsonb DEFAULT NULL;
-- e.g. [{"phaseNumber":1,"sizeKWp":500,"commissionDate":"2024-06-01"}, ...]
```

**Onboarding flow changes:**
1. When onboarding is created (trigger), copy `proposals.content.projectInfo.phases` into `onboarding_fields.phases_json`
2. Make the phase rows **editable** in the onboarding UI (date pickers + size inputs per phase)
3. On save, write back to `onboarding_fields.phases_json`
4. On cascade sync (already exists), push updated phases back to `proposals.content.projectInfo.phases`
5. Completion check: for multi-phase, require all phases to have valid dates instead of checking `commissioning_date`

### Option B: Separate `onboarding_phases` table

```sql
CREATE TABLE onboarding_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES project_onboarding(id) NOT NULL,
  phase_number int NOT NULL,
  size_kwp numeric,
  commission_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, phase_number)
);
```

More normalized but adds join complexity.

## Recommendation

**Ship both:**

1. **Now (short-term):** Apply the validation skip fix so Keystone Hatchery isn't blocked. This is a 1-line change.

2. **Next sprint (long-term):** Implement Option A (JSONB column). It's lower friction than a new table, matches the existing proposal data shape, and the cascade sync pattern already exists for `system_name` and `panel_total_kwp`. The UI change is moderate — convert the read-only phase display (lines 796-824) into editable inputs with the same date validation rules.

### Scope of the long-term fix
- 1 migration (add `phases_json` column + backfill from proposals)
- Update `create_onboarding_on_signature` trigger to copy phases
- Update OnboardingTab UI: editable phase rows
- Update save logic: persist `phases_json` + cascade sync to proposal
- Update `getSectionCompletionInfo`: validate phase dates from `phases_json`
- Update `validate_onboarding_completion` RPC: check phases

