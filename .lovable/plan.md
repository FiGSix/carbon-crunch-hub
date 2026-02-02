

# Remove "How It Works" from Header Navigation

## Overview

Remove the non-functional "How It Works" menu item from the header navigation bar. This link currently points to `/#how-it-works` but doesn't navigate to anything meaningful.

## Change Summary

**File to modify:** `src/components/layout/Header.tsx`

Remove the "How It Works" entry from the `navItems` array (lines 207-211):

```typescript
// REMOVE this item:
{ 
  label: "How It Works", 
  href: "/#how-it-works",
  description: "Learn about our process" 
},
```

## Result

The navigation bar will display these items after the change:
- Home
- For Home Owners
- Calculator
- For Agents
- Why Choose Us
- About
- Contact
- Got Game?

This applies to both the desktop navigation bar and the mobile slide-out menu since they both use the same `navItems` array.

