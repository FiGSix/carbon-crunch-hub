
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
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = async (filters: ProposalFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching proposals with filters:", filters);
      console.log("Current user role:", userRole, "User ID:", user?.id);
      
      if (!user?.id) {
        console.warn("User ID is missing when fetching proposals");
        setError("Authentication issue detected. Please try refreshing your session.");
        setLoading(false);
        return [];
      }
      
      // Fetch raw proposal data from API
      const proposalsData = await fetchProposalsData(filters, user.id, userRole);
      
      console.log("Raw proposals data fetch completed, count:", proposalsData?.length || 0);
      
      if (!proposalsData || proposalsData.length === 0) {
        console.log("No proposals found with the current filters");
        setProposals([]);
        setLoading(false);
        return [];
      }
      
      // Transform raw data into Proposal objects
      try {
        const transformedProposals = await transformProposalDataWithProfiles(proposalsData);
        console.log("Data transformation completed, count:", transformedProposals.length);
        
        // Apply client-side sorting if needed
        const sortedProposals = applyClientSideSorting(transformedProposals, filters.sort);
        
        console.log("Formatted proposals count:", sortedProposals.length);
        setProposals(sortedProposals);
        return sortedProposals;
      } catch (transformError) {
        console.error("Error transforming proposal data:", transformError);
        setError("Error processing proposal data. Please try again.");
        setProposals([]);
        return [];
      }
    } catch (error) {
      console.error("Error fetching proposals:", error);
      toast({
        title: "Error",
        description: "Failed to load proposals. Please try again.",
        variant: "destructive",
      });
      setError("Failed to load proposals. Please try again.");
      setProposals([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    proposals,
    error,
    fetchProposals,
  };
}
