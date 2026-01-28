
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";
import { ProposalData } from "@/types/proposals";

export function useViewProposalAuth(proposal: ProposalData | null, clientEmail: string | null, token: string | null) {
  const { user } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  
  // Phase 4: Add auth state context to track post-auth flow
  const [authContext, setAuthContext] = useState<{
    justCompleted: boolean;
    proposalId: string | null;
  }>({
    justCompleted: false,
    proposalId: null
  });
  
  // Create a contextualized logger
  const authLogger = logger.withContext({ 
    component: 'ViewProposalAuth', 
    feature: 'proposals' 
  });

  // Phase 4: Handler for when auth is complete - capture context
  const handleAuthComplete = useCallback(() => {
    authLogger.info("Authentication completed, preparing redirect", { 
      action: 'authComplete',
      proposalId: proposal?.id 
    });
    
    setAuthContext({
      justCompleted: true,
      proposalId: proposal?.id || null
    });
    
    setShowAuthForm(false);
  }, [authLogger, proposal?.id]);
  
  // Phase 4: Effect to handle post-auth redirect
  useEffect(() => {
    if (user && authContext.justCompleted && authContext.proposalId) {
      authLogger.info("Post-auth redirect triggered", {
        userId: user.id,
        proposalId: authContext.proposalId
      });
      
      // Redirect to dashboard with success message
      window.location.href = `/dashboard?auth=success&proposal=${authContext.proposalId}`;
    }
  }, [user, authContext, authLogger]);

  // Handler for when user wants to sign in (to take actions)
  const handleSignInClick = useCallback(() => {
    if (proposal) {
      authLogger.info("User clicked sign in to take actions", { proposalId: proposal.id });
      setShowAuthForm(true);
    }
  }, [proposal, authLogger]);

  // All statuses where a client can take action (matches useProposalStatus)
  // Removed 'pending' - now includes full pre-signature status chain
  const ACTIONABLE_STATUSES = ['draft', 'sent', 'delivered', 'opened', 'viewed', 'stale'];
  
  // Determine if we should show the sign-in prompt - token access but not logged in
  const showSignInPrompt = !user && token && clientEmail && 
    proposal?.status && ACTIONABLE_STATUSES.includes(proposal.status) && 
    !proposal?.archived_at && !proposal?.review_later_until && !proposal?.signed_at;

  return {
    user,
    showAuthForm,
    handleAuthComplete,
    handleSignInClick,
    showSignInPrompt,
    authContext // Expose for debugging
  };
}
