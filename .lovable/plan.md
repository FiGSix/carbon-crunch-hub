
# Multi-Phase Onboarding — COMPLETED

## Summary

Added `phases_json` JSONB column to `onboarding_fields` to properly support multi-phase projects. Phase dates and sizes are now editable during onboarding and cascade-sync back to the proposal.

### Database Changes
- Added `phases_json` column to `onboarding_fields` (JSONB, nullable)
- Backfilled Keystone Hatchery's phases from proposal content
- Updated `create_onboarding_on_signature` trigger to copy phases on onboarding creation
- Updated `validate_onboarding_completion` RPC: multi-phase projects skip `commissioning_date` check (dates live in `phases_json`)

### Frontend Changes
- Added `PhaseDetail` type to `src/types/onboarding.ts`
- `OnboardingTab.tsx`: Replaced read-only phase display with editable date pickers + size inputs per phase
- `getSectionCompletionInfo('system')`: For multi-phase, requires `system_address` + all phase dates filled (not `commissioning_date`)
- Both `handleSaveDraft` and `handleValidateAndComplete` cascade-sync `phases_json` back to `proposals.content.projectInfo.phases`
- Single-phase projects unchanged — still use `commissioning_date` field

### Data Flow
```
onboarding_fields.phases_json  ←→  proposals.content.projectInfo.phases
       (editable in UI)              (synced on save)
```
