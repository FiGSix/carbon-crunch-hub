
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ProposalData } from "@/types/proposals";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useInvitationToken } from "@/hooks/useInvitationToken";
import { useProposalDataState } from "./utils/proposalDataState";
import { fetchProposalByToken, fetchProposalById } from "./utils/proposalFetchers";
import { 
  logProposalFetchStart, 
  logProposalFetchError 
} from "./utils/proposalDataLogger";
import { supabase } from "@/lib/supabase/client";

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

  // Memoize setters to prevent fetchProposal recreation
  const stableSetters = useMemo(() => ({
    setProposal,
    setClientEmail,
    setLoading,
    setError
  }), [setProposal, setClientEmail, setLoading, setError]);

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);

  const fetchProposal = useCallback(async (proposalId?: string, invitationToken?: string | null, isRetry = false) => {
    // Validate inputs
    if (!proposalId && !invitationToken) {
      const errorMsg = "No proposal ID or invitation token provided. Please check the URL and try again.";
      stableSetters.setError(errorMsg);
      stableSetters.setLoading(false);
      return;
    }

    try {
      stableSetters.setLoading(true);
      stableSetters.setError(null);
      stableSetters.setProposal(null);
      logProposalFetchStart(proposalId, invitationToken);
      
      if (invitationToken) {
        const { proposal: fetchedProposal, clientEmail: fetchedClientEmail } = await fetchProposalByToken(invitationToken);
        stableSetters.setProposal(fetchedProposal);
        stableSetters.setClientEmail(fetchedClientEmail);
        retryCountRef.current = 0; // Reset on success
      } else if (proposalId) {
        const fetchedProposal = await fetchProposalById(proposalId);
        stableSetters.setProposal(fetchedProposal);
        retryCountRef.current = 0; // Reset on success
      } else {
        throw new Error("No proposal ID or invitation token provided. Please check the URL and try again.");
      }
    } catch (err: any) {
      const errorMessage = logProposalFetchError(err, proposalId, invitationToken);
      
      // Check if this is a permission error and we should retry
      const isPermissionError = err?.code === 'PERMISSION_DENIED' || 
                                err?.message?.includes('permission') ||
                                err?.message?.includes("don't have permission");
      
      const { data: { session } } = await supabase.auth.getSession();
      const shouldRetry = isPermissionError && !session && !isRetry && retryCountRef.current < 6;
      
      if (shouldRetry) {
        retryCountRef.current++;
        console.log(`Auth not ready, retrying in 300ms (attempt ${retryCountRef.current}/6)`);
        retryTimeoutRef.current = setTimeout(() => {
          fetchProposal(proposalId, invitationToken, true);
        }, 300);
      } else {
        // Set special error code for UI to detect
        if (isPermissionError && !session) {
          stableSetters.setError("REQUIRES_AUTH");
        } else {
          stableSetters.setError(errorMessage);
        }
        stableSetters.setProposal(null);
      }
    } finally {
      if (!retryTimeoutRef.current) {
        stableSetters.setLoading(false);
      }
    }
  }, [stableSetters]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (id || token) {
      fetchProposal(id, token);
    } else {
      setLoading(false);
    }
  }, [id, token]);

  // Listen for auth state changes and refetch if we have an id/token
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && (id || token)) {
        console.log("Auth state changed, refetching proposal");
        fetchProposal(id, token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [id, token]);

  return {
    proposal,
    loading: loading || tokenLoading,
    error,
    clientEmail,
    fetchProposal
  };
}
