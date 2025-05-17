
import { useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { ProposalFilters } from "@/types/proposals";
import { useAuthRefresh } from "./useAuthRefresh";
import { logger } from "@/lib/logger";
import { buildProposalQuery } from "./utils/queryBuilders";
import { handleQueryError } from "./utils/queryErrorHandler";
import { fetchAndTransformProposalData } from "./utils/dataTransformer";
import { RawProposalData } from "./types";

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
      
      proposalLogger.info("Fetching proposals", { 
        filters,
        userRole,
        userId: user?.id 
      });
      
      // Build the query using our utility function, now with user role and ID
      const query = buildProposalQuery(supabase, filters, userRole, user?.id);
      
      // Execute the query
      const { data: proposalsData, error: queryError } = await query;
      
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
