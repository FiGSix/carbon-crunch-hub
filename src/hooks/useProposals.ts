
import { useState, useCallback, useEffect } from "react";
import { Proposal } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "./proposals/types";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { useFetchProposals } from "./proposals/useFetchProposals";
import { useProposalFilters } from "./proposals/useProposalFilters";
import { UseProposalsResult } from "./proposals/types";

export const useProposals = (): UseProposalsResult => {
  const { toast } = useToast();
  const { userRole, user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  
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
    await fetchProposalsService();
  }, [fetchProposalsService]);

  // Initial fetch when component mounts or dependencies change
  useEffect(() => {
    console.log("Initial fetch triggered");
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    loading,
    error,
    filters,
    handleFilterChange,
    fetchProposals
  };
};
