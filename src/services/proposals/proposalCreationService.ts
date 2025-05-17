
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
import { findOrCreateClient } from "./clientProfileService";
import { ProposalData } from "./types";

/**
 * Create a new proposal in the database with improved error handling for RLS
 */
export async function createProposal(
  eligibility: EligibilityCriteria,
  clientInfo: ClientInformation,
  projectInfo: ProjectInformation
): Promise<{ success: boolean; error?: string; proposalId?: string }> {
  try {
    // Find or create the client through the secure edge function
    const clientId = await findOrCreateClient(clientInfo);
    
    if (!clientId) {
      return { 
        success: false, 
        error: "Failed to find or create client profile. Please check your connection and try again." 
      };
    }
    
    // Get the current user (agent)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: "You must be logged in to create a proposal. Please sign in again." };
    }
    
    // Calculate values for the proposal
    const annualEnergy = calculateAnnualEnergy(projectInfo.size);
    const carbonCredits = calculateCarbonCredits(projectInfo.size);
    const revenue = calculateRevenue(projectInfo.size);
    const clientSharePercentage = getClientSharePercentage(projectInfo.size);
    const agentCommissionPercentage = getAgentCommissionPercentage(projectInfo.size);
    
    // Create the proposal data with agent_id assigned at creation
    const proposalData: ProposalData = {
      title: projectInfo.name,
      client_id: clientId,
      agent_id: user.id, // Always assign the current user as the agent
      eligibility_criteria: eligibility,
      project_info: projectInfo,
      annual_energy: annualEnergy,
      carbon_credits: carbonCredits,
      client_share_percentage: clientSharePercentage,
      agent_commission_percentage: agentCommissionPercentage,
      content: {
        clientInfo,
        projectInfo,
        revenue
      }
    };
    
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
      logger.error("Error creating proposal:", { error });
      
      // Provide more specific error messages for common errors
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
      
      return { success: false, error: error.message };
    }
    
    return { success: true, proposalId: data.id };
  } catch (error) {
    logger.error("Unexpected error creating proposal:", { error });
    return { 
      success: false, 
      error: error instanceof Error 
        ? `Error: ${error.message}` 
        : "An unexpected error occurred. Please try again or contact support." 
    };
  }
}
