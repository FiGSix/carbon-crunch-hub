
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
    if (import.meta.env.DEV) {
      console.log("🔍 fetchProposal called with:", { proposalId, invitationToken: invitationToken ? `${invitationToken.substring(0, 8)}...` : null });
    }
    
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
      setProposal(null); // Clear any existing proposal data
      logProposalFetchStart(proposalId, invitationToken);
      
      if (invitationToken) {
        if (import.meta.env.DEV) {
          console.log("🎫 Fetching by token...");
        }
        // Use direct token-based fetching
        const { proposal: fetchedProposal, clientEmail: fetchedClientEmail } = await fetchProposalByToken(invitationToken);
        if (import.meta.env.DEV) {
          console.log("✅ Token fetch successful:", { proposalId: fetchedProposal?.id, clientEmail: fetchedClientEmail });
        }
        setProposal(fetchedProposal);
        setClientEmail(fetchedClientEmail);
      } else if (proposalId) {
        if (import.meta.env.DEV) {
          console.log("🆔 Fetching by ID...");
        }
        // Regular fetch by ID (for authenticated users)
        const fetchedProposal = await fetchProposalById(proposalId);
        if (import.meta.env.DEV) {
          console.log("✅ ID fetch successful:", { proposalId: fetchedProposal?.id });
        }
        setProposal(fetchedProposal);
      } else {
        throw new Error("No proposal ID or invitation token provided. Please check the URL and try again.");
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("💥 Error in fetchProposal:", err);
      }
      const errorMessage = logProposalFetchError(err, proposalId, invitationToken);
      setError(errorMessage);
      setProposal(null); // Clear any existing proposal data
    } finally {
      setLoading(false);
    }
  }, [setProposal, setClientEmail, setLoading, setError]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("🔄 useProposalData effect triggered:", { id, token: token ? `${token.substring(0, 8)}...` : null });
    }
    if (id || token) {
      fetchProposal(id, token);
    } else {
      if (import.meta.env.DEV) {
        console.log("⚠️ No ID or token provided, skipping fetch");
      }
      setLoading(false);
    }
  }, [id, token]); // ✅ Removed fetchProposal from dependencies to prevent infinite loop

  return {
    proposal,
    loading: loading || tokenLoading,
    error,
    clientEmail,
    fetchProposal
  };
}
