
import { useCallback } from "react";
import { ProposalFilters } from "@/types/proposals";
import { useAuthRefresh } from "./useAuthRefresh";
import { logger } from "@/lib/logger";
import { fetchProposalsCore } from "./utils/fetchProposalsCore";
import { handleFetchError } from "./utils/toastErrors";
import { useDebounce } from "./utils/useDebounce";

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
  const { debounce, isFetchingRef } = useDebounce(300);
  
  // Create a contextualized logger
  const proposalLogger = logger.withContext({ 
    component: 'FetchProposals', 
    feature: 'proposals' 
  });

  const fetchProposals = useCallback(async (forceRefresh = false) => {
    proposalLogger.info("Fetch proposals called", { forceRefresh });
    
    debounce(async () => {
      try {
        await fetchProposalsCore({
          user,
          userRole,
          filters,
          handleAuthError,
          setProposals,
          setError,
          setLoading
        });
      } catch (error) {
        handleFetchError(error, toast);
      } finally {
        setLoading(false);
      }
    }, forceRefresh);
  }, [
    filters, 
    user, 
    userRole, 
    toast, 
    handleAuthError, 
    setError, 
    setLoading, 
    setProposals,
    proposalLogger,
    debounce
  ]);

  return { fetchProposals };
}
