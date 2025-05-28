
import { useCallback, useRef } from "react";
import { ProposalFilters } from "@/types/proposals";
import { useAuthRefresh } from "./useAuthRefresh";
import { logger } from "@/lib/logger";
import { fetchProposalsCore } from "./utils/fetchProposalsCore";
import { handleFetchError } from "./utils/toastErrors";

type UseFetchProposalsProps = {
  user: any;
  userRole: string | null;
  filters: ProposalFilters;
  toast: any;
  refreshUser: () => Promise<void>;
  setProposals: (proposals: any[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

export function useFetchProposals({
  user,
  userRole,
  filters,
  toast,
  refreshUser,
  setProposals,
  setLoading,
  setError
}: UseFetchProposalsProps) {
  const { handleAuthError } = useAuthRefresh({ refreshUser, user });
  
  // Use refs to track fetch state and prevent duplicate calls
  const isFetchingRef = useRef(false);
  const lastFetchParamsRef = useRef<string>('');
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create a contextualized logger
  const proposalLogger = logger.withContext({ 
    component: 'FetchProposals', 
    feature: 'proposals' 
  });

  // Memoized fetch function with deduplication and debouncing
  const fetchProposals = useCallback(async (forceRefresh = false) => {
    // Create a unique key for this fetch request
    const fetchKey = JSON.stringify({
      userId: user?.id,
      userRole,
      filters,
      timestamp: forceRefresh ? Date.now() : 'cached'
    });

    // Skip if same request is already in progress or recently completed
    if (!forceRefresh && (isFetchingRef.current || lastFetchParamsRef.current === fetchKey)) {
      proposalLogger.info("Skipping duplicate fetch request", { fetchKey });
      return;
    }

    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    // If not forced, debounce the request
    if (!forceRefresh) {
      fetchTimeoutRef.current = setTimeout(() => {
        performFetch(fetchKey);
      }, 300);
      return;
    }

    // Perform immediate fetch for forced requests
    await performFetch(fetchKey);
  }, [user, userRole, filters, toast, handleAuthError, setError, setLoading, setProposals, proposalLogger]);

  // Extracted fetch logic to avoid duplication
  const performFetch = useCallback(async (fetchKey: string) => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchParamsRef.current = fetchKey;

    try {
      proposalLogger.info("Starting proposals fetch", { fetchKey });
      
      await fetchProposalsCore({
        user,
        userRole,
        filters,
        handleAuthError,
        setProposals,
        setError,
        setLoading
      });
      
      proposalLogger.info("Proposals fetch completed successfully");
    } catch (error) {
      proposalLogger.error("Proposals fetch failed", { error });
      handleFetchError(error, toast);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [
    user, 
    userRole, 
    filters, 
    handleAuthError, 
    setProposals, 
    setError, 
    setLoading, 
    toast,
    proposalLogger
  ]);

  return { fetchProposals };
}
