
import { useState, useEffect, useCallback } from "react";
import { ProposalData } from "@/types/proposals";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useInvitationToken } from "@/hooks/useInvitationToken";
import { useProposalDataState } from "./utils/proposalDataState";
import { fetchProposalByToken, fetchProposalById } from "./utils/proposalFetchers";
import { 
  logProposalFetchStart, 
  logProposalFetchError 
} from "./utils/proposalDataLogger";

/**
 * Hook to fetch and manage proposal data using direct token validation
 */
export function useProposalData(id?: string, token?: string | null) {
  const {
    proposal,
    setProposal,
    loading,
    setLoading,
    error,
    setError,
    clientEmail,
    setClientEmail
  } = useProposalDataState();
  
  const { loading: tokenLoading } = useInvitationToken();
  
  const { handleError } = useErrorHandler({
    context: "proposal-data",
    toastOnError: false,
    navigateOnFatal: false
  });

  const fetchProposal = useCallback(async (proposalId?: string, invitationToken?: string | null) => {
    // Validate inputs
    if (!proposalId && !invitationToken) {
      const errorMsg = "No proposal ID or invitation token provided. Please check the URL and try again.";
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setProposal(null);
      logProposalFetchStart(proposalId, invitationToken);
      
      if (invitationToken) {
        const { proposal: fetchedProposal, clientEmail: fetchedClientEmail } = await fetchProposalByToken(invitationToken);
        setProposal(fetchedProposal);
        setClientEmail(fetchedClientEmail);
      } else if (proposalId) {
        const fetchedProposal = await fetchProposalById(proposalId);
        setProposal(fetchedProposal);
      } else {
        throw new Error("No proposal ID or invitation token provided. Please check the URL and try again.");
      }
    } catch (err) {
      const errorMessage = logProposalFetchError(err, proposalId, invitationToken);
      setError(errorMessage);
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [setProposal, setClientEmail, setLoading, setError]);

  useEffect(() => {
    if (id || token) {
      fetchProposal(id, token);
    } else {
      setLoading(false);
    }
  }, [id, token]);

  return {
    proposal,
    loading: loading || tokenLoading,
    error,
    clientEmail,
    fetchProposal
  };
}
