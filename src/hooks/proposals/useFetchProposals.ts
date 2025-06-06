
import { useCallback } from "react";
import { ProposalListItem } from "@/types/proposals";
import { fetchAndTransformProposalData } from "./utils/dataTransformer";
import { fetchProposalsCore } from "./utils/fetchProposalsCore";
import { handleFetchError } from "./utils/toastErrors";
import { getCachedProposals, setCachedProposals, isCacheValid } from "./utils/proposalCache";
import { UseFetchProposalsParams } from "./types";
import { logger } from "@/lib/logger";

export function useFetchProposals({
  user,
  userRole,
  filters,
  toast,
  refreshUser,
  setProposals,
  setLoading,
  setError
}: UseFetchProposalsParams) {
  
  // Create a contextualized logger
  const fetchLogger = logger.withContext({ 
    component: 'FetchProposals', 
    feature: 'proposals' 
  });

  const fetchProposals = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.id) {
      fetchLogger.warn("No user ID available for fetching proposals");
      setLoading(false);
      setError("Authentication required");
      return;
    }

    if (!userRole) {
      fetchLogger.warn("No user role available for fetching proposals");
      setLoading(false);
      setError("User role not determined");
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && isCacheValid(filters)) {
      const cachedProposals = getCachedProposals();
      if (cachedProposals && cachedProposals.length > 0) {
        fetchLogger.info("Using cached proposals", { count: cachedProposals.length });
        setProposals(cachedProposals);
        setLoading(false);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);
    
    try {
      fetchLogger.info("Starting proposals fetch", { 
        userId: user.id, 
        userRole, 
        forceRefresh,
        filters 
      });

      // Fetch raw proposals data using the core function
      const rawProposalsData = await fetchProposalsCore(user.id, userRole, filters);
      
      fetchLogger.info("Raw proposals fetched", { count: rawProposalsData.length });

      // Transform the data including profiles with user role for revenue calculation
      const transformedProposals = await fetchAndTransformProposalData(rawProposalsData, userRole);
      
      fetchLogger.info("Proposals transformed successfully", { 
        count: transformedProposals.length 
      });

      // Update state
      setProposals(transformedProposals);
      
      // Cache the results
      setCachedProposals(transformedProposals);
      
      setError(null);
    } catch (error) {
      fetchLogger.error("Error fetching proposals", { error });
      
      // Handle the error using the toast error handler
      handleFetchError(error, toast);
      
      // Set error message for component state
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch proposals";
      setError(errorMessage);
      
      // Set empty proposals on error
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userRole, filters, toast, refreshUser, setProposals, setLoading, setError, fetchLogger]);

  return {
    fetchProposals
  };
}
