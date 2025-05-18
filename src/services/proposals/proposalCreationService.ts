
import { supabase } from "@/integrations/supabase/client";
import { 
  EligibilityCriteria, 
  ClientInformation, 
  ProjectInformation 
} from "@/types/proposals";
import { 
  calculateAnnualEnergy, 
  calculateCarbonCredits, 
  calculateRevenue,
  getClientSharePercentage,
  getAgentCommissionPercentage
} from "@/lib/calculations/carbon";
import { Json } from "@/types/supabase";
import { logger } from "@/lib/logger";
import { findOrCreateClient, directClientLookup } from "./clientProfileService";
import { ProposalData } from "./types";

/**
 * Create a new proposal in the database with improved client handling for both
 * registered users and client contacts
 */
export async function createProposal(
  eligibility: EligibilityCriteria,
  clientInfo: ClientInformation,
  projectInfo: ProjectInformation
): Promise<{ success: boolean; error?: string; proposalId?: string }> {
  const contextLogger = logger.withContext({
    function: 'createProposal',
    clientEmail: clientInfo.email,
    projectName: projectInfo.name
  });
  
  try {
    // Validate inputs before proceeding
    if (!clientInfo.email) {
      return { success: false, error: "Client email is required." };
    }
    
    if (!projectInfo.name) {
      return { success: false, error: "Project name is required." };
    }

    // Normalize client email to prevent case mismatch issues
    const normalizedClientInfo = {
      ...clientInfo,
      email: clientInfo.email.trim().toLowerCase()
    };
    
    // Get the current user (agent) before attempting client operations
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      contextLogger.error("Authentication failed - no user found");
      return { success: false, error: "You must be logged in to create a proposal. Please sign in again." };
    }
    
    contextLogger.info("Starting proposal creation process", {
      agentId: user.id,
      clientName: normalizedClientInfo.name
    });
    
    // Find or create the client profile with improved error handling
    let clientResult = null;
    
    try {
      // Try to find or create the client through the primary method (edge function)
      clientResult = await findOrCreateClient(normalizedClientInfo);
    } catch (error) {
      contextLogger.warn("Primary client lookup failed, attempting fallback", { 
        error: error instanceof Error ? error.message : String(error)
      });
      
      // If the edge function approach fails, try direct lookup as fallback
      clientResult = await directClientLookup(normalizedClientInfo.email);
      
      // If both methods fail, return a helpful error
      if (!clientResult) {
        contextLogger.error("All client lookup methods failed");
        return { 
          success: false, 
          error: "Unable to find or create client profile. Please check the client information and try again." 
        };
      }
      
      contextLogger.info("Fallback client lookup succeeded", { clientResult });
    }
    
    if (!clientResult || !clientResult.clientId) {
      contextLogger.error("Client lookup failed with no specific error");
      return { 
        success: false, 
        error: "Failed to find or create client profile. Please check your connection and try again." 
      };
    }
    
    // Calculate values for the proposal
    const annualEnergy = calculateAnnualEnergy(projectInfo.size);
    const carbonCredits = calculateCarbonCredits(projectInfo.size);
    const revenue = calculateRevenue(projectInfo.size);
    const clientSharePercentage = getClientSharePercentage(projectInfo.size);
    const agentCommissionPercentage = getAgentCommissionPercentage(projectInfo.size);
    
    // Initialize proposal data object based on client type
    const proposalData: ProposalData = {
      title: projectInfo.name,
      agent_id: user.id,
      eligibility_criteria: eligibility,
      project_info: projectInfo,
      annual_energy: annualEnergy,
      carbon_credits: carbonCredits,
      client_share_percentage: clientSharePercentage,
      agent_commission_percentage: agentCommissionPercentage,
      content: {
        clientInfo: normalizedClientInfo,
        projectInfo,
        revenue
      }
    };
    
    // Set the appropriate client reference based on whether they're a registered user or not
    if (clientResult.isRegisteredUser) {
      proposalData.client_id = clientResult.clientId;
    } else {
      proposalData.client_contact_id = clientResult.clientId;
    }
    
    contextLogger.info("Creating proposal with client data", { 
      isRegisteredUser: clientResult.isRegisteredUser,
      clientId: clientResult.clientId
    });
    
    // Convert complex objects to JSON format compatible with Supabase
    const supabaseProposalData = {
      ...proposalData,
      // Convert complex objects to JSON compatible format
      eligibility_criteria: proposalData.eligibility_criteria as unknown as Json,
      project_info: proposalData.project_info as unknown as Json,
      content: proposalData.content as unknown as Json
    };
    
    // Insert the proposal
    const { data, error } = await supabase
      .from('proposals')
      .insert(supabaseProposalData)
      .select('id')
      .single();
    
    if (error) {
      contextLogger.error("Error creating proposal", { error });
      
      // Provide more specific error messages for common errors
      if (error.message.includes('foreign key constraint')) {
        return { 
          success: false, 
          error: "Database constraint error: Client reference is invalid. This could be due to an issue with the client profile. Please try with a different client or contact support." 
        };
      }
      
      if (error.message.includes('infinite recursion')) {
        return { 
          success: false, 
          error: "Permission error: Database policy recursion detected. This is likely due to a permission configuration issue. Please contact support." 
        };
      }
      
      if (error.message.includes('violates row-level security policy')) {
        return { 
          success: false, 
          error: "You don't have permission to create proposals. Please verify your account role." 
        };
      }
      
      if (error.message.includes('check constraint')) {
        return {
          success: false,
          error: "Invalid client reference: A proposal must have either a registered user client or a client contact. Please check the client information."
        };
      }
      
      return { success: false, error: error.message };
    }
    
    contextLogger.info("Proposal created successfully", { proposalId: data.id });
    return { success: true, proposalId: data.id };
  } catch (error) {
    contextLogger.error("Unexpected error creating proposal", { error });
    return { 
      success: false, 
      error: error instanceof Error 
        ? `Error: ${error.message}` 
        : "An unexpected error occurred. Please try again or contact support." 
    };
  }
}
