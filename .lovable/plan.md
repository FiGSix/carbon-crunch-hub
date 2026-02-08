

# Update Navigation Label: "For Home Owners" to "For Homes"

## Overview

A simple text update to change the navigation label from "For Home Owners" to "For Homes" for a cleaner, more concise presentation.

---

## File to Modify

### `src/components/layout/Header.tsx`

**Change (line 208):**

| Before | After |
|--------|-------|
| `label: "For Home Owners"` | `label: "For Homes"` |

---

## Impact

This change will update:
- Desktop navigation menu
- Mobile slide-out menu

Both menus use the same `navItems` array, so a single change updates both.

---

## No Other Files Affected

The `/home-owners` route path remains unchanged - only the display label is updated.

