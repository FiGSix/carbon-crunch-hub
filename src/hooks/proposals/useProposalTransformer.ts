
import { RawProposalData } from "./types";
import { ProposalListItem } from "@/types/proposals";
import { transformToProposalListItems } from "@/utils/proposalTransformers";
import { fetchProfilesByIds } from "./api/fetchProfiles";

/**
 * Hook for transforming raw proposal data into the ProposalListItem interface
 */
export function useProposalTransformer() {
  const transformProposalDataWithProfiles = async (
    proposalsData: RawProposalData[]
  ) => {
    if (!proposalsData || proposalsData.length === 0) {
      return [] as ProposalListItem[];
    }
    
    // Extract unique client and agent IDs
    const clientIds = proposalsData.map(p => p.client_id).filter(Boolean);
    const agentIds = proposalsData
      .map(p => p.agent_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    // Fetch profiles in parallel
    const [clientProfilesRecord, agentProfilesRecord] = await Promise.all([
      fetchProfilesByIds(clientIds),
      fetchProfilesByIds(agentIds)
    ]);
    
    // Convert Records to arrays for the transformer function
    const clientProfiles = Object.values(clientProfilesRecord);
    const agentProfiles = Object.values(agentProfilesRecord);
    
    // Transform the data using our utility function
    return transformToProposalListItems(proposalsData as any, clientProfiles, agentProfiles);
  };

  return {
    transformProposalDataWithProfiles
  };
}
