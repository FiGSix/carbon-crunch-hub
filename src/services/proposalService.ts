
import { supabase } from "@/integrations/supabase/client";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { Json } from "@/types/supabase";

export interface CreateProposalResult {
  success: boolean;
  proposalId?: string;
  error?: string;
}

export const createProposal = async (
  eligibility: EligibilityCriteria,
  clientInfo: ClientInformation,
  projectInfo: ProjectInformation,
  agentId: string,
  selectedClientId?: string
): Promise<CreateProposalResult> => {
  try {
    console.log("🚀 Creating proposal...");
    
    // Calculate carbon credits and revenue
    const annualEnergy = parseFloat(projectInfo.size) * 1500; // kWh per year (simplified calculation)
    const carbonCredits = annualEnergy * 0.0007; // tCO2 per kWh (simplified factor)
    
    // Prepare proposal data with proper Json typing using type assertions
    const proposalData = {
      title: projectInfo.name,
      status: 'pending',
      content: {
        eligibility,
        clientInfo,
        projectInfo
      } as unknown as Json,
      eligibility_criteria: eligibility as unknown as Json,
      project_info: projectInfo as unknown as Json,
      agent_id: agentId,
      client_id: selectedClientId || null,
      client_reference_id: selectedClientId || null,
      annual_energy: annualEnergy,
      carbon_credits: carbonCredits,
      client_share_percentage: 70,
      agent_commission_percentage: 15
    };

    console.log("📋 Proposal data prepared:", {
      title: proposalData.title,
      agentId,
      clientId: selectedClientId,
      annualEnergy,
      carbonCredits
    });

    // Insert the proposal (single object, not array)
    const { data: proposal, error: insertError } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error inserting proposal:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log("✅ Proposal created successfully:", proposal.id);

    return { 
      success: true, 
      proposalId: proposal.id 
    };

  } catch (error) {
    console.error("❌ Unexpected error in createProposal:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    };
  }
};
