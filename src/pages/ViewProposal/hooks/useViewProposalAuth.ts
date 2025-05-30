
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";
import { ProposalData } from "@/types/proposals";

export function useViewProposalAuth(proposal: ProposalData | null, clientEmail: string | null, token: string | null) {
  const { user } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  
  // Create a contextualized logger
  const authLogger = logger.withContext({ 
    component: 'ViewProposalAuth', 
    feature: 'proposals' 
  });

  // Handler for when auth is complete
  const handleAuthComplete = useCallback(() => {
    authLogger.info("Authentication completed, refreshing view", { action: 'authComplete' });
    setShowAuthForm(false);
  }, [authLogger]);

  // Handler for when user wants to sign in (to take actions)
  const handleSignInClick = useCallback(() => {
    if (proposal) {
      authLogger.info("User clicked sign in to take actions", { proposalId: proposal.id });
      setShowAuthForm(true);
    }
  }, [proposal, authLogger]);

  // Determine if we should show the sign-in prompt - token access but not logged in
  const showSignInPrompt = !user && token && clientEmail && 
    proposal?.status === 'pending' && !proposal?.archived_at && !proposal?.review_later_until;

  return {
    user,
    showAuthForm,
    handleAuthComplete,
    handleSignInClick,
    showSignInPrompt
  };
}
