import { supabase } from "@/integrations/supabase/client";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { findOrCreateClient } from "./clientProfileService";
import { logger } from "@/lib/logger";
import { isValidUUID } from "@/utils/validationUtils";
import { buildProposalData } from "./utils/proposalBuilder";
import { validateClientId } from "./utils/dataTransformers";

// Define the return type for consistent interface
export interface ProposalCreationResult {
  success: boolean;
  proposalId?: string;
  error?: string;
}

export interface ProposalOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProposalData {
  title: string;
  agent_id: string;
  eligibility_criteria: EligibilityCriteria;
  project_info: ProjectInformation;
  client_info: ClientInformation;
  annual_energy: number;
  carbon_credits: number;
  client_share: number;
  agent_commission: number;
  selected_client_id?: string;
  client_id?: string;
  client_reference_id?: string;
  status?: string;
  system_size_kwp?: number;
  unit_standard?: string;
  client_share_percentage?: number;
  agent_commission_percentage?: number;
}

export async function createProposal(
  title: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  annualEnergy: number,
  carbonCredits: number,
  clientShare: number,
  agentCommission: number,
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
      projectSize: projectInfo.size
    });

    // Handle client creation/lookup
    const clientResult = selectedClientId 
      ? await handleExistingClient(selectedClientId)
      : await handleNewClient(clientInfo, agentId);

    if (!clientResult.success) {
      return clientResult;
    }

    // Build proposal data with portfolio-aware calculations
    const proposalData = await buildProposalData(
      title,
      agentId,
      eligibilityCriteria,
      projectInfo,
      clientInfo,
      annualEnergy,
      carbonCredits,
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

    // If this is for an existing client, update their entire portfolio
    if (selectedClientId) {
      try {
        const { updatePortfolioPercentages } = await import('./portfolioUpdateService');
        await updatePortfolioPercentages(selectedClientId);
        proposalLogger.info("Portfolio percentages updated after proposal creation");
      } catch (portfolioError) {
        proposalLogger.warn("Failed to update portfolio percentages", { 
          error: portfolioError instanceof Error ? portfolioError.message : String(portfolioError)
        });
        // Don't fail the proposal creation for this
      }
    }

    return {
      success: true,
      data: insertedProposal as ProposalData
    };

  } catch (error) {
    proposalLogger.error("Proposal creation failed", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create proposal"
    };
  }
}

async function handleExistingClient(selectedClientId: string): Promise<ProposalOperationResult<ClientInformation>> {
  const proposalLogger = logger.withContext({
    component: 'ProposalCreationService',
    method: 'handleExistingClient'
  });

  proposalLogger.info("Using selected client ID directly", { selectedClientId });

  // Check if this is a registered user or client contact
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', selectedClientId)
    .eq('role', 'client')
    .maybeSingle();
  
  const isRegisteredUser = !!existingProfile;

  return {
    success: true,
    data: {
      clientId: selectedClientId,
      isRegisteredUser
    }
  };
}

async function handleNewClient(clientInfo: ClientInformation, agentId: string): Promise<ProposalOperationResult<ClientInformation>> {
  const proposalLogger = logger.withContext({
    component: 'ProposalCreationService',
    method: 'handleNewClient'
  });

  proposalLogger.info("Finding or creating client profile", { 
    clientEmail: clientInfo.email,
    existingClient: clientInfo.existingClient
  });

  const clientResult = await findOrCreateClient(clientInfo);

  if (!clientResult) {
    proposalLogger.error("Failed to create or find client profile", { clientInfo });
    return {
      success: false,
      error: "Failed to create or find client profile"
    };
  }

  proposalLogger.info("Client profile found/created", { 
    clientId: clientResult.clientId,
    isRegisteredUser: clientResult.isRegisteredUser
  });

  return {
    success: true,
    data: clientResult
  };
}
