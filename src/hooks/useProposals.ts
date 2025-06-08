
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { ProposalListItem } from "@/types/proposals";
import { useAuth } from "@/contexts/auth"; 
import { useToast } from "@/hooks/use-toast";
import { useFetchProposals } from "./proposals/useFetchProposals";
import { useProposalFilters } from "./proposals/useProposalFilters";
import { UseProposalsResult } from "./proposals/types";
import { useLocation } from "react-router-dom";
import { logger } from "@/lib/logger";
import { clearProposalsCache } from "./proposals/utils/proposalCache";

export const useProposals = (): UseProposalsResult => {
  const { toast } = useToast();
  const { userRole, user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalListItem[]>([]); 
  const location = useLocation();
  
  // Use refs to track state and prevent unnecessary effects
  const isInitializedRef = useRef(false);
  const lastLocationRef = useRef('');
  const lastFiltersRef = useRef<string>('');
  
  // Create a contextualized logger
  const proposalsLogger = logger.withContext({ 
    component: 'ProposalsHook', 
    feature: 'simplified-proposals' 
  });
  
  // Use the extracted filter hook
  const { filters, handleFilterChange } = useProposalFilters();

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [filters.search, filters.status, filters.sort]);

  // Use the simplified fetch proposals hook
  const { fetchProposals: fetchProposalsService } = useFetchProposals({
    user,
    userRole,
    filters: memoizedFilters,
    toast,
    refreshUser,
    setProposals,
    setLoading,
    setError
  });

  // Simplified fetch function
  const fetchProposals = useCallback(async () => {
    proposalsLogger.info("Manual fetch triggered");
    await fetchProposalsService(true);
  }, [fetchProposalsService, proposalsLogger]);

  // Handle filter changes with simplified logic
  useEffect(() => {
    const filtersKey = JSON.stringify(memoizedFilters);
    
    // Skip if filters haven't actually changed
    if (lastFiltersRef.current === filtersKey) {
      return;
    }
    
    lastFiltersRef.current = filtersKey;
    
    // Skip initial render to avoid double fetch
    if (!isInitializedRef.current) {
      return;
    }
    
    proposalsLogger.info("Filters changed, fetching proposals", { filters: memoizedFilters });
    fetchProposalsService(false);
  }, [memoizedFilters, fetchProposalsService, proposalsLogger]);

  // Initial fetch when component mounts
  useEffect(() => {
    if (!isInitializedRef.current && user && userRole) {
      proposalsLogger.info("Initial fetch triggered", { userId: user.id, userRole });
      isInitializedRef.current = true;
      fetchProposalsService(false);
    }
  }, [user, userRole, fetchProposalsService, proposalsLogger]);
  
  // Handle proposal status changes
  useEffect(() => {
    const handleProposalStatusChange = () => {
      proposalsLogger.info("Proposal status change detected, refreshing");
      clearProposalsCache();
      fetchProposalsService(true);
    };
    
    window.addEventListener('proposal-status-changed', handleProposalStatusChange);
    
    return () => {
      window.removeEventListener('proposal-status-changed', handleProposalStatusChange);
    };
  }, [fetchProposalsService, proposalsLogger]);
  
  // Handle navigation-based refreshes
  useEffect(() => {
    const currentPath = location.pathname;
    
    if ((currentPath === '/proposals' || currentPath === '/dashboard') && 
        lastLocationRef.current !== currentPath && 
        isInitializedRef.current) {
      
      proposalsLogger.info(`Navigation to ${currentPath} detected, refreshing proposals`);
      lastLocationRef.current = currentPath;
      fetchProposalsService(false);
    } else {
      lastLocationRef.current = currentPath;
    }
  }, [location.pathname, fetchProposalsService, proposalsLogger]);

  // Return simplified result
  const result = useMemo((): UseProposalsResult => ({
    proposals,
    loading,
    error,
    filters: memoizedFilters,
    handleFilterChange,
    fetchProposals
  }), [proposals, loading, error, memoizedFilters, handleFilterChange, fetchProposals]);

  return result;
};
