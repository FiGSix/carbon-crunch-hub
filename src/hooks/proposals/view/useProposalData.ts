
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
        // Validate the token and get the proposal ID, client email, and both ID types
        const { data, error: validationError } = await supabase.rpc(
          'validate_invitation_token', 
          { token: invitationToken }
        );
        
        if (validationError || !data || !data.length || !data[0].proposal_id) {
          proposalLogger.error("Token validation failed", { 
            error: validationError,
            tokenPrefix: invitationToken?.substring(0, 5)
          });
          throw new Error("This invitation link is invalid or has expired.");
        }
        
        const validatedProposalId = data[0].proposal_id;
        const invitedEmail = data[0].client_email;
        const clientId = data[0].client_id;
        const clientContactId = data[0].client_contact_id;
        
        proposalLogger.info("Token validated", { 
          validatedProposalId, 
          invitedEmail,
          hasClientId: !!clientId,
          hasClientContactId: !!clientContactId
        });
        
        setClientEmail(invitedEmail);
        
        // Now fetch the proposal with the validated ID
        const { data: proposalData, error: fetchError } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', validatedProposalId)
          .single();
        
        if (fetchError) {
          proposalLogger.error("Error fetching proposal after token validation", { 
            error: fetchError,
            proposalId: validatedProposalId
          });
          throw fetchError;
        }
        
        // Transform to our standard ProposalData type
        const typedProposal = transformToProposalData(proposalData);
        proposalLogger.info("Proposal fetched via token", { 
          proposalId: typedProposal.id,
          status: typedProposal.status,
          hasClientId: !!typedProposal.client_id,
          hasClientContactId: !!typedProposal.client_contact_id
        });
        setProposal(typedProposal);
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
