import { supabase } from "@/integrations/supabase/client";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { findOrCreateClient } from "./clientProfileService";
import { logger } from "@/lib/logger";
import { buildProposalData } from "./utils/proposalBuilder";

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

// Updated ProposalData interface to match database schema
export interface ProposalData {
  id?: string;
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
  content?: any;
  created_at?: string;
}

interface ClientResult {
  clientId: string;
  isRegisteredUser: boolean;
}

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
      projectSize: projectInfo.size
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

    // Transform database response to match our ProposalData interface with safe type conversions
    const transformedProposal: ProposalData = {
      id: insertedProposal.id,
      title: insertedProposal.title,
      agent_id: insertedProposal.agent_id,
      eligibility_criteria: insertedProposal.eligibility_criteria as unknown as EligibilityCriteria,
      project_info: insertedProposal.project_info as unknown as ProjectInformation,
      client_info: clientInfo,
      annual_energy: insertedProposal.annual_energy || 0,
      carbon_credits: insertedProposal.carbon_credits || 0,
      client_share: insertedProposal.client_share_percentage || 0,
      agent_commission: insertedProposal.agent_commission_percentage || 0,
      client_id: insertedProposal.client_id,
      client_reference_id: insertedProposal.client_reference_id,
      status: insertedProposal.status,
      system_size_kwp: insertedProposal.system_size_kwp,
      unit_standard: insertedProposal.unit_standard,
      client_share_percentage: insertedProposal.client_share_percentage,
      agent_commission_percentage: insertedProposal.agent_commission_percentage,
      content: insertedProposal.content,
      created_at: insertedProposal.created_at
    };

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

async function handleExistingClient(selectedClientId: string): Promise<ProposalOperationResult<ClientResult>> {
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

async function handleNewClient(clientInfo: ClientInformation, agentId: string): Promise<ProposalOperationResult<ClientResult>> {
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
    data: {
      clientId: clientResult.clientId,
      isRegisteredUser: clientResult.isRegisteredUser
    }
  };
}
