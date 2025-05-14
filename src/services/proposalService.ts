
import { supabase } from "@/lib/supabase";
import { 
  EligibilityCriteria, 
  ClientInformation, 
  ProjectInformation 
} from "@/components/proposals/types";
import { 
  calculateAnnualEnergy, 
  calculateCarbonCredits, 
  calculateRevenue,
  getClientSharePercentage,
  getAgentCommissionPercentage
} from "@/lib/calculations/carbon";

export interface ProposalData {
  title: string;
  client_id: string;
  agent_id: string; // Changed to not nullable
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
 * Create or find a client profile and return the user ID
 */
export async function findOrCreateClient(clientInfo: ClientInformation): Promise<string | null> {
  // If it's an existing client, we need to find their profile
  if (clientInfo.existingClient) {
    // Look up existing client by email
    const { data: existingProfile, error: searchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', clientInfo.email)
      .single();
    
    if (searchError) {
      console.error("Error finding client:", searchError);
      return null;
    }
    
    return existingProfile?.id || null;
  } else {
    // For a new client, we would normally create a user account using auth.signUp
    // But for simplicity and demo purposes, we'll create a placeholder entry in profiles
    // In a real app, you'd want to invite the user via email and create a proper account
    
    // First, check if a profile with this email already exists
    const { data: existingProfile, error: searchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', clientInfo.email)
      .single();
    
    if (!searchError && existingProfile) {
      return existingProfile.id;
    }
    
    // For demo purposes, we're generating a UUID client-side
    // In a real app, this would be a proper Supabase auth user ID
    const placeholderId = crypto.randomUUID();
    
    const { error: createError } = await supabase
      .from('profiles')
      .insert({
        id: placeholderId,
        first_name: clientInfo.name.split(' ')[0],
        last_name: clientInfo.name.split(' ').slice(1).join(' '),
        email: clientInfo.email,
        phone: clientInfo.phone,
        company_name: clientInfo.companyName,
        role: 'client'
      });
    
    if (createError) {
      console.error("Error creating client profile:", createError);
      return null;
    }
    
    return placeholderId;
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
    // Find or create the client
    const clientId = await findOrCreateClient(clientInfo);
    
    if (!clientId) {
      return { success: false, error: "Failed to find or create client" };
    }
    
    // Get the current user (agent)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: "You must be logged in to create a proposal" };
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
    
    // Insert the proposal
    const { data, error } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select('id')
      .single();
    
    if (error) {
      console.error("Error creating proposal:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true, proposalId: data.id };
  } catch (error) {
    console.error("Unexpected error creating proposal:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
