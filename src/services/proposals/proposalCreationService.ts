import { supabase } from "@/integrations/supabase/client";
import { ProposalData } from "./types";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { logError } from "@/lib/errors/errorLogger";
import { findOrCreateClient } from "./clientProfileService";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { isValidUUID } from "@/utils/validationUtils";

// Define the return type for consistent interface
export interface ProposalCreationResult {
  success: boolean;
  proposalId?: string;
  error?: string;
}

// Helper function to convert complex TypeScript objects to Supabase-compatible JSON
function convertToSupabaseJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertToSupabaseJson(item));
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Handle objects (but not primitive wrappers)
  if (typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype) {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertToSupabaseJson(obj[key]);
      }
    }
    return result;
  }
  
  // Return primitive values and functions as is
  return obj;
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

    // Step 2: Prepare proposal data with properly converted JSON
    // Define the structure explicitly without optional fields initially
    const proposalData: {
      title: string;
      agent_id: string;
      eligibility_criteria: any;
      project_info: any;
      annual_energy: number;
      carbon_credits: number;
      client_share_percentage: number;
      agent_commission_percentage: number;
      content: any;
      status: string;
      client_id?: string | null; // Optional now that we changed the DB schema
      client_contact_id?: string | null; // Optional
    } = {
      title,
      agent_id: agentId,
      eligibility_criteria: convertToSupabaseJson(eligibilityCriteria),
      project_info: convertToSupabaseJson(projectInfo),
      annual_energy: annualEnergy,
      carbon_credits: carbonCredits,
      client_share_percentage: clientShare,
      agent_commission_percentage: agentCommission,
      content: convertToSupabaseJson({
        clientInfo,
        projectInfo,
        revenue: {
          // Sample revenue calculation values
          yearOne: carbonCredits * 50,
          yearTwo: carbonCredits * 52,
          yearThree: carbonCredits * 54,
          yearFour: carbonCredits * 56,
          yearFive: carbonCredits * 58,
        }
      }),
      status: 'draft' // Default status for new proposals
    };

    // Set the appropriate client reference based on client type
    if (clientResult.isRegisteredUser) {
      // For registered users, set client_id to the user profile ID
      if (isValidUUID(clientResult.clientId)) {
        proposalData.client_id = clientResult.clientId;
        proposalData.client_contact_id = null; // Ensure client_contact_id is null
      } else {
        proposalLogger.error("Invalid client ID for registered user", { clientId: clientResult.clientId });
        return {
          success: false,
          error: "Invalid client ID format for registered user"
        };
      }
    } else {
      // For non-registered clients, set client_contact_id to the client contact ID
      if (isValidUUID(clientResult.clientId)) {
        proposalData.client_contact_id = clientResult.clientId;
        proposalData.client_id = null; // Explicitly set client_id to null
      } else {
        proposalLogger.error("Invalid client contact ID", { clientContactId: clientResult.clientId });
        return {
          success: false,
          error: "Invalid client contact ID format"
        };
      }
    }

    proposalLogger.info("Prepared proposal data", {
      title: proposalData.title,
      clientId: proposalData.client_id,
      clientContactId: proposalData.client_contact_id,
      isRegisteredUser: clientResult.isRegisteredUser
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
