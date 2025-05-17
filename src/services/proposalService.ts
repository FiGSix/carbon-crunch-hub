
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
import { refreshSession } from "@/lib/supabase/auth";

export interface ProposalData {
  title: string;
  client_id: string;
  agent_id: string;
  eligibility_criteria: EligibilityCriteria;
  project_info: ProjectInformation;
  annual_energy: number;
  carbon_credits: number;
  client_share_percentage: number;
  agent_commission_percentage: number;
  content: {
    clientInfo: ClientInformation;
    projectInfo: ProjectInformation;
    revenue: Record<string, number>;
  };
}

/**
 * Create or find a client profile using the secure edge function
 * Added token refresh to handle expired tokens
 */
export async function findOrCreateClient(clientInfo: ClientInformation): Promise<string | null> {
  try {
    // First try to refresh the session to ensure we have a valid token
    await refreshSession();
    
    logger.info("Calling manage-client-profile edge function", { 
      clientEmail: clientInfo.email,
      isExistingClient: clientInfo.existingClient 
    });
    
    const { data, error } = await supabase.functions.invoke('manage-client-profile', {
      body: {
        name: clientInfo.name,
        email: clientInfo.email,
        phone: clientInfo.phone || null,
        companyName: clientInfo.companyName || null,
        existingClient: clientInfo.existingClient
      }
    });

    if (error) {
      logger.error("Error from manage-client-profile function:", { 
        error,
        statusCode: error.status,
        message: error.message
      });
      return null;
    }

    if (!data || !data.clientId) {
      logger.error("Invalid response from manage-client-profile function:", { data });
      return null;
    }

    logger.info("Successfully found/created client profile", { 
      clientId: data.clientId,
      isNewProfile: data.isNewProfile 
    });
    
    return data.clientId;
  } catch (error) {
    logger.error("Unexpected error in findOrCreateClient:", { 
      error,
      clientEmail: clientInfo.email
    });
    return null;
  }
}

/**
 * Create a new proposal in the database
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
      return { success: false, error: "Failed to find or create client profile. Please try again or contact support." };
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
      return { success: false, error: error.message };
    }
    
    return { success: true, proposalId: data.id };
  } catch (error) {
    logger.error("Unexpected error creating proposal:", { error });
    return { success: false, error: "An unexpected error occurred. Please try again or contact support." };
  }
}
