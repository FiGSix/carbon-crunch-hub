
import { useState, useCallback, useEffect, useMemo } from "react";
import { ProposalListItem, ProposalFilters } from "@/types/proposals";
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
  
  // Create a contextualized logger
  const proposalsLogger = logger.withContext({ 
    component: 'ProposalsHook', 
    feature: 'proposals' 
  });
  
  // Use the extracted filter hook
  const { filters, handleFilterChange } = useProposalFilters();

  // Use the extracted fetch proposals hook
  const { fetchProposals: fetchProposalsService } = useFetchProposals({
    user,
    userRole,
    filters,
    toast,
    refreshUser,
    setProposals,
    setLoading,
    setError
  });

  // Track initial load
  const isInitialLoadRef = useMemo(() => ({ current: true }), []);

  // Wrap the fetchProposals function to maintain the same API
  const fetchProposals = useCallback(async () => {
    proposalsLogger.info("Fetching proposals manually triggered");
    // Force refresh when manually triggered
    await fetchProposalsService(true);
  }, [fetchProposalsService, proposalsLogger]);

  // Handle filter changes - debounced in useFetchProposals
  useEffect(() => {
    if (isInitialLoadRef.current) {
      // Skip on first render - we'll handle it in the next useEffect
      isInitialLoadRef.current = false;
      return;
    }
    
    proposalsLogger.info("Filters changed, fetching proposals");
    fetchProposalsService(false);
  }, [filters, fetchProposalsService, proposalsLogger]);

  // Initial fetch when component mounts or dependencies change
  useEffect(() => {
    if (isInitialLoadRef.current) {
      proposalsLogger.info("Initial fetch triggered");
      fetchProposalsService(false);
    }
  }, [fetchProposalsService, proposalsLogger]);
  
  // Clear cache and refresh proposals when a proposal status changes
  useEffect(() => {
    const handleProposalStatusChange = () => {
      proposalsLogger.info("Proposal status change detected, clearing cache");
      clearProposalsCache();
      fetchProposalsService(true);
    };
    
    window.addEventListener('proposal-status-changed', handleProposalStatusChange);
    
    return () => {
      window.removeEventListener('proposal-status-changed', handleProposalStatusChange);
    };
  }, [fetchProposalsService, proposalsLogger]);
  
  // Refresh proposals when returning to the proposals page or dashboard
  useEffect(() => {
    const lastPathRef = { current: "" };
    
    // Only refresh if we're navigating TO the dashboard/proposals page
    // from a different page - prevents double fetches
    if ((location.pathname === '/proposals' || location.pathname === '/dashboard') && 
        lastPathRef.current !== location.pathname) {
      proposalsLogger.info(`Detected navigation to ${location.pathname}, refreshing proposal data`);
      fetchProposalsService(false);
    }
    
    lastPathRef.current = location.pathname;
  }, [location.pathname, fetchProposalsService, proposalsLogger]);

  return {
    proposals,
    loading,
    error,
    filters,
    handleFilterChange,
    fetchProposals
  };
};
