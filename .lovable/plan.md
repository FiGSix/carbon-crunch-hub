

# Fix Expired Token Access for Admins and Agents

## Overview

Modify the proposal acceptance page to allow admins AND agents to view proposals even when the invitation token has expired. The fallback will use RLS-based authentication, granting access to any proposal the user would normally have access to.

## Problem Summary

When a user visits a proposal acceptance link (`/proposals/:id/accept?token=...`) with an expired token:
- **Currently**: Everyone sees "Error Loading Proposal" 
- **After fix**: Admins and agents with RLS access can view the proposal with a warning banner

## Two-Part Solution

### Part 1: PDF Generation Token Renewal

**File:** `supabase/functions/generate-proposal-pdf/index.ts`

Update the token renewal logic to work for **all unsigned proposals** (not just drafts):

**Current Logic:**
```typescript
if (proposal.status === 'draft') {
  // Only generates new token for draft proposals
}
```

**New Logic:**
```typescript
// Generate tokens for ANY unsigned proposal with expired/missing token
const isUnsigned = !proposal.signed_at;
if (isUnsigned) {
  const now = new Date();
  const tokenExpired = !proposal.invitation_expires_at || 
                       new Date(proposal.invitation_expires_at) <= now;
  
  if (!proposal.invitation_token || tokenExpired) {
    console.log('[PDF] Generating new invitation token for unsigned proposal');
    
    const newToken = crypto.randomUUID().replace(/-/g, '') + 
                     crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(now.getTime() + 240 * 60 * 60 * 1000); // 10 days
    
    // Update token in database
    await supabaseAdmin
      .from('proposals')
      .update({
        invitation_token: newToken,
        invitation_expires_at: expiresAt.toISOString()
      })
      .eq('id', proposalId);
    
    // Use the new token in the PDF
    proposal.invitation_token = newToken;
    proposal.invitation_expires_at = expiresAt.toISOString();
  }
}
```

This ensures that regenerating any unsigned proposal's PDF will create a fresh working token.

---

### Part 2: Frontend Fallback for Expired Tokens

**File:** `src/pages/ProposalAcceptance/index.tsx`

#### Changes:

1. **Add new state for expired token tracking**
```typescript
const [tokenExpired, setTokenExpired] = useState(false);
```

2. **Modify `fetchProposalByToken` with fallback logic**

When token-based fetch fails due to expiration:
- Check if user is authenticated
- Check if user is admin OR agent
- If admin/agent, try RLS-based authenticated fetch
- Set `tokenExpired` flag to show warning banner

```typescript
const fetchProposalByToken = async () => {
  try {
    setLoading(true);
    
    const { data, error } = await supabase
      .rpc('get_proposal_by_token_direct', { token_param: token });

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Proposal not found or invitation has expired");
    }

    // ... existing success handling
  } catch (err) {
    console.error("Error fetching proposal by token:", err);
    
    const errorMessage = err instanceof Error ? err.message : String(err);
    const isExpiredError = errorMessage.includes('expired') || 
                           errorMessage.includes('Invalid or expired');
    
    // Check if user is authenticated admin or agent
    const { data: { user } } = await supabase.auth.getUser();
    
    if (isExpiredError && user && id) {
      // Check user's role from user_roles table (secure approach)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const hasAgentOrAdminRole = roles?.some(r => 
        r.role === 'admin' || r.role === 'agent'
      );
      
      if (hasAgentOrAdminRole) {
        console.log("Token expired but user is admin/agent, using RLS access");
        setTokenExpired(true);
        // fetchProposalAuthenticated will use RLS to check access
        await fetchProposalAuthenticated();
        return;
      }
    }
    
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};
```

3. **Add warning banner component**

Display when admin/agent views proposal via expired token:

```tsx
import { AlertTriangle } from "lucide-react";

// After loading check, before error check in the render:
{tokenExpired && (
  <div className="container max-w-4xl mx-auto px-4 pt-4">
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
      <div>
        <p className="text-amber-800 font-medium">Invitation Link Expired</p>
        <p className="text-amber-700 text-sm">
          The client's invitation token has expired. You're viewing this proposal 
          with your account privileges. To send a new working link to the client, 
          regenerate the PDF which will create a fresh token.
        </p>
      </div>
    </div>
  </div>
)}
```

---

## Access Control Matrix

| User Type | Token Valid | Token Expired | Result |
|-----------|-------------|---------------|--------|
| **Admin** (Shaun) | ✅ Works | ✅ RLS fallback + warning | Can always view |
| **Agent** (Nicole - owns proposal) | ✅ Works | ✅ RLS fallback + warning | Can view her proposals |
| **Agent** (Teammate) | ✅ Works | ✅ RLS fallback + warning | Can view company proposals |
| **Client** | ✅ Works | ❌ Error | Needs new link from agent |
| **Anonymous** | ✅ Works | ❌ Error | No fallback access |

The RLS policies for proposals already handle company-aware visibility for agents, so the `fetchProposalAuthenticated` function will correctly determine access.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-proposal-pdf/index.ts` | Update token renewal from `draft` only to all unsigned proposals |
| `src/pages/ProposalAcceptance/index.tsx` | Add agent/admin fallback logic and warning banner |

---

## Testing Scenarios

After implementation, verify:

1. **Nicole (Agent) clicks expired link for her proposal** → Shows proposal with warning banner
2. **Nicole's teammate clicks expired link** → Shows proposal with warning banner (company-aware access)
3. **Admin clicks any expired link** → Shows proposal with warning banner
4. **Client clicks expired link** → Shows "Error Loading Proposal" (correct - they need a fresh link)
5. **Force regenerate PDF** → New PDF has fresh 10-day token that works

