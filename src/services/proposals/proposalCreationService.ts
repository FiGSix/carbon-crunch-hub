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
): Promise<ProposalCreationResult> {
  // Create a contextualized logger
  const proposalLogger = logger.withContext({
    component: 'ProposalCreationService', 
    method: 'createProposal',
    agentId
  });
  
  try {
    // Validate agentId is a valid UUID
    if (!isValidUUID(agentId)) {
      proposalLogger.error("Invalid agent ID format", { agentId });
      return { 
        success: false, 
        error: "Authentication error: Invalid agent ID format." 
      };
    }
    
    let clientResult;
    
    // If we have an explicit selected client ID, we can skip client creation
    if (selectedClientId && isValidUUID(selectedClientId)) {
      proposalLogger.info("Using selected client ID directly", { selectedClientId });
      
      // Check if this is a registered user or client contact
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', selectedClientId)
        .eq('role', 'client')
        .maybeSingle();
        
      const isRegisteredUser = !!existingProfile;
      
      clientResult = {
        clientId: selectedClientId,
        isRegisteredUser
      };
      
      proposalLogger.info("Found client by ID", { 
        clientId: selectedClientId, 
        isRegisteredUser 
      });
    } else {
      // Otherwise, find or create client profile
      proposalLogger.info("Finding or creating client profile", { 
        clientEmail: clientInfo.email,
        existingClient: clientInfo.existingClient
      });
      
      clientResult = await findOrCreateClient(clientInfo);
      
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
    }

    // Step 2: Build the proposal data
    const proposalData = buildProposalData(
      title,
      agentId,
      eligibilityCriteria,
      projectInfo,
      clientInfo,
      annualEnergy,
      carbonCredits,
      clientShare,
      agentCommission,
      selectedClientId,
      clientResult
    );

    // Client validation before insert
    const clientValidation = validateClientId(
      proposalData.client_id, 
      proposalData.client_reference_id,
      proposalLogger
    );

    if (!clientValidation.isValid) {
      proposalLogger.error("Client validation failed", { error: clientValidation.error });
      return {
        success: false,
        error: clientValidation.error
      };
    }

    proposalLogger.info("Prepared proposal data", {
      title: proposalData.title,
      clientId: proposalData.client_id,
      clientReferenceId: proposalData.client_reference_id
    });

    // Step 3: Insert proposal into database
    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select('id')
      .single();
    
    if (error) {
      proposalLogger.error("Failed to insert proposal", {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      return { 
        success: false, 
        error: error.message 
      };
    }

    proposalLogger.info("Proposal created successfully", { proposalId: proposal.id });
    return { 
      success: true,
      proposalId: proposal.id
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    proposalLogger.error("Unexpected error creating proposal", { error: errorMessage });
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}
