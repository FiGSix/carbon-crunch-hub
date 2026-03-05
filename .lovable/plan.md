

# Improve Onboarding Section Completion Visibility

## Problem

The current UX relies on a small 20px icon (CheckCircle2/AlertCircle) in the top-right corner of each card. When data is pre-filled from the proposal, clients scan the page, see populated fields, and skip sections that still have empty required fields. The validation summary only appears after clicking "Submit" — too late.

## Solution: Subtle but firm visual cues at three levels

### 1. Section-level: Colored left border on each Card

Add a 4px left border to every section card:
- **Green** (`border-l-green-500`) when the section is complete
- **Amber** (`border-l-amber-500`) when the section has missing required fields

This is immediately scannable when scrolling — the client sees a vertical "traffic light" down the page without needing to read anything. Subtle (just a border), but firm (impossible to miss).

### 2. Section-level: Inline incomplete field count

Inside each incomplete card header, add a small text badge next to the existing AlertCircle:
```
⚠ 2 fields remaining
```
This tells the client exactly how much work is left in that section, preventing the "it looks done" problem.

### 3. Page-level: Progress bar at the top

Add an overall completion progress bar above all cards showing "4 of 7 sections complete". This gives clients a clear goal and makes them scroll to find the incomplete ones.

## Implementation

### File: `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx`

**A) Add a `getSectionCompletionInfo` helper** that returns `{ complete: boolean, remaining: number, total: number }` for each section, replacing the boolean-only `getSectionStatus`.

**B) Add progress bar** after the page heading, before the first Card:
```tsx
const sections = [systemInfo, inverterInfo, batteryInfo, panelInfo, financialInfo, docsInfo, omInfo];
const completedCount = sections.filter(s => s.complete).length;

<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>{completedCount} of {sections.length} sections complete</span>
    <span>{Math.round((completedCount / sections.length) * 100)}%</span>
  </div>
  <Progress value={(completedCount / sections.length) * 100} />
</div>
```

**C) Update each Card** to use the colored left border and remaining count:
```tsx
<Card className={cn(
  "border-l-4",
  sectionInfo.complete ? "border-l-green-500" : "border-l-amber-500"
)}>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>System Details</CardTitle>
        <CardDescription>...</CardDescription>
      </div>
      <div className="flex items-center gap-2">
        {!sectionInfo.complete && (
          <span className="text-xs text-amber-600 font-medium">
            {sectionInfo.remaining} field{sectionInfo.remaining !== 1 ? 's' : ''} remaining
          </span>
        )}
        {sectionInfo.complete ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-500" />
        )}
      </div>
    </div>
  </CardHeader>
```

## Files Changed

| File | Change |
|------|--------|
| `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx` | Add progress bar, colored card borders, remaining field counts per section |

