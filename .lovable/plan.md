

# Improve Address Conflict UX Messaging

## Problem

The current conflict warning messages are technical and unclear from a user's perspective:
- "This project is already registered within 50m" — users don't think in meters
- "Matched by address - GPS data not available" — internal system detail exposed
- The red alert is visually alarming but doesn't clearly tell the user what to **do**
- Conflict details show raw status values and technical metadata

## Changes

### 1. Rewrite tier messages for clarity (`AddressConflictWarning.tsx`)

**Conflict (red, ≤50m):**
- Title: "This Location May Already Be Registered"
- Message: "We found an existing project very close to this location. If you believe this is a different site, please reach out to the Crunch Carbon team for assistance."

**Warning (amber, ≤200m):**
- Title: "Nearby Project Detected"
- Message: "There's an existing project close to this location. Please confirm this is a separate site before continuing."

**Notice (blue, ≤500m):**
- Title: "Heads Up — Nearby Project"
- Message: "An existing project is located in the same area. No action needed — this is just for your reference."

### 2. Clean up the conflict detail card
- Replace raw `status` with human-readable labels (e.g., "signed" → "Active", "draft" → "In Progress")
- Show distance as "~Xm away" in a friendlier format
- Remove "Matched by address - GPS data not available" line (no longer relevant since we removed string fallback)

### 3. Improve action buttons for conflict tier
- Change "Contact Support" button text to "Get Help"
- Change "Continue Anyway (Admin Override)" to "I confirm this is a different site"

## Files Changed
- `src/components/proposals/project-info/AddressConflictWarning.tsx` — rewrite messages, humanize details, improve button labels

