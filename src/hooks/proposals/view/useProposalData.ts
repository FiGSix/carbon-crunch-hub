
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
    // Add comprehensive logging
    console.log("🔍 fetchProposal called with:", { proposalId, invitationToken: invitationToken ? `${invitationToken.substring(0, 8)}...` : null });
    
    // Validate inputs
    if (!proposalId && !invitationToken) {
      const errorMsg = "No proposal ID or invitation token provided. Please check the URL and try again.";
      console.error("❌ Input validation failed:", errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setProposal(null); // Clear any existing proposal data
      logProposalFetchStart(proposalId, invitationToken);
      
      if (invitationToken) {
        console.log("🎫 Fetching by token...");
        // Use direct token-based fetching
        const { proposal: fetchedProposal, clientEmail: fetchedClientEmail } = await fetchProposalByToken(invitationToken);
        console.log("✅ Token fetch successful:", { proposalId: fetchedProposal?.id, clientEmail: fetchedClientEmail });
        setProposal(fetchedProposal);
        setClientEmail(fetchedClientEmail);
      } else if (proposalId) {
        console.log("🆔 Fetching by ID...");
        // Regular fetch by ID (for authenticated users)
        const fetchedProposal = await fetchProposalById(proposalId);
        console.log("✅ ID fetch successful:", { proposalId: fetchedProposal?.id });
        setProposal(fetchedProposal);
      } else {
        throw new Error("No proposal ID or invitation token provided. Please check the URL and try again.");
      }
    } catch (err) {
      console.error("💥 Error in fetchProposal:", err);
      const errorMessage = logProposalFetchError(err, proposalId, invitationToken);
      setError(errorMessage);
      setProposal(null); // Clear any existing proposal data
    } finally {
      setLoading(false);
    }
  }, [setProposal, setClientEmail, setLoading, setError]);

  useEffect(() => {
    console.log("🔄 useProposalData effect triggered:", { id, token: token ? `${token.substring(0, 8)}...` : null });
    if (id || token) {
      fetchProposal(id, token);
    } else {
      console.log("⚠️ No ID or token provided, skipping fetch");
      setLoading(false);
    }
  }, [id, token, fetchProposal]);

  return {
    proposal,
    loading: loading || tokenLoading,
    error,
    clientEmail,
    fetchProposal
  };
}
