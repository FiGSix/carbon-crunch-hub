
import { useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProposalFilters } from "@/types/proposals";
import { useAuthRefresh } from "./useAuthRefresh";
import { logger } from "@/lib/logger";
import { buildProposalQuery } from "./utils/queryBuilders";
import { handleQueryError } from "./utils/queryErrorHandler";
import { fetchAndTransformProposalData } from "./utils/dataTransformer";
import { RawProposalData } from "./types";
import { 
  isCacheValid, 
  getCachedProposals, 
  updateProposalsCache 
} from "./utils/proposalCache";

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
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  
  // Create a contextualized logger
  const proposalLogger = logger.withContext({ 
    component: 'FetchProposals', 
    feature: 'proposals' 
  });

  const fetchProposals = useCallback(async (forceRefresh = false) => {
    // Check if a fetch operation is already in progress
    if (isFetchingRef.current) {
      proposalLogger.info("Fetch already in progress, skipping duplicate request");
      return;
    }
    
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Debounce the fetch operation (300ms)
    debounceTimerRef.current = window.setTimeout(async () => {
      // Check if we have valid cached data and not forcing refresh
      if (!forceRefresh && isCacheValid(filters)) {
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
        // Mark fetch as in-progress to prevent duplicate requests
        isFetchingRef.current = true;
        
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
      } catch (error) {
        proposalLogger.error("Error fetching proposals", { 
          error,
          userRole,
          userId: user?.id 
        });
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
        isFetchingRef.current = false;
      }
    }, 300); // 300ms debounce
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
