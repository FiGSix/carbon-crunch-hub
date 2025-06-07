
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

    // Handle client creation/lookup
    const clientResult = selectedClientId 
      ? await handleExistingClient(selectedClientId)
      : await handleNewClient(clientInfo, agentId);

    if (!clientResult.success) {
      return {
        success: false,
        error: clientResult.error
      };
    }

    // Build proposal data with portfolio-aware calculations
    const proposalData = await buildProposalData(
      title,
      agentId,
      eligibilityCriteria,
      projectInfo,
      clientInfo,
      selectedClientId,
      clientResult.data
    );

    // Insert the proposal
    const { data: insertedProposal, error: insertError } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select()
      .single();

    if (insertError) {
      proposalLogger.error("Failed to insert proposal", { error: insertError });
      throw insertError;
    }

    proposalLogger.info("Proposal created successfully", { 
      proposalId: insertedProposal.id,
      clientSharePercentage: insertedProposal.client_share_percentage
    });

    // Validate and fix client issues
    await validateAndFixClient(
      insertedProposal.id,
      clientInfo.email,
      clientResult.data?.clientId
    );

    // Transform database response to match our ProposalData interface
    const transformedProposal = transformProposalData(insertedProposal, clientInfo);

    // Update portfolio if needed
    await updateClientPortfolio(selectedClientId);

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
