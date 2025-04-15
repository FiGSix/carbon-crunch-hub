
import { useState, useCallback, useEffect } from "react";
import { ProposalFilters, UseProposalsResult } from "./proposals/types";
import { useProposalFetcher } from "./proposals/useProposalFetcher";

export const useProposals = (): UseProposalsResult => {
  const [filters, setFilters] = useState<ProposalFilters>({
    search: '',
    status: 'all',
    sort: 'newest'
  });
  
  const { loading, proposals, error, fetchProposals: fetchProposalsData } = useProposalFetcher();
  
  const handleFilterChange = (filter: string, value: string) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  };
  
  const fetchProposals = useCallback(async () => {
    console.log("useProposals - Fetching proposals with filters:", filters);
    await fetchProposalsData(filters);
  }, [fetchProposalsData, filters]);

  // Initial fetch on component mount
  useEffect(() => {
    console.log("useProposals - Initial fetch triggered");
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
