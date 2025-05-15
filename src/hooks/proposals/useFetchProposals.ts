
import { useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Proposal } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "@/types/proposals";
import { RawProposalData } from "./types";
import { useAuthRefresh } from "./useAuthRefresh";
import { transformProposalData } from "./proposalUtils";
import { fetchProfilesByIds } from "./api/fetchProfiles";
import { logger } from "@/lib/logger";

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

  const buildQuery = useCallback((filters: ProposalFilters) => {
    let query = supabase
      .from('proposals')
      .select(`
        id, 
        title, 
        created_at, 
        status, 
        content, 
        client_id,
        agent_id,
        annual_energy,
        carbon_credits,
        client_share_percentage,
        invitation_sent_at,
        invitation_viewed_at,
        invitation_expires_at,
        review_later_until
      `);
    
    // Apply filters
    if (filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    
    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    
    // Apply sorting
    switch (filters.sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'size-high':
      case 'size-low':
        query = query.order('annual_energy', { 
          ascending: filters.sort === 'size-low', 
          nullsFirst: filters.sort === 'size-low'
        });
        break;
      case 'revenue-high':
      case 'revenue-low':
        query = query.order('carbon_credits', { 
          ascending: filters.sort === 'revenue-low', 
          nullsFirst: filters.sort === 'revenue-low'
        });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }
    
    return query;
  }, []);

  const handleQueryError = useCallback(async (error: any) => {
    proposalLogger.error("Supabase query error", { error });
    
    // Handle permission errors by refreshing session
    if (error.code === 'PGRST116' || error.code === '42501') {
      proposalLogger.info("Permission error detected, trying to refresh session");
      const isAuthenticated = await handleAuthError();
      if (!isAuthenticated) {
        throw new Error("Permission error. Please try logging in again.");
      } else {
        throw new Error("Permission error. Please try again after refreshing.");
      }
    } else {
      throw error;
    }
  }, [handleAuthError, proposalLogger]);

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
      
      const query = buildQuery(filters);
      
      const { data: proposalsData, error: queryError } = await query;
      
      if (queryError) {
        await handleQueryError(queryError);
      }
      
      proposalLogger.info("Supabase returned proposals", { count: proposalsData?.length || 0 });
      
      if (!proposalsData || proposalsData.length === 0) {
        proposalLogger.info("No proposals found with the current filters");
        setProposals([]);
        setLoading(false);
        return;
      }
      
      // Extract IDs for related data
      const clientIds = proposalsData.map(p => p.client_id).filter(Boolean);
      const agentIds = proposalsData
        .map(p => p.agent_id)
        .filter((id): id is string => id !== null && id !== undefined);
      
      // Fetch related profiles
      const [clientProfiles, agentProfiles] = await Promise.all([
        fetchProfilesByIds(clientIds),
        fetchProfilesByIds(agentIds)
      ]);
      
      // Transform the data
      const transformedProposals = transformProposalData(
        proposalsData as RawProposalData[], 
        clientProfiles,
        agentProfiles
      );
      
      proposalLogger.info("Formatted proposals", { count: transformedProposals.length });
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
    buildQuery, 
    handleQueryError, 
    handleAuthError, 
    setError, 
    setLoading, 
    setProposals, 
    proposalLogger
  ]);

  return { fetchProposals };
}
