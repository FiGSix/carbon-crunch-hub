
import { useState, useCallback, useEffect } from "react";
import { Proposal } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "@/types/proposals";
import { useAuth } from "@/contexts/auth"; // Updated import path
import { useToast } from "@/hooks/use-toast";
import { useFetchProposals } from "./proposals/useFetchProposals";
import { useProposalFilters } from "./proposals/useProposalFilters";
import { UseProposalsResult } from "./proposals/types";
import { useLocation } from "react-router-dom";

export const useProposals = (): UseProposalsResult => {
  const { toast } = useToast();
  const { userRole, user, refreshUser } = useAuth(); // Using modern context
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const location = useLocation();
  
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

  // Wrap the fetchProposals function to maintain the same API
  const fetchProposals = useCallback(async () => {
    console.log("Fetching proposals manually triggered");
    await fetchProposalsService();
  }, [fetchProposalsService]);

  // Initial fetch when component mounts or dependencies change
  useEffect(() => {
    console.log("Initial fetch triggered");
    fetchProposals();
  }, [fetchProposals]);
  
  // Refresh proposals when returning to the proposals page or dashboard
  useEffect(() => {
    // Check if we're on either the proposals page or dashboard
    if (location.pathname === '/proposals' || location.pathname === '/dashboard') {
      console.log(`Detected navigation to ${location.pathname}, refreshing proposal data`);
      fetchProposals();
    }
  }, [location.pathname, fetchProposals]);

  return {
    proposals,
    loading,
    error,
    filters,
    handleFilterChange,
    fetchProposals
  };
};
