
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProposalData } from "@/types/proposals";
import { transformToProposalData } from "@/utils/proposalTransformers";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { logger } from "@/lib/logger";
import { useInvitationToken } from "@/hooks/useInvitationToken";

/**
 * Hook to fetch and manage proposal data using direct token validation
 */
export function useProposalData(id?: string, token?: string | null) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const { persistToken, loading: tokenLoading } = useInvitationToken();
  
  const { handleError } = useErrorHandler({
    context: "proposal-data",
    toastOnError: false,
    navigateOnFatal: false
  });

  const proposalLogger = logger.withContext({
    component: 'useProposalData',
    feature: 'proposals'
  });

  const fetchProposalByToken = useCallback(async (invitationToken: string) => {
    try {
      proposalLogger.info("🎫 Fetching proposal by token directly", { 
        tokenPrefix: invitationToken.substring(0, 8)
      });
      
      console.log("🎫 === FETCHING PROPOSAL BY TOKEN DIRECTLY ===");
      console.log(`🎫 Token: ${invitationToken.substring(0, 8)}...`);
      
      // Use the new direct function to get proposal by token
      const { data, error: fetchError } = await supabase.rpc(
        'get_proposal_by_token_direct',
        { token_param: invitationToken }
      );
      
      if (fetchError) {
        proposalLogger.error("❌ Error fetching proposal by token", { 
          error: fetchError,
          errorCode: fetchError.code,
          errorMessage: fetchError.message
        });
        
        console.error("❌ === PROPOSAL FETCH BY TOKEN ERROR ===", {
          error: fetchError,
          errorCode: fetchError.code
        });
        
        if (fetchError.code === 'PGRST116') {
          throw new Error("This proposal could not be found. It may have been deleted or the invitation link is no longer valid.");
        } else if (fetchError.message?.includes('Invalid or expired')) {
          throw new Error("This invitation link is invalid or has expired. Please contact the person who sent you the proposal for a new link.");
        } else {
          throw new Error(`Error loading proposal: ${fetchError.message || "Please try again or contact support if the issue persists."}`);
        }
      }
      
      if (!data || data.length === 0) {
        throw new Error("No proposal found for this invitation token. The link may be invalid or expired.");
      }
      
      const proposalData = data[0];
      
      // Transform to our standard ProposalData type
      const typedProposal = transformToProposalData(proposalData);
      
      // Set client email from the response
      setClientEmail(proposalData.client_email || null);
      
      proposalLogger.info("✅ Proposal fetched via direct token", { 
        proposalId: typedProposal.id,
        status: typedProposal.status,
        clientEmail: proposalData.client_email
      });
      
      console.log("✅ === PROPOSAL SUCCESSFULLY LOADED BY TOKEN ===", {
        id: typedProposal.id,
        status: typedProposal.status,
        title: typedProposal.title
      });
      
      setProposal(typedProposal);
      
      // Mark the invitation as viewed in a separate call
      supabase.rpc('mark_invitation_viewed', { token_param: invitationToken })
        .then(({ error }) => {
          if (error) {
            proposalLogger.error("Failed to mark invitation as viewed", { error });
          } else {
            proposalLogger.info("Invitation marked as viewed");
          }
        });
        
    } catch (err) {
      throw err; // Re-throw to be handled by the main fetchProposal function
    }
  }, [proposalLogger]);

  const fetchProposal = useCallback(async (proposalId?: string, invitationToken?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      proposalLogger.info("🔄 Fetching proposal", { 
        proposalId, 
        hasToken: !!invitationToken,
        tokenPrefix: invitationToken ? invitationToken.substring(0, 8) : null
      });
      
      console.log("🔄 === FETCHING PROPOSAL ===");
      console.log(`📋 Proposal ID: ${proposalId}`);
      console.log(`🎫 Has token: ${!!invitationToken}`);
      console.log(`🎫 Token prefix: ${invitationToken ? invitationToken.substring(0, 8) : 'none'}`);
      
      if (invitationToken) {
        // Use direct token-based fetching
        await fetchProposalByToken(invitationToken);
      } else if (proposalId) {
        // Regular fetch by ID (for authenticated users)
        proposalLogger.info("🔄 Fetching proposal by ID", { proposalId });
        console.log("🔄 === FETCHING PROPOSAL BY ID ===", proposalId);
        
        const { data, error: fetchError } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .single();
        
        if (fetchError) {
          proposalLogger.error("❌ Error fetching proposal by ID", { 
            error: fetchError,
            proposalId,
            errorCode: fetchError.code,
            errorMessage: fetchError.message
          });
          
          console.error("❌ === PROPOSAL FETCH BY ID ERROR ===", {
            error: fetchError,
            proposalId,
            errorCode: fetchError.code
          });
          
          if (fetchError.code === 'PGRST116') {
            throw new Error("This proposal could not be found. It may have been deleted or you may not have the correct proposal ID.");
          } else if (fetchError.code === '42501' || fetchError.message?.includes('permission')) {
            throw new Error("You don't have permission to view this proposal. Please make sure you're signed in with the correct account.");
          } else {
            throw new Error(`Error loading proposal: ${fetchError.message || "Please try again or contact support if the issue persists."}`);
          }
        }
        
        const typedProposal = transformToProposalData(data);
        proposalLogger.info("✅ Proposal fetched successfully", { 
          proposalId,
          status: typedProposal.status
        });
        
        console.log("✅ === PROPOSAL LOADED BY ID ===", {
          id: typedProposal.id,
          status: typedProposal.status,
          title: typedProposal.title
        });
        
        setProposal(typedProposal);
      } else {
        throw new Error("No proposal ID or invitation token provided. Please check the URL and try again.");
      }
    } catch (err) {
      let errorMessage = "Failed to load the proposal. Please try again.";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      proposalLogger.error("❌ Error fetching proposal", { 
        error: err,
        errorMessage,
        hasToken: !!invitationToken,
        hasProposalId: !!proposalId
      });
      
      console.error("❌ === PROPOSAL FETCH FAILED ===", {
        error: err,
        errorMessage,
        hasToken: !!invitationToken,
        hasProposalId: !!proposalId
      });
    } finally {
      setLoading(false);
    }
  }, [handleError, proposalLogger, fetchProposalByToken]);

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
