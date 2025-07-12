import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { useProposalFilters } from "./useProposalFilters";
import { fetchProposalsCoreOptimized } from "./utils/optimizedFetchProposalsCore";
import { EnhancedRealtimeService } from "@/services/realtime/enhancedRealtimeService";
import { logger } from "@/lib/logger";
import { UseProposalsResult } from "./types";
import { OptimizedProposalData } from "./utils/optimizedQueryBuilders";

/**
 * Phase 5 Optimization: Optimized proposals hook using database functions and improved real-time
 */
export function useOptimizedProposals(): UseProposalsResult {
  const { user, userRole, refreshUser } = useAuth();
  const { toast } = useToast();
  const { filters, handleFilterChange } = useProposalFilters();
  
  const [proposals, setProposals] = useState<OptimizedProposalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const proposalsLogger = useMemo(() => logger.withContext({
    component: 'UseOptimizedProposals',
    feature: 'proposals-optimization'
  }), []);

  const fetchProposals = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.id || !userRole) {
      proposalsLogger.warn("Missing user or role", { userId: user?.id, userRole });
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      proposalsLogger.info("Fetching optimized proposals", { 
        userId: user.id, 
        userRole, 
        filters,
        forceRefresh 
      });

      const data = await fetchProposalsCoreOptimized(user.id, userRole, filters);
      
      setProposals(data);
      proposalsLogger.info("Optimized proposals fetched successfully", { 
        count: data.length 
      });

    } catch (error) {
      proposalsLogger.error("Failed to fetch optimized proposals", { error });
      
      if (error instanceof Error) {
        if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
          setError("Please sign in again to access your proposals.");
          refreshUser();
        } else {
          setError(error.message);
        }
      } else {
        setError("An unexpected error occurred while loading proposals.");
      }
      
      toast({
        title: "Error loading proposals",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, userRole, filters, toast, refreshUser, proposalsLogger]);

  // Set up optimized real-time subscription
  useEffect(() => {
    if (!user?.id || !userRole) return;

    const unsubscribe = EnhancedRealtimeService.subscribeToProposalChanges(
      user.id,
      userRole,
      (payload) => {
        proposalsLogger.info("Enhanced real-time update received", { payload });
        fetchProposals(true);
      },
      { useWebSocket: true, batchUpdates: true }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id, userRole, fetchProposals, proposalsLogger]);

  // Initial fetch
  useEffect(() => {
    if (user?.id && userRole) {
      fetchProposals();
    }
  }, [user?.id, userRole, filters]);

  // Transform for backward compatibility with ProposalListItem interface
  const transformedProposals = useMemo(() => {
    return proposals.map(proposal => ({
      id: proposal.id,
      title: proposal.title,
      name: proposal.title, // Required by ProposalListItem
      status: proposal.status as any,
      created_at: proposal.created_at,
      date: proposal.created_at, // Required by ProposalListItem
      agent_id: proposal.agent_id,
      client_id: proposal.client_id,
      client_reference_id: proposal.client_reference_id,
      client: 'Unknown Client', // Required by ProposalListItem
      carbon_credits: proposal.carbon_credits,
      system_size_kwp: proposal.system_size_kwp,
      size: proposal.system_size_kwp || 0, // Required by ProposalListItem
      revenue: (proposal.carbon_credits || 0) * 100, // Required by ProposalListItem - estimated
      invitation_sent_at: proposal.invitation_sent_at,
      invitation_viewed_at: proposal.invitation_viewed_at,
      // Add required fields for compatibility
      content: {
        clientInfo: {},
        projectInfo: {}
      } as any,
      annual_energy: null,
      client_share_percentage: null,
      agent_commission_percentage: null,
      unit_standard: 'kWp',
      signed_at: null,
      archived_at: null,
      review_later_until: null
    }));
  }, [proposals]);

  return {
    proposals: transformedProposals,
    loading,
    error,
    handleFilterChange,
    fetchProposals
  };
}