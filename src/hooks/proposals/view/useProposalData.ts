
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
        // First, persist the token in the session to ensure it's available for RLS policies
        proposalLogger.info("🎫 Using invitation token to fetch proposal", { 
          tokenPrefix: invitationToken.substring(0, 8)
        });
        
        console.log("🎫 === PROCESSING INVITATION TOKEN ===");
        console.log(`🎫 Token: ${invitationToken.substring(0, 8)}...`);
        
        const tokenResult = await persistToken(invitationToken);
        
        console.log("🎫 === TOKEN PROCESSING RESULT ===", tokenResult);
        
        if (!tokenResult.success) {
          const errorMsg = tokenResult.error || "Failed to process invitation token";
          proposalLogger.error("❌ Token processing failed", { 
            success: tokenResult.success,
            valid: tokenResult.valid,
            error: tokenResult.error
          });
          console.error("❌ === TOKEN PROCESSING FAILED ===", errorMsg);
          throw new Error(errorMsg);
        }
        
        if (!tokenResult.valid) {
          const errorMsg = tokenResult.error || "This invitation link is invalid or has expired";
          proposalLogger.error("❌ Token validation failed", { 
            success: tokenResult.success,
            valid: tokenResult.valid,
            error: tokenResult.error
          });
          console.error("❌ === TOKEN VALIDATION FAILED ===", errorMsg);
          throw new Error(errorMsg);
        }
        
        // Get the proposal by ID (the token is already set in the session context)
        if (tokenResult.proposalId) {
          proposalLogger.info("✅ Using proposal ID from token validation", { proposalId: tokenResult.proposalId });
          console.log("✅ === FETCHING PROPOSAL BY TOKEN ID ===", tokenResult.proposalId);
          
          const { data, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', tokenResult.proposalId)
            .single();
          
          if (fetchError) {
            proposalLogger.error("❌ Error fetching proposal with token", { 
              error: fetchError,
              proposalId: tokenResult.proposalId,
              errorCode: fetchError.code,
              errorMessage: fetchError.message
            });
            
            console.error("❌ === PROPOSAL FETCH ERROR ===", {
              error: fetchError,
              proposalId: tokenResult.proposalId,
              errorCode: fetchError.code
            });
            
            // Provide more specific error messages based on the error type
            if (fetchError.code === 'PGRST116') {
              throw new Error("This proposal could not be found. It may have been deleted or the invitation link is no longer valid.");
            } else if (fetchError.code === '42501' || fetchError.message?.includes('permission')) {
              throw new Error("You don't have permission to view this proposal. Please make sure you're using the correct invitation link.");
            } else {
              throw new Error(`Error loading proposal: ${fetchError.message || "Please try again or contact support if the issue persists."}`);
            }
          }
          
          // Transform to our standard ProposalData type
          const typedProposal = transformToProposalData(data);
          
          // Set client email from the content (if available)
          setClientEmail(
            typedProposal.content?.clientInfo?.email || 
            tokenResult.clientEmail || 
            null
          );
          
          proposalLogger.info("✅ Proposal fetched via token", { 
            proposalId: typedProposal.id,
            status: typedProposal.status,
            clientEmail: tokenResult.clientEmail
          });
          
          console.log("✅ === PROPOSAL SUCCESSFULLY LOADED ===", {
            id: typedProposal.id,
            status: typedProposal.status,
            title: typedProposal.title
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
          throw new Error("No proposal ID was returned from token validation. The invitation link may be corrupted.");
        }
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
          
          // Provide more specific error messages
          if (fetchError.code === 'PGRST116') {
            throw new Error("This proposal could not be found. It may have been deleted or you may not have the correct proposal ID.");
          } else if (fetchError.code === '42501' || fetchError.message?.includes('permission')) {
            throw new Error("You don't have permission to view this proposal. Please make sure you're signed in with the correct account.");
          } else {
            throw new Error(`Error loading proposal: ${fetchError.message || "Please try again or contact support if the issue persists."}`);
          }
        }
        
        // Transform to our standard ProposalData type
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
      // More specific error handling
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
