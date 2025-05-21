
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProposalData } from "@/types/proposals";
import { transformToProposalData } from "@/utils/proposalTransformers";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { logger } from "@/lib/logger";

/**
 * Hook to fetch and manage proposal data 
 */
export function useProposalData(id?: string, token?: string | null) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  
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
      proposalLogger.info("Fetching proposal", { proposalId, hasToken: !!invitationToken });
      
      if (invitationToken) {
        // Use the new function that handles token validation and proposal fetching in one transaction
        const { data, error: fetchError } = await supabase
          .rpc('get_proposal_by_token', { token_param: invitationToken });
        
        if (fetchError) {
          proposalLogger.error("Error fetching proposal with token", { 
            error: fetchError,
            tokenPrefix: invitationToken.substring(0, 5) + "..."
          });
          throw new Error(fetchError.message || "This invitation link is invalid or has expired.");
        }
        
        if (!data || data.length === 0) {
          proposalLogger.error("No proposal found with token", { 
            tokenPrefix: invitationToken.substring(0, 5) + "..."
          });
          throw new Error("Proposal not found. The invitation may have expired.");
        }
        
        const proposalData = data[0];
        
        // Set client email from the response
        setClientEmail(proposalData.client_email);
        
        // Transform to our standard ProposalData type
        const typedProposal = transformToProposalData(proposalData);
        proposalLogger.info("Proposal fetched via token", { 
          proposalId: typedProposal.id,
          status: typedProposal.status,
          hasClientId: !!typedProposal.client_id,
          hasClientContactId: !!typedProposal.client_contact_id
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
          status: typedProposal.status,
          hasClientId: !!typedProposal.client_id,
          hasClientContactId: !!typedProposal.client_contact_id
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
  }, [handleError, proposalLogger]);

  useEffect(() => {
    fetchProposal(id, token);
  }, [id, token, fetchProposal]);

  return {
    proposal,
    loading,
    error,
    clientEmail,
    fetchProposal
  };
}
