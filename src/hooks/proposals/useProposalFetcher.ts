
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Proposal } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "./types";
import { applyClientSideSorting } from "./proposalUtils";
import { useToast } from "@/hooks/use-toast";
import { fetchProposalsData } from "./api/fetchProposals";
import { useProposalTransformer } from "./useProposalTransformer";

/**
 * Hook for fetching and filtering proposal data
 */
export function useProposalFetcher() {
  const { toast } = useToast();
  const { userRole, user } = useAuth();
  const { transformProposalDataWithProfiles } = useProposalTransformer();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const fetchProposals = async (filters: ProposalFilters) => {
    try {
      setLoading(true);
      console.log("Fetching proposals with filters:", filters);
      
      // Fetch raw proposal data from API
      const proposalsData = await fetchProposalsData(filters, user?.id, userRole);
      
      if (!proposalsData || proposalsData.length === 0) {
        console.log("No proposals found with the current filters");
        setProposals([]);
        setLoading(false);
        return [];
      }
      
      console.log("Raw proposals data:", proposalsData);
      
      // Transform raw data into Proposal objects
      const transformedProposals = await transformProposalDataWithProfiles(proposalsData);
      
      // Apply client-side sorting if needed
      const sortedProposals = applyClientSideSorting(transformedProposals, filters.sort);
      
      console.log("Formatted proposals:", sortedProposals);
      setProposals(sortedProposals);
      setLoading(false);
      return sortedProposals;
    } catch (error) {
      console.error("Error fetching proposals:", error);
      toast({
        title: "Error",
        description: "Failed to load proposals. Please try again.",
        variant: "destructive",
      });
      setProposals([]);
      setLoading(false);
      return [];
    }
  };

  return {
    loading,
    proposals,
    fetchProposals,
  };
}
