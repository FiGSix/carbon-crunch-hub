
import { supabase } from "@/integrations/supabase/client";
import { ProposalData } from "./types";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { logError } from "@/lib/errors/errorLogger";
import { findOrCreateClient } from "./clientProfileService";
import { toast } from "sonner";

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
  agentCommission: number
): Promise<ProposalCreationResult> {
  try {
    // Step 1: Find or create client profile
    const clientResult = await findOrCreateClient(clientInfo);
    
    if (!clientResult) {
      logError(
        "ProposalCreation", 
        "Failed to create or find client profile", 
        JSON.stringify(clientInfo), 
        "CLIENT_PROFILE_ERROR"
      );
      return { 
        success: false, 
        error: "Failed to create or find client profile" 
      };
    }

    // Step 2: Prepare proposal data with properly converted JSON
    const proposalData = {
      title,
      agent_id: agentId,
      client_id: clientResult.clientId, // Use client_id for registered users
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

    // If the client is not a registered user, set the client_contact_id
    if (!clientResult.isRegisteredUser) {
      proposalData.client_contact_id = clientResult.clientId;
    }

    // Step 3: Insert proposal into database
    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select('id')
      .single();
    
    if (error) {
      logError(
        "ProposalCreation", 
        "Failed to insert proposal", 
        error.message, 
        error.code
      );
      toast.error("Failed to create proposal. Please try again.");
      return { 
        success: false, 
        error: error.message 
      };
    }

    return { 
      success: true,
      proposalId: proposal.id
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(
      "ProposalCreation", 
      "Unexpected error creating proposal", 
      errorMessage, 
      "UNEXPECTED_ERROR"
    );
    toast.error("An unexpected error occurred. Please try again.");
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}
