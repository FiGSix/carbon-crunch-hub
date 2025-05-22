
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProposalData } from "@/types/proposals";
import { transformToProposalData } from "@/utils/proposalTransformers";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { logger } from "@/lib/logger";
import { useInvitationToken } from "@/hooks/useInvitationToken";

/**
 * Hook to fetch and manage proposal data 
 */
export function useProposalData(id?: string, token?: string | null) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const { persistToken, loading: tokenLoading } = useInvitationToken();
  
  const { handleError } = useErrorHandler({
    context: "proposal-data",
    toastOnError: false, // We'll handle UI display through the component
    navigateOnFatal: false
  });

  // Create a contextualized logger
  const proposalLogger = logger.withContext({
    component: 'useProposalData',
    feature: 'proposals'
  });

  const fetchProposal = useCallback(async (proposalId?: string, invitationToken?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      proposalLogger.info("Fetching proposal", { 
        proposalId, 
        hasToken: !!invitationToken,
        tokenPrefix: invitationToken ? invitationToken.substring(0, 8) : null
      });
      
      if (invitationToken) {
        // First, persist the token in the session to ensure it's available for RLS policies
        proposalLogger.info("Using invitation token to fetch proposal", { 
          tokenPrefix: invitationToken.substring(0, 8)
        });
        
        const tokenResult = await persistToken(invitationToken);
        
        if (!tokenResult.success || !tokenResult.valid) {
          proposalLogger.error("Token validation failed", { 
            success: tokenResult.success,
            valid: tokenResult.valid,
            error: tokenResult.error
          });
          throw new Error(tokenResult.error || "This invitation link is invalid or has expired.");
        }
        
        // Get the proposal by ID (the token is already set in the session context)
        if (tokenResult.proposalId) {
          proposalLogger.info("Using proposal ID from token validation", { proposalId: tokenResult.proposalId });
          
          const { data, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', tokenResult.proposalId)
            .single();
          
          if (fetchError) {
            proposalLogger.error("Error fetching proposal with token", { 
              error: fetchError,
              proposalId: tokenResult.proposalId
            });
            throw new Error(fetchError.message || "Error loading proposal. Please try again.");
          }
          
          // Transform to our standard ProposalData type
          const typedProposal = transformToProposalData(data);
          
          // Set client email from the content (if available)
          setClientEmail(
            typedProposal.content?.clientInfo?.email || 
            tokenResult.clientEmail || 
            null
          );
          
          proposalLogger.info("Proposal fetched via token", { 
            proposalId: typedProposal.id,
            status: typedProposal.status,
            clientEmail: tokenResult.clientEmail
          });
          
          setProposal(typedProposal);
          
          // Mark the invitation as viewed in a separate call
          // This doesn't need to block the UI flow, so we don't await it
          supabase.rpc('mark_invitation_viewed', { token_param: invitationToken })
            .then(({ error }) => {
              if (error) {
                proposalLogger.error("Failed to mark invitation as viewed", { error });
              } else {
                proposalLogger.info("Invitation marked as viewed");
              }
            });
        } else {
          throw new Error("No proposal ID was returned from token validation.");
        }
      } else if (proposalId) {
        // Regular fetch by ID (for authenticated users)
        proposalLogger.info("Fetching proposal by ID", { proposalId });
        const { data, error: fetchError } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .single();
        
        if (fetchError) {
          proposalLogger.error("Error fetching proposal by ID", { 
            error: fetchError,
            proposalId
          });
          throw fetchError;
        }
        
        // Transform to our standard ProposalData type
        const typedProposal = transformToProposalData(data);
        proposalLogger.info("Proposal fetched successfully", { 
          proposalId,
          status: typedProposal.status
        });
        setProposal(typedProposal);
      } else {
        throw new Error("No proposal ID or invitation token provided.");
      }
    } catch (err) {
      const errorState = handleError(err, "Failed to load the proposal");
      setError(errorState.message || "Failed to load the proposal. It may have been deleted or you don't have permission to view it.");
      proposalLogger.error("Error fetching proposal", { error: err });
    } finally {
      setLoading(false);
    }
  }, [handleError, proposalLogger, persistToken]);

  useEffect(() => {
    fetchProposal(id, token);
  }, [id, token, fetchProposal]);

  return {
    proposal,
    loading: loading || tokenLoading,
    error,
    clientEmail,
    fetchProposal
  };
}
