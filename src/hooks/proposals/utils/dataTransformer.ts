
import { supabase } from "@/lib/supabase/client";
import { transformToProposalListItems, applyClientSideSorting } from "@/utils/proposalTransformers";
import { logger } from "@/lib/logger";
import { RawProposalData } from "../types";

type ProfileRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

/**
 * Fetches and transforms raw proposal data into ProposalListItem format
 */
export async function fetchAndTransformProposalData(proposalsData: RawProposalData[]) {
  // Create a contextualized logger
  const dataLogger = logger.withContext({ 
    component: 'DataTransformer', 
    feature: 'proposals' 
  });

  dataLogger.info("Starting data transformation", { count: proposalsData.length });

  // Extract unique client and agent IDs
  const clientIds = new Set<string>();
  const agentIds = new Set<string>();

  proposalsData.forEach(proposal => {
    if (proposal.client_id) clientIds.add(proposal.client_id);
    if (proposal.client_reference_id) clientIds.add(proposal.client_reference_id);
    if (proposal.agent_id) agentIds.add(proposal.agent_id);
  });

  dataLogger.info("Extracted IDs", { 
    clientIds: Array.from(clientIds), 
    agentIds: Array.from(agentIds) 
  });

  // Fetch client profiles
  let clientProfilesArray: ProfileRecord[] = [];
  if (clientIds.size > 0) {
    const { data: clientData, error: clientError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', Array.from(clientIds));

    if (clientError) {
      dataLogger.error("Error fetching client profiles", { error: clientError });
    } else if (clientData) {
      clientProfilesArray = clientData;
      dataLogger.info("Fetched client profiles", { count: clientData.length });
    }
  }

  // Fetch agent profiles
  let agentProfilesArray: ProfileRecord[] = [];
  if (agentIds.size > 0) {
    const { data: agentData, error: agentError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', Array.from(agentIds));

    if (agentError) {
      dataLogger.error("Error fetching agent profiles", { error: agentError });
    } else if (agentData) {
      agentProfilesArray = agentData;
      dataLogger.info("Fetched agent profiles", { count: agentData.length });
    }
  }

  // Transform proposals using the utility function - NOW AWAITING THE ASYNC FUNCTION
  const transformedProposals = await transformToProposalListItems(
    proposalsData,
    clientProfilesArray,
    agentProfilesArray
  );

  dataLogger.info("Data transformation completed", { 
    originalCount: proposalsData.length,
    transformedCount: transformedProposals.length 
  });

  return transformedProposals;
}
