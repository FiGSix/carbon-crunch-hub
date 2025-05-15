
import { useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Proposal } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "@/types/proposals";
import { useAuthRefresh } from "./useAuthRefresh";
import { logger } from "@/lib/logger";
import { buildProposalQuery } from "./utils/queryBuilders";
import { handleQueryError } from "./utils/queryErrorHandler";
import { fetchAndTransformProposalData } from "./utils/dataTransformer";

type UseFetchProposalsProps = {
  user: any;
  userRole: string | null;
  filters: ProposalFilters;
  toast: any;
  refreshUser: () => Promise<void>;
  setProposals: (proposals: Proposal[]) => void;
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
  
  // Create a contextualized logger
  const proposalLogger = logger.withContext({ 
    component: 'FetchProposals', 
    feature: 'proposals' 
  });

  const fetchProposals = useCallback(async () => {
    if (!user?.id) {
      proposalLogger.info("No user ID found, attempting to refresh user session");
      try {
        const isAuthenticated = await handleAuthError();
        if (!isAuthenticated) {
          setError("Authentication issue detected. Please try logging in again.");
          setLoading(false);
          return;
        }
      } catch (refreshError) {
        proposalLogger.error("Failed to refresh user", { error: refreshError });
        setError("Authentication issue detected. Please try logging out and back in.");
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      proposalLogger.info("Fetching proposals", { filters, userRole, userId: user?.id });
      
      // Build the query using our utility function
      const query = buildProposalQuery(supabase, filters);
      
      // Execute the query
      const { data: proposalsData, error: queryError } = await query;
      
      if (queryError) {
        await handleQueryError(queryError, handleAuthError);
      }
      
      proposalLogger.info("Supabase returned proposals", { count: proposalsData?.length || 0 });
      
      if (!proposalsData || proposalsData.length === 0) {
        proposalLogger.info("No proposals found with the current filters");
        setProposals([]);
        setLoading(false);
        return;
      }
      
      // Transform data using our utility function
      const transformedProposals = await fetchAndTransformProposalData(proposalsData);
      
      proposalLogger.info("Setting proposals in state", { count: transformedProposals.length });
      setProposals(transformedProposals);
    } catch (error) {
      proposalLogger.error("Error fetching proposals", { error });
      setError(error instanceof Error ? error.message : "Failed to load proposals");
      
      // Show auth-specific errors with recovery options
      if (error instanceof Error && 
          (error.message.includes("JWT") || 
           error.message.includes("token") || 
           error.message.includes("auth") || 
           error.message.includes("permission"))) {
        toast({
          title: "Authentication Error",
          description: "Your session may have expired. Try refreshing the page or logging out and back in.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load proposals. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [
    filters, 
    user, 
    userRole, 
    toast, 
    handleAuthError, 
    setError, 
    setLoading, 
    setProposals, 
    proposalLogger
  ]);

  return { fetchProposals };
}
