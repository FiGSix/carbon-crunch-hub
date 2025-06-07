
import { supabase } from "@/integrations/supabase/client";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";
import { buildProposalData } from "../utils/proposalBuilder";
import { handleExistingClient, handleNewClient } from "./clientHandler";
import { validateAndFixClient } from "./validationService";
import { transformProposalData } from "./dataTransformer";
import { updateClientPortfolio } from "./portfolioService";
import { ProposalOperationResult, ProposalData } from "./types";

export async function createProposal(
  title: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  selectedClientId?: string
): Promise<ProposalOperationResult<ProposalData>> {
  const proposalLogger = logger.withContext({
    component: 'ProposalCreationService',
    method: 'createProposal'
  });

  try {
    proposalLogger.info("Creating proposal", { 
      title, 
      agentId, 
      selectedClientId,
      projectSize: projectInfo.size,
      clientEmail: clientInfo.email
    });

    // Handle client creation/lookup with enhanced data structure
    const clientResult = selectedClientId 
      ? await handleExistingClient(selectedClientId)
      : await handleNewClient(clientInfo, agentId);

    if (!clientResult.success) {
      return {
        success: false,
        error: clientResult.error
      };
    }

    // Build proposal data with proper client ID handling
    const proposalData = await buildProposalData(
      title,
      agentId,
      eligibilityCriteria,
      projectInfo,
      clientInfo,
      selectedClientId,
      clientResult.data
    );

    proposalLogger.info("Attempting to insert proposal with data", {
      clientId: proposalData.client_id,
      clientReferenceId: proposalData.client_reference_id,
      hasProfileId: !!clientResult.data?.profileId,
      hasClientsTableId: !!clientResult.data?.clientsTableId
    });

    // Insert the proposal
    const { data: insertedProposal, error: insertError } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select()
      .single();

    if (insertError) {
      proposalLogger.error("Failed to insert proposal", { 
        error: insertError,
        proposalData: {
          client_id: proposalData.client_id,
          client_reference_id: proposalData.client_reference_id,
          agent_id: proposalData.agent_id
        }
      });
      throw insertError;
    }

    proposalLogger.info("Proposal created successfully", { 
      proposalId: insertedProposal.id,
      clientSharePercentage: insertedProposal.client_share_percentage,
      finalClientId: insertedProposal.client_id,
      finalClientReferenceId: insertedProposal.client_reference_id
    });

    // Validate and fix client issues
    await validateAndFixClient(
      insertedProposal.id,
      clientInfo.email,
      clientResult.data?.clientsTableId
    );

    // Transform database response to match our ProposalData interface
    const transformedProposal = transformProposalData(insertedProposal, clientInfo);

    // Update portfolio if needed
    await updateClientPortfolio(clientResult.data?.clientsTableId);

    return {
      success: true,
      data: transformedProposal
    };

  } catch (error) {
    proposalLogger.error("Proposal creation failed", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create proposal"
    };
  }
}
