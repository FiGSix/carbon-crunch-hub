
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProposalData } from "@/types/proposals";
import { transformToProposalData } from "@/utils/proposalTransformers";
import { useErrorHandler } from "@/hooks/useErrorHandler";

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

  const fetchProposal = useCallback(async (proposalId?: string, invitationToken?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching proposal with:", { proposalId, invitationToken });
      
      if (invitationToken) {
        // Validate the token and get the proposal ID and client email
        const { data, error: validationError } = await supabase.rpc('validate_invitation_token', { token: invitationToken });
        
        if (validationError || !data || !data.length || !data[0].proposal_id) {
          throw new Error("This invitation link is invalid or has expired.");
        }
        
        const validatedProposalId = data[0].proposal_id;
        const invitedEmail = data[0].client_email;
        
        console.log("Token validated, proposal ID:", validatedProposalId, "Client email:", invitedEmail);
        setClientEmail(invitedEmail);
        
        // Now fetch the proposal with the validated ID
        const { data: proposalData, error: fetchError } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', validatedProposalId)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        // Transform to our standard ProposalData type
        const typedProposal = transformToProposalData(proposalData);
        setProposal(typedProposal);
      } else if (proposalId) {
        // Regular fetch by ID (for authenticated users)
        console.log("Fetching proposal by ID:", proposalId);
        const { data, error: fetchError } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        // Transform to our standard ProposalData type
        const typedProposal = transformToProposalData(data);
        console.log("Proposal fetched successfully:", typedProposal);
        setProposal(typedProposal);
      } else {
        throw new Error("No proposal ID or invitation token provided.");
      }
    } catch (err) {
      const errorState = handleError(err, "Failed to load the proposal");
      setError(errorState.message || "Failed to load the proposal. It may have been deleted or you don't have permission to view it.");
    } finally {
      setLoading(false);
    }
  }, [handleError]);

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

