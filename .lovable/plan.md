
# Dynamic Inverter Details Form

## Summary
Change the Inverter Details section to display dynamic rows based on "Number of Inverters". Each row will have its own Brand dropdown, Model input, Capacity (kW) input, and Serial Number input.

---

## Current Layout
| Field | Description |
|-------|-------------|
| Inverter Brand | Single dropdown (shared for all) |
| Model | Single input (shared for all) |
| Number of Inverters | Controls how many serial fields show |
| Capacity (kW) | Single input (shared for all) |
| Serial Numbers | Multiple inputs based on quantity |

---

## New Layout

**Number of Inverters** field stays at the top. Based on this value (e.g., 3), display 3 rows:

| Inverter | Brand (dropdown) | Model | Capacity (kW) | Serial Number |
|----------|------------------|-------|---------------|---------------|
| 1 | [Select brand] | [Input] | [Input] | [Input] |
| 2 | [Select brand] | [Input] | [Input] | [Input] |
| 3 | [Select brand] | [Input] | [Input] | [Input] |

Followed by the existing "Total Cost Installed" field and "Data Collector" fields.

---

## Technical Approach

### Data Storage Strategy
Store inverter details as a JSON array in the existing `inverter_serial` text field (which already supports JSON):

```json
[
  {"brand": "Huawei", "model": "SUN2000", "capacity_kw": 10, "serial": "ABC123"},
  {"brand": "Huawei", "model": "SUN2000", "capacity_kw": 10, "serial": "ABC124"},
  {"brand": "SMA", "model": "Sunny Boy", "capacity_kw": 5, "serial": "XYZ789"}
]
```

This approach:
- Requires no database migrations
- Uses existing column that already stores JSON arrays
- Maintains backward compatibility with existing data

### File Changes

| File | Changes |
|------|---------|
| `src/pages/ProjectOnboardingDetail/OnboardingTab.tsx` | Refactor Inverter Details section |

### Implementation Details

1. **New State Structure**
```tsx
interface InverterDetail {
  brand: string;
  model: string;
  capacity_kw: number | null;
  serial: string;
}
const [inverterDetails, setInverterDetails] = useState<InverterDetail[]>([]);
```

2. **Update useEffect** - Parse existing data on load
   - Handle backward compatibility: if old format (single brand/model/capacity), convert to new format
   - If already JSON array format, use directly

3. **Replace Current Form Fields** with dynamic rows
   - Keep "Number of Inverters" input at top
   - Render array of inverter rows based on quantity
   - Each row has: Brand dropdown, Model input, Capacity input, Serial input

4. **Update Save Logic**
   - Serialize `inverterDetails` array to JSON string
   - Store in `inverter_serial` field
   - Clear old single-value fields (`inverter_brand`, `inverter_model`, `inverter_capacity_kw`) or leave for backward compatibility

### UI Layout (per row)
```text
+------------------+------------------+---------------+------------------+
| Inverter 1       |                  |               |                  |
| [Brand dropdown] | [Model input]    | [Capacity kW] | [Serial Number]  |
+------------------+------------------+---------------+------------------+
```

---

## Backward Compatibility

For existing projects with old data format:
- If `inverter_brand`, `inverter_model`, `inverter_capacity_kw` have values but `inverter_serial` is simple string/array
- Convert to new format: create array of objects using shared brand/model/capacity with individual serials
- This ensures existing data continues to work

---

## No Database Migration Required
All changes are UI-only, reusing the existing `inverter_serial` text column for structured JSON storage.
