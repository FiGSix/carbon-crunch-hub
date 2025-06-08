
import { useState, useCallback, useEffect } from "react";
import { ProposalListItem } from "@/types/proposals";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { useFetchProposals } from "./proposals/useFetchProposals";
import { useProposalFilters } from "./proposals/useProposalFilters";
import { getCachedProposals, isCacheValid, updateProposalsCache, clearProposalsCache } from "./proposals/utils/proposalCache";
import { UseProposalsResult } from "./proposals/types";
import { logger } from "@/lib/logger";

export function useProposals(): UseProposalsResult {
  const { user, userRole, refreshUser } = useAuth();
  const { toast } = useToast();
  const { filters, handleFilterChange } = useProposalFilters();
  
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const proposalsLogger = logger.withContext({
    component: 'UseProposals',
    feature: 'proposals'
  });

  const { fetchProposals: fetchProposalsCore } = useFetchProposals({
    user,
    userRole,
    filters,
    toast,
    refreshUser,
    setProposals,
    setLoading,
    setError
  });

  const fetchProposals = useCallback(async (forceRefresh: boolean = false) => {
    // Check cache first unless force refresh is requested
    if (!forceRefresh && isCacheValid(filters)) {
      const cachedProposals = getCachedProposals();
      if (cachedProposals) {
        proposalsLogger.info("Using cached proposals", { count: cachedProposals.length });
        setProposals(cachedProposals);
        setLoading(false);
        return;
      }
    }

    // Fetch fresh data
    await fetchProposalsCore(forceRefresh);
  }, [filters, fetchProposalsCore, proposalsLogger]);

  // Update cache when proposals change
  useEffect(() => {
    if (proposals.length > 0) {
      updateProposalsCache(proposals, filters);
    }
  }, [proposals, filters]);

  // Listen for proposal status change events to refresh data
  useEffect(() => {
    const handleProposalStatusChange = () => {
      proposalsLogger.info("Proposal status change detected - refreshing");
      clearProposalsCache();
      fetchProposals(true);
    };

    window.addEventListener('proposal-status-changed', handleProposalStatusChange);
    
    return () => {
      window.removeEventListener('proposal-status-changed', handleProposalStatusChange);
    };
  }, [fetchProposals, proposalsLogger]);

  // Initial fetch
  useEffect(() => {
    if (user && userRole) {
      fetchProposals();
    }
  }, [user, userRole, fetchProposals]);

  return {
    proposals,
    loading,
    error,
    handleFilterChange,
    fetchProposals
  };
}
