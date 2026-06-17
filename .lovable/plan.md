## Objective
Add "Sig Energy" as a new option in the Battery Brand dropdown within the Project Onboarding form.

## Location
`src/pages/ProjectOnboardingDetail/OnboardingTab.tsx` — lines 1223-1237, inside the `<SelectContent>` for `battery_brand`.

## Change
Insert `<SelectItem value="Sig Energy">Sig Energy</SelectItem>` into the existing alphabetical list of battery brands, between "Sunsynk" and "Volta".

## Validation
- The new option appears in the Battery Brand dropdown when "Has Battery" is set to "Yes".
- Selecting "Sig Energy" saves correctly and passes form validation.