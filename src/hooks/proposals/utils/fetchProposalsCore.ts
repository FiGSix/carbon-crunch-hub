
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { fetchAndTransformProposalData } from "./dataTransformer";
import { buildBaseProposalsQuery } from "./queryBuilders";
import { ProposalFilters } from "../types";

/**
 * Core function to fetch proposals from Supabase
 */
export async function fetchProposalsCore({
  user,
  userRole,
  filters,
  handleAuthError,
  setProposals,
  setError,
  setLoading
}: {
  user: any;
  userRole: string | null;
  filters: ProposalFilters;
  handleAuthError: (error: any) => Promise<boolean>;
  setProposals: (proposals: any[]) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}) {
  // Create a contextualized logger
  const fetchLogger = logger.withContext({ 
    component: 'FetchProposalsCore', 
    feature: 'proposals' 
  });

  if (!user) {
    fetchLogger.warn("No user found, cannot fetch proposals");
    setError("Please log in to view proposals");
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    setError(null);
    
    fetchLogger.info("Starting proposal fetch", { 
      userId: user.id, 
      userRole, 
      filters 
    });

    // Build and execute the query
    const query = buildBaseProposalsQuery(supabase, userRole, user.id, filters);
    const { data: proposalsData, error } = await query;

    if (error) {
      fetchLogger.error("Supabase query error", { error });
      
      // Check if it's an auth error and handle accordingly
      const isAuthHandled = await handleAuthError(error);
      if (!isAuthHandled) {
        setError(`Failed to fetch proposals: ${error.message}`);
      }
      return;
    }

    if (!proposalsData) {
      fetchLogger.warn("No proposals data returned");
      setProposals([]);
      return;
    }

    fetchLogger.info("Raw proposals fetched", { count: proposalsData.length });

    // Transform the data
    const transformedProposals = await fetchAndTransformProposalData(proposalsData);
    
    fetchLogger.info("Proposals transformation completed", { 
      originalCount: proposalsData.length,
      transformedCount: transformedProposals.length 
    });

    setProposals(transformedProposals);
  } catch (error) {
    fetchLogger.error("Unexpected error in fetchProposalsCore", { error });
    setError(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setLoading(false);
  }
}
