
import { useState, useCallback } from "react";
import { ProposalFilters } from "./types";

export function useProposalFilters() {
  const [filters, setFilters] = useState<ProposalFilters>({
    search: '',
    status: 'all',
    sort: 'newest'
  });

  const handleFilterChange = useCallback((filter: string, value: string) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  }, []);

  return { filters, handleFilterChange };
}
