
# Update Profile Referral Section: Agent to Client

## Summary
Change the "Refer an Agent" section on the Profile page to "Refer a Client" instead. This aligns with the existing client referral functionality already available on the `/referral` page.

---

## Current vs New

| Aspect | Current | New |
|--------|---------|-----|
| Title | "Refer an Agent" | "Refer a Client" |
| Description | "Invite other agents to join..." | "Invite clients to join..." |
| Referral Link | `/agents?ref={userId}` | `/calculator?ref={userId}` |
| WhatsApp Message | Agent recruitment focused | Client-focused (solar benefits) |
| Icon | Users2 | UserPlus (more appropriate for adding clients) |

---

## File Changes

| File | Changes |
|------|---------|
| `src/components/profile/AgentReferralSection.tsx` | Update text, link, and messaging |

---

## Implementation Details

### 1. Update Component Content

**Before:**
```tsx
<CardTitle>Refer an Agent</CardTitle>
<CardDescription>
  Invite other agents to join the Crunch Carbon network
</CardDescription>
```

**After:**
```tsx
<CardTitle>Refer a Client</CardTitle>
<CardDescription>
  Invite clients to monetize their solar systems with Crunch Carbon
</CardDescription>
```

### 2. Update Referral Link
```tsx
// Before
const referralLink = `${window.location.origin}/agents?ref=${profile?.id}`;

// After
const referralLink = `${window.location.origin}/calculator?ref=${profile?.id}`;
```

### 3. Update WhatsApp Message
```tsx
// Before (agent recruitment)
const whatsappMessage = `Hey! I'm working with Crunch Carbon as an agent...`;

// After (client-focused)
const whatsappMessage = `Howzit! I've been working with Crunch Carbon to help solar owners monetize their systems through carbon credits. It's free and easy to get started. Check it out: ${referralLink}`;
```

### 4. Update Icon
```tsx
// Change from Users2 to UserPlus
import { Copy, Check, MessageCircle, UserPlus } from "lucide-react";

<UserPlus className="h-5 w-5 text-primary" />
```

---

## Optional: Rename Component File
Consider renaming `AgentReferralSection.tsx` to `ClientReferralSection.tsx` for clarity. This would also require updating the import in `Profile.tsx`.

---

## No Database Changes Required
This is a UI-only text and link update.
