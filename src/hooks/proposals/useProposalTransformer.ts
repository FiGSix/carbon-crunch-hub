
import { useState } from "react";
import { Proposal } from "@/components/proposals/ProposalList";
import { ProfileData, RawProposalData } from "./types";
import { transformProposalData } from "./proposalUtils";
import { fetchProfilesByIds } from "./api/fetchProfiles";

/**
 * Hook for transforming raw proposal data into the Proposal interface
 */
export function useProposalTransformer() {
  const transformProposalDataWithProfiles = async (
    proposalsData: RawProposalData[]
  ): Promise<Proposal[]> {
    if (!proposalsData || proposalsData.length === 0) {
      return [];
    }
    
    // Extract unique client and agent IDs
    const clientIds = proposalsData.map(p => p.client_id).filter(Boolean);
    const agentIds = proposalsData
      .map(p => p.agent_id)
      .filter((id): id is string => id !== null && id !== undefined);
    
    // Fetch profiles in parallel
    const [clientProfiles, agentProfiles] = await Promise.all([
      fetchProfilesByIds(clientIds),
      fetchProfilesByIds(agentIds)
    ]);
    
    // Transform the data
    return transformProposalData(proposalsData, clientProfiles, agentProfiles);
  };

  return {
    transformProposalDataWithProfiles
  };
}
