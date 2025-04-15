
import { useState, useCallback, useEffect } from "react";
import { ProposalFilters, UseProposalsResult } from "./types";
import { useProposalFetcher } from "./useProposalFetcher";

export const useProposals = (): UseProposalsResult => {
  const [filters, setFilters] = useState<ProposalFilters>({
    search: '',
    status: 'all',
    sort: 'newest'
  });
  
  const { loading, proposals, fetchProposals: fetchProposalsData } = useProposalFetcher();
  
  const handleFilterChange = (filter: string, value: string) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  };
  
  const fetchProposals = useCallback(async () => {
    await fetchProposalsData(filters);
  }, [fetchProposalsData, filters]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    loading,
    filters,
    handleFilterChange,
    fetchProposals
  };
};
