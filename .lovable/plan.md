
# Dynamic Panel Array Details - Implementation Plan

## Overview

Modify the "Panel Details" section in project onboarding to support multiple solar panel arrays, similar to how inverter details work. Each array will have: Panel Brand/Manufacturer, Size (Wp), Number of Solar Panels, and Total Solar Array Size (kWp).

## Current State

The Panel Details section currently captures single values:
- `panel_brand` (text)
- `panel_size_wp` (numeric)
- `panel_quantity` (integer)
- `panel_total_kwp` (numeric)
- `panel_cost` (numeric)

## Proposed Approach

Following the proven pattern from inverter details:
1. Store panel array data as JSON in the existing `panel_brand` text column
2. Create a new `PanelArrayDetailsRow` component for individual array input rows
3. Add state management and useEffect hooks for dynamic array handling
4. Auto-calculate total kWp per array and overall system total

## Data Structure

```typescript
interface PanelArrayDetail {
  brand: string;           // Panel Brand / Manufacturer
  size_wp: number | null;  // Size in Wp (e.g., 550)
  quantity: number | null; // Number of Solar Panels
  total_kwp: number | null; // Auto-calculated: (size_wp × quantity) / 1000
}

// Stored as JSON array in panel_brand column
// Example: [{"brand":"JA Solar","size_wp":550,"quantity":100,"total_kwp":55}]
```

## UI Changes

```text
+--------------------------------------------------+
| Panel Details                              [✓/!] |
| Information about the solar panels               |
+--------------------------------------------------+
| Number of Arrays: [___1___] (1-10)               |
+--------------------------------------------------+
| ┌──────────────────────────────────────────────┐ |
| │ Array 1                                      │ |
| │ ┌──────────┐ ┌───────┐ ┌───────┐ ┌─────────┐│ |
| │ │Brand     │ │Size Wp│ │Panels │ │Total kWp││ |
| │ │[Select ▾]│ │[550  ]│ │[100  ]│ │[55.00  ]││ |
| │ └──────────┘ └───────┘ └───────┘ └─────────┘│ |
| └──────────────────────────────────────────────┘ |
| ┌──────────────────────────────────────────────┐ |
| │ Array 2                                      │ |
| │ ┌──────────┐ ┌───────┐ ┌───────┐ ┌─────────┐│ |
| │ │Brand     │ │Size Wp│ │Panels │ │Total kWp││ |
| │ │[Select ▾]│ │[     ]│ │[     ]│ │[       ]││ |
| │ └──────────┘ └───────┘ └───────┘ └─────────┘│ |
| └──────────────────────────────────────────────┘ |
+--------------------------------------------------+
| Total System: 150 panels, 82.50 kWp              |
| Total Cost Installed (Rands): [___150000___]     |
+--------------------------------------------------+
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/onboarding/PanelArrayDetailsRow.tsx` | Row component for individual panel array input |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx` | Add panel array state, useEffect for initialization, handler for changes, update Panel Details card UI |

## Implementation Details

### 1. PanelArrayDetailsRow.tsx (New Component)

Similar to `InverterDetailsRow`:
- Dropdown for Panel Brand (JA Solar, Jinko Solar, Longi, Canadian Solar, etc.)
- Input for Size (Wp)
- Input for Number of Panels
- Read-only calculated Total kWp field (auto-calculated from size × quantity / 1000)

Panel brand options:
- JA Solar
- Jinko Solar
- Longi Solar
- Canadian Solar
- Trina Solar
- Q Cells
- REC Solar
- Sunpower
- Other

### 2. OnboardingTab.tsx Changes

**New State:**
```typescript
const [panelArrayDetails, setPanelArrayDetails] = useState<PanelArrayDetail[]>([]);
const [panelArrayCount, setPanelArrayCount] = useState<number>(1);
```

**New useEffect for initialization:**
```typescript
useEffect(() => {
  // Parse existing panel_brand for JSON array format
  // If legacy single values exist, migrate to array format
  // Adjust array size based on panelArrayCount
}, [panelArrayCount, formData.panel_brand]);
```

**New handler:**
```typescript
const handlePanelArrayDetailChange = useCallback((
  index: number, 
  field: keyof PanelArrayDetail, 
  value: string | number | null
) => {
  setPanelArrayDetails(prev => {
    const newDetails = [...prev];
    newDetails[index] = { ...newDetails[index], [field]: value };
    
    // Auto-calculate total_kwp for this array
    if (field === 'size_wp' || field === 'quantity') {
      const size = field === 'size_wp' ? value : newDetails[index].size_wp;
      const qty = field === 'quantity' ? value : newDetails[index].quantity;
      if (size && qty) {
        newDetails[index].total_kwp = parseFloat(((size * qty) / 1000).toFixed(2));
      }
    }
    
    // Serialize and store in panel_brand
    setFormData(prev => ({ ...prev, panel_brand: JSON.stringify(newDetails) }));
    
    // Update aggregate totals in formData
    const totalQuantity = newDetails.reduce((sum, arr) => sum + (arr.quantity || 0), 0);
    const totalKwp = newDetails.reduce((sum, arr) => sum + (arr.total_kwp || 0), 0);
    setFormData(prev => ({ 
      ...prev, 
      panel_quantity: totalQuantity,
      panel_total_kwp: parseFloat(totalKwp.toFixed(2))
    }));
    
    return newDetails;
  });
}, []);
```

**Updated Panel Details Card:**
- Add "Number of Arrays" input at the top (1-10)
- Dynamically render `PanelArrayDetailsRow` for each array
- Show aggregate totals at bottom
- Keep panel_cost input for total cost

### 3. Backward Compatibility

When loading existing data:
1. Check if `panel_brand` contains valid JSON array
2. If yes, parse and display as arrays
3. If no (legacy single value), migrate to array format using existing field values
4. Preserve all data during migration

## Validation Updates

The section status check will verify:
- At least one array has brand, quantity, and size filled
- Total system kWp is calculated
- Panel cost is entered (optional but tracked)

## No Database Migration Required

Following the inverter pattern, all data is stored as JSON in the existing `panel_brand` text column. This avoids schema changes while enabling the dynamic array functionality.
