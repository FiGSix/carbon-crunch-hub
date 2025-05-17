
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { ProposalFilters } from "@/types/proposals";
import { buildProposalQuery } from "./queryBuilders";
import { handleQueryError } from "./queryErrorHandler";
import { fetchAndTransformProposalData } from "./dataTransformer";
import { RawProposalData } from "../types";
import { 
  isCacheValid, 
  getCachedProposals, 
  updateProposalsCache 
} from "./proposalCache";

type FetchProposalsCoreProps = {
  user: any;
  userRole: string | null;
  filters: ProposalFilters;
  handleAuthError: () => Promise<boolean>;
  setProposals: (proposals: any[]) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
};

export async function fetchProposalsCore({
  user,
  userRole,
  filters,
  handleAuthError,
  setProposals,
  setError,
  setLoading
}: FetchProposalsCoreProps) {
  // Create a contextualized logger
  const proposalLogger = logger.withContext({ 
    component: 'FetchProposalsCore', 
    feature: 'proposals' 
  });
  
  // Check if we have valid cached data
  if (isCacheValid(filters)) {
    proposalLogger.info("Using cached proposal data");
    const cachedProposals = getCachedProposals();
    if (cachedProposals) {
      setProposals(cachedProposals);
      return;
    }
  }

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
    // Don't set loading to true if we already have data - prevents flashing
    const shouldShowLoading = !getCachedProposals();
    if (shouldShowLoading) {
      setLoading(true);
    }
    
    setError(null);
    
    proposalLogger.info("Fetching proposals", { 
      filters,
      userRole,
      userId: user?.id 
    });
    
    // Build the query using our utility function, now with user role and ID
    const query = buildProposalQuery(supabase, filters, userRole, user?.id);
    
    // For admin users, limit the initial fetch to improve performance
    const finalQuery = userRole === 'admin' 
      ? query.order('created_at', { ascending: false }).limit(50)
      : query;
    
    // Execute the query
    const { data: proposalsData, error: queryError } = await finalQuery;
    
    if (queryError) {
      proposalLogger.error("Error executing query", { error: queryError });
      await handleQueryError(queryError, handleAuthError);
      setError(`Failed to fetch proposals: ${queryError.message}`);
      setLoading(false);
      return;
    }
    
    proposalLogger.info("Supabase returned proposals", { 
      count: proposalsData?.length || 0,
      userRole,
      userId: user?.id 
    });
    
    if (!proposalsData || proposalsData.length === 0) {
      proposalLogger.info("No proposals found with the current filters");
      setProposals([]);
      updateProposalsCache([], filters);
      setLoading(false);
      return;
    }
    
    // Transform the raw data with proper typing
    const typedProposalsData = proposalsData.map(item => {
      const transformedItem: RawProposalData = {
        id: item.id,
        title: item.title,
        content: item.content,
        status: item.status,
        created_at: item.created_at,
        client_id: item.client_id,
        agent_id: item.agent_id,
        annual_energy: item.annual_energy,
        carbon_credits: item.carbon_credits,
        client_share_percentage: item.client_share_percentage,
        invitation_sent_at: item.invitation_sent_at,
        invitation_viewed_at: item.invitation_viewed_at,
        invitation_expires_at: item.invitation_expires_at,
        review_later_until: item.review_later_until,
        is_preview: item.is_preview,
        preview_of_id: item.preview_of_id
      };
      return transformedItem;
    });
    
    // Transform data using our utility function
    const transformedProposals = await fetchAndTransformProposalData(typedProposalsData);
    
    proposalLogger.info("Setting proposals in state", { 
      count: transformedProposals.length,
      userRole
    });
    
    // Update cache and state
    updateProposalsCache(transformedProposals, filters);
    setProposals(transformedProposals);
    
    return transformedProposals;
  } catch (error) {
    proposalLogger.error("Error fetching proposals", { 
      error,
      userRole,
      userId: user?.id 
    });
    setError(error instanceof Error ? error.message : "Failed to load proposals");
    return null;
  } finally {
    setLoading(false);
  }
}
